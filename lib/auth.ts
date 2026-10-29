import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth";
import { connectToDb } from "./db";
import User from "@/models/user";

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, ApiAuthError.prototype);
  }
}

/**
 * Get session on server (App Router compatible)
 */
export async function getServerSessionOrNull() {
  const session = await getServerSession(authOptions);
  return session;
}

/**
 * Require session (throws ApiAuthError 401 if missing)
 */
export async function requireAuth() {
  const session = await getServerSessionOrNull();
  if (!session || !session.user) {
    throw new ApiAuthError("Unauthorized", 401);
  }
  return session;
}

/**
 * Require server session AND application user (from DB). Returns DB user.
 * Throws 401 if not logged in, 404 if DB user not found.
 */

export async function requireCurrentUser(
  options: { allowPasswordChange?: boolean } = {},
) {
  const session = await requireAuth();
  // session.user is from NextAuth and may not have all the fields of our User model, so we need to fetch from DB
  const userId = session.user?.id;

  if (!userId) {
    const email = session.user?.email;
    if (!email) {
      throw new ApiAuthError(
        "Unauthorized: No user ID or email in session",
        401,
      );
    }
    await connectToDb();
    const userByEmail = await User.findOne({ email, isActive: { $ne: false } })
      .select("-password")
      .lean();
    if (!userByEmail) {
      throw new ApiAuthError("Unauthorized: No user found with email", 401);
    }
    validateCredentialSession(
      userByEmail,
      session,
      options.allowPasswordChange,
    );
    return userByEmail;
  }

  await connectToDb();
  const user = await User.findOne({ _id: userId, isActive: { $ne: false } })
    .select("-password")
    .lean();
  if (!user) {
    throw new ApiAuthError("Unauthorized: User not found", 401);
  }
  validateCredentialSession(user, session, options.allowPasswordChange);
  return user;
}
function validateCredentialSession(
  user: {
    mustChangePassword?: boolean;
    credentialVersion?: number;
    temporaryPasswordExpiresAt?: Date;
  },
  session: { user?: { credentialVersion?: number } },
  allowPasswordChange = false,
) {
  if ((user.credentialVersion || 0) !== (session.user?.credentialVersion || 0))
    throw new ApiAuthError(
      "Your session has changed. Please sign in again.",
      401,
    );
  if (
    user.mustChangePassword &&
    user.temporaryPasswordExpiresAt &&
    user.temporaryPasswordExpiresAt <= new Date()
  )
    throw new ApiAuthError(
      "Your temporary password expired. Ask your provider to issue a new one.",
      401,
    );
  if (user.mustChangePassword && !allowPasswordChange)
    throw new ApiAuthError(
      "Change your temporary password before using the application.",
      403,
    );
}
// requires at least one role

export async function requireRole(allowedRoles: string[]) {
  const user = await requireCurrentUser();
  const role = user.role;
  if (!role) throw new ApiAuthError("Role not found in session", 401);
  if (!allowedRoles.includes(role)) {
    throw new ApiAuthError("forbidden", 403);
  }

  return { user: { ...user, id: String(user._id) } };
}

export async function requireAdmin() {
  return requireRole(["admin"]);
}

export async function requireDispatcher() {
  return requireRole(["dispatcher", "admin"]);
}

export async function requireTechnician() {
  return requireRole(["technician", "admin"]);
}
