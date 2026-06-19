import { AUTH_VERSION } from "./constants";

export function getAuthVersion(): number {
  const fromEnv = process.env.AUTH_VERSION;
  if (fromEnv) {
    const parsed = Number.parseInt(fromEnv, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return AUTH_VERSION;
}

export function isSessionVersionValid(version: unknown): boolean {
  return Number(version) === getAuthVersion();
}
