export function getWebAuthnRpId(): string {
  if (process.env.AUTH_WEBAUTHN_RP_ID) {
    return process.env.AUTH_WEBAUTHN_RP_ID;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    return new URL(appUrl).hostname;
  } catch {
    return "localhost";
  }
}

export function getWebAuthnOrigin(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    return new URL(appUrl).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function getWebAuthnRpName(): string {
  return "Chambellan Concierge";
}
