import { z } from "zod";

export const passwordPolicyText =
  "Use at least 6 characters and no more than 72 UTF-8 bytes.";
// Preserve registration's existing bcrypt length policy on both client and server.
export const accountPassword = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(72, "Password must fit within 72 UTF-8 bytes")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Password must fit within 72 UTF-8 bytes",
  );
const pair = z
  .object({
    newPassword: accountPassword,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The new passwords do not match.",
  });
export const resetPasswordInput = pair.safeExtend({
  token: z
    .string()
    .regex(/^[a-f\d]{64}$/i, "This reset link is invalid or expired."),
});
export const changePasswordInput = pair
  .safeExtend({
    currentPassword: z.string().min(1, "Enter your current password").max(1024),
  })
  .refine(
    (value) =>
      !value.currentPassword ||
      !value.newPassword ||
      value.currentPassword !== value.newPassword,
    {
      path: ["newPassword"],
      message: "Choose a different new password.",
    },
  );
export const forgotPasswordInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});
export const genericResetResponse =
  "If an account exists with this email address, you will receive instructions to reset your password.";
