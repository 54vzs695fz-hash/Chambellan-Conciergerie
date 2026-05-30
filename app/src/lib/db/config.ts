/** Use Postgres when DATABASE_URL is set (Vercel / Neon). Otherwise local SQLite. */
export function isPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function isSqlite(): boolean {
  return !isPostgres();
}
