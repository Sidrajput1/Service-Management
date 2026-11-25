const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (value) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        value
      ]!,
  );
const shell = (heading: string, body: string) =>
  `<!doctype html><html lang="en"><body style="margin:0;background:#f6f7f9;color:#19212a;font-family:Arial,sans-serif"><main style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border:1px solid #e4e7eb;border-radius:16px"><p style="color:#c31149;font-size:26px;font-weight:bold;margin:0">Servizato</p><p style="font-size:12px;color:#505b67">All your services, one place.</p><h1 style="font-size:24px;line-height:1.4">${heading}</h1>${body}</main></body></html>`;
export function resetPasswordEmail(url: string) {
  const link = escape(url);
  return {
    subject: "Reset Your Servizato Password",
    html: shell(
      "Reset your password",
      `<p style="line-height:1.7">We received a request to reset your Servizato password. Use the button below to choose a new password.</p><p style="margin:28px 0"><a href="${link}" style="display:inline-block;padding:14px 22px;background:#c31149;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Reset Password</a></p><p style="line-height:1.7">This link expires in 30 minutes and can only be used once. Requesting a new link replaces earlier links.</p><p style="line-height:1.7">If the button does not work, copy this address into your browser:</p><p style="word-break:break-all"><a href="${link}">${link}</a></p><p style="line-height:1.7">If you did not request this change, ignore this email. Your password has not changed.</p>`,
    ),
    text: `Servizato — All your services, one place.\n\nWe received a request to reset your Servizato password.\n\nReset Password: ${url}\n\nThis link expires in 30 minutes and can only be used once. Requesting a new link replaces earlier links.\n\nIf you did not request this change, ignore this email. Your password has not changed.`,
  };
}
export function passwordChangedEmail(signInUrl: string) {
  return {
    subject: "Your Servizato password was changed",
    html: shell(
      "Your password was changed",
      `<p style="line-height:1.7">Your Servizato password was updated. Existing sessions have been revoked. Sign in again to continue.</p><p style="line-height:1.7">If you did not make this change, use Forgot Password from the <a href="${escape(signInUrl)}">Servizato sign-in page</a> to recover your account.</p>`,
    ),
    text: `Your Servizato password was updated. Existing sessions have been revoked. Sign in again to continue.\n\nIf you did not make this change, use Forgot Password from ${signInUrl} to recover your account.`,
  };
}
