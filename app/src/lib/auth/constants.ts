export const SESSION_COOKIE = "chambellan_session";
/** Persistent “remember this device” sessions */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;
/** Shorter session when “remember” is unchecked */
export const SESSION_BROWSER_AGE_SEC = 60 * 60 * 12;

/** Bump to invalidate all existing sessions immediately. */
export const AUTH_VERSION = 2;

export type AuthRole = "admin";

export interface AuthorizedAccount {
  name: string;
  email: string;
  role: AuthRole;
  passwordEnv: string;
}

/** The only two accounts allowed to access the app. */
export const AUTHORIZED_ACCOUNTS: AuthorizedAccount[] = [
  {
    name: "Matthieu Dubourg",
    email: "matthieu@chambellan-conciergerie.fr",
    role: "admin",
    passwordEnv: "AUTH_MATTHIEU_PASSWORD",
  },
  {
    name: "Yanis Mousli",
    email: "yanis@chambellan-conciergerie.fr",
    role: "admin",
    passwordEnv: "AUTH_YANIS_PASSWORD",
  },
];

export const AUTHORIZED_EMAILS = new Set(
  AUTHORIZED_ACCOUNTS.map((account) => account.email)
);

export function isAuthorizedEmail(email: string): boolean {
  return AUTHORIZED_EMAILS.has(email.toLowerCase().trim());
}

/** @deprecated use AUTHORIZED_ACCOUNTS */
export const AUTH_USER_SEEDS = AUTHORIZED_ACCOUNTS;
