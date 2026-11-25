export function credentialSessionIsCurrent(
  user: { role?: string; isActive?: boolean; credentialVersion?: number; mustChangePassword?: boolean; temporaryPasswordExpiresAt?: Date | string } | null | undefined,
  identity: { role?: unknown; credentialVersion?: unknown } | null | undefined,
  now?: number,
): boolean;
