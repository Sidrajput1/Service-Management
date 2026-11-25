import "server-only";
import bcrypt from "bcryptjs";
import mongoose, { type Types } from "mongoose";
import { requireCurrentUser } from "@/lib/auth";
import User from "@/models/user";
import PasswordResetToken from "@/models/PasswordResetToken";
import { changePasswordInput, resetPasswordInput } from "@/lib/password-policy";
import {
  PasswordError,
  consumePasswordLimit,
  enforcePasswordLimit,
  hashResetToken,
  newResetToken,
  passwordAppOrigin,
  passwordClientKey,
  readPasswordBody,
  requirePasswordStorage,
  resetLifetimeMs,
} from "@/lib/password-security";
import {
  getEmailConfiguration,
  sendTransactionalEmail,
} from "@/lib/email/resend";
import {
  passwordChangedEmail,
  resetPasswordEmail,
} from "@/lib/email/password-templates";
import { getIO } from "@/lib/socket";

type PasswordAccount = {
  _id: Types.ObjectId;
  email?: string;
  password?: string;
  role: string;
  credentialVersion?: number;
  mustChangePassword?: boolean;
  temporaryPasswordExpiresAt?: Date;
};
const accountFields =
  "_id email password role credentialVersion mustChangePassword temporaryPasswordExpiresAt";
const active = { $ne: false };
const usableHash = (value: unknown): value is string =>
  typeof value === "string" && /^\$2[aby]\$\d{2}\$[./a-z\d]{53}$/i.test(value);
const versionMatch = (version = 0) =>
  version === 0
    ? {
        $or: [
          { credentialVersion: 0 },
          { credentialVersion: { $exists: false } },
        ],
      }
    : { credentialVersion: version };
