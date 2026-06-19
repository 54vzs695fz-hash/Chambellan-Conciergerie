export const SESSION_COOKIE = "chambellan_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export const AUTH_USER_SEEDS = [
  {
    name: "Matthieu",
    emailEnv: "AUTH_MATTHIEU_EMAIL",
    passwordEnv: "AUTH_MATTHIEU_PASSWORD",
    defaultEmail: "matthieu@chambellan.fr",
  },
  {
    name: "Yanis",
    emailEnv: "AUTH_YANIS_EMAIL",
    passwordEnv: "AUTH_YANIS_PASSWORD",
    defaultEmail: "yanis@chambellan.fr",
  },
] as const;