function minimumForAccount(user: PasswordAccount, password: string) {
  if (user.mustChangePassword && password.length < 12)
    throw new PasswordError(
      "Choose a new password with at least 12 characters.",
    );
}
async function replacePassword(
  user: PasswordAccount,
  newHash: string,
  tokenHash?: string,
) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      if (tokenHash) {
        const consumed = await PasswordResetToken.updateOne(
          {
            userId: user._id,
            tokenHash,
            usedAt: null,
            expiresAt: { $gt: now },
            credentialVersion: user.credentialVersion || 0,
          },
          { $set: { usedAt: now } },
          { session },
        );
        if (consumed.modifiedCount !== 1)
          throw new PasswordError(
            "This reset link is invalid or expired. Request a new link.",
          );
      }
      const changed = await User.updateOne(
        {
          _id: user._id,
          password: user.password,
          email: user.email,
          role: user.role,
          isActive: active,
          ...versionMatch(user.credentialVersion),
          ...(!tokenHash &&
          user.mustChangePassword &&
          user.temporaryPasswordExpiresAt
            ? { temporaryPasswordExpiresAt: { $gt: now } }
            : {}),
        },
        {
          $set: { password: newHash, mustChangePassword: false },
          $unset: { temporaryPasswordExpiresAt: 1 },
          $inc: { credentialVersion: 1 },
        },
        { session },
      );
      if (changed.modifiedCount !== 1)
        throw new PasswordError(
          tokenHash
            ? "This reset link is invalid or expired. Request a new link."
            : "Your credential changed. Sign in again before retrying.",
          tokenHash ? 400 : 409,
        );
      await PasswordResetToken.updateMany(
        { userId: user._id, usedAt: null },
        { $set: { usedAt: now } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  try {
    getIO()?.in(`user:${user._id}`).disconnectSockets(true);
  } catch {
    /* Other instances recheck socket versions within 10s. */
  }
  return {
    email: user.email,
    credentialVersion: (user.credentialVersion || 0) + 1,
  };
}
export async function changeAccountPassword(
  request: Request,
  options: { providerOnly?: boolean; initialOnly?: boolean } = {},
) {
  const identity = await requireCurrentUser({
    allowPasswordChange: Boolean(options.initialOnly),
  });
  if (options.providerOnly && identity.role !== "service_provider")
    throw new PasswordError("Forbidden", 403);
  const value = changePasswordInput.parse(await readPasswordBody(request));
  await requirePasswordStorage();
  await enforcePasswordLimit(
    "change-client",
    passwordClientKey(request),
    100,
    15 * 60_000,
  );
  await enforcePasswordLimit(
    "change-account",
    String(identity._id),
    5,
    15 * 60_000,
  );
  const user = (await User.findOne({ _id: identity._id, isActive: active })
    .select(accountFields)
    .lean()) as PasswordAccount | null;
  if (!user || (options.initialOnly && !user.mustChangePassword))
    throw new PasswordError("This password change is unavailable.", 400);
  if ((user.credentialVersion || 0) !== (identity.credentialVersion || 0))
    throw new PasswordError(
      "Sign in again before changing your password.",
      401,
    );
  if (!usableHash(user.password))
    throw new PasswordError(
      "This account has no password to change. Continue with your existing sign-in method.",
    );
  minimumForAccount(user, value.newPassword);
  if (!(await bcrypt.compare(value.currentPassword, user.password)))
    throw new PasswordError(
      "Current password is incorrect. If you use Google, continue with Google or verify your mailbox through Forgot Password.",
    );
  if (await bcrypt.compare(value.newPassword, user.password))
    throw new PasswordError("Choose a different new password.");
  return replacePassword(user, await bcrypt.hash(value.newPassword, 12));
}
export async function issuePasswordReset(email: string) {
  // Runs after the generic response for both known and unknown addresses.
  let tokenHash: string | undefined;
  try {
    if (!getEmailConfiguration()) return;
    const origin = passwordAppOrigin();
    if (!origin) return;
    const user = (await User.findOne({ email, isActive: active })
      .select(accountFields)
      .lean()) as PasswordAccount | null;
    if (
      !user ||
      !usableHash(user.password) ||
      !user.email ||
      /@service\.local$/i.test(user.email)
    )
      return;
    if (!(await consumePasswordLimit("email-delivery", "all", 60, 60_000)))
      return;
    const raw = newResetToken();
    tokenHash = hashResetToken(raw);
    const now = new Date();
    await PasswordResetToken.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          tokenHash,
          emailHash: hashResetToken(user.email),
          credentialVersion: user.credentialVersion || 0,
          usedAt: null,
          createdAt: now,
          expiresAt: new Date(now.getTime() + resetLifetimeMs),
        },
      },
      { upsert: true, new: true },
    );
    const url = new URL("/reset-password", origin);
    url.searchParams.set("token", raw);
    const accepted = await sendTransactionalEmail({
      to: user.email,
      ...resetPasswordEmail(url.href),
      idempotencyKey: `password-reset/${tokenHash}`,
    });
    if (!accepted) {
      await PasswordResetToken.updateOne(
        { userId: user._id, tokenHash, usedAt: null },
        { $set: { usedAt: new Date() } },
      );
      console.warn(
        "Password recovery email was not accepted; check transactional email configuration.",
      );
    }
  } catch {
    if (tokenHash) {
      try {
        await PasswordResetToken.updateOne(
          { tokenHash, usedAt: null },
          { $set: { usedAt: new Date() } },
        );
      } catch {
        /* Version and expiry still gate consumption. */
      }
    }
    console.warn(
      "Password recovery processing is unavailable; no account or credential details were logged.",
    );
  }
}
export async function resetAccountPassword(request: Request) {
  const value = resetPasswordInput.parse(await readPasswordBody(request));
  await requirePasswordStorage();
  await enforcePasswordLimit(
    "reset-client",
    passwordClientKey(request),
    100,
    15 * 60_000,
  );
  const hash = hashResetToken(value.token);
  await enforcePasswordLimit("reset-token", hash, 10, 15 * 60_000);
  const token = await PasswordResetToken.findOne({
    tokenHash: hash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .select("+emailHash")
    .lean();
  const invalid = () =>
    new PasswordError(
      "This reset link is invalid or expired. Request a new link.",
    );
  if (!token) throw invalid();
  const user = (await User.findOne({ _id: token.userId, isActive: active })
    .select(accountFields)
    .lean()) as PasswordAccount | null;
  if (
    !user ||
    !usableHash(user.password) ||
    !user.email ||
    hashResetToken(user.email) !== token.emailHash ||
    (user.credentialVersion || 0) !== token.credentialVersion ||
    /@service\.local$/i.test(user.email)
  )
    throw invalid();
  minimumForAccount(user, value.newPassword);
  if (await bcrypt.compare(value.newPassword, user.password))
    throw new PasswordError("Choose a different new password.");
  return replacePassword(user, await bcrypt.hash(value.newPassword, 12), hash);
}
export async function notifyPasswordChanged(notice: {
  email?: string;
  credentialVersion: number;
}) {
  try {
    const origin = passwordAppOrigin();
    if (
      !origin ||
      !notice.email ||
      /@service\.local$/i.test(notice.email) ||
      !getEmailConfiguration()
    )
      return;
    if (!(await consumePasswordLimit("email-delivery", "all", 60, 60_000)))
      return;
    const emailHash = hashResetToken(notice.email);
    if (
      !(await sendTransactionalEmail({
        to: notice.email,
        ...passwordChangedEmail(`${origin}/signin`),
        idempotencyKey: `password-changed/${emailHash}/${notice.credentialVersion}`,
      }))
    )
      console.warn(
        "Password change notice was not accepted by the email provider.",
      );
  } catch {
    console.warn(
      "Password change notice is unavailable; no credential details were logged.",
    );
  }
}
