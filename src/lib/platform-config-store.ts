import "server-only";

import postgres from "postgres";

export async function readPlatformConfig<T>(key: string): Promise<T | null> {
  if (!process.env.DATABASE_URL || process.env.NEXT_PHASE === "phase-production-build") return null;
  const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 3, idle_timeout: 5, max: 1 });
  try {
    const result = await sql.begin(async (transaction) => {
      await transaction`SELECT set_config('app.platform_admin', 'true', true)`;
      await transaction`
        CREATE TABLE IF NOT EXISTS platform_config (
          key text PRIMARY KEY,
          value jsonb NOT NULL DEFAULT '{}',
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      const rows = await transaction<{ value: unknown }[]>`SELECT value FROM platform_config WHERE key = ${key}`;
      return (rows[0]?.value as T | undefined) ?? null;
    });
    return result as T | null;
  } catch {
    return null;
  } finally {
    await sql.end();
  }
}

export async function writePlatformConfig<T>(key: string, value: T): Promise<T | null> {
  if (!process.env.DATABASE_URL || process.env.NEXT_PHASE === "phase-production-build") return null;
  const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 3, idle_timeout: 5, max: 1 });
  try {
    await sql.begin(async (transaction) => {
      await transaction`SELECT set_config('app.platform_admin', 'true', true)`;
      await transaction`
        CREATE TABLE IF NOT EXISTS platform_config (
          key text PRIMARY KEY,
          value jsonb NOT NULL DEFAULT '{}',
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await transaction`
        INSERT INTO platform_config (key, value, updated_at)
        VALUES (${key}, ${transaction.json(value as never)}, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
    });
    return value;
  } catch {
    return null;
  } finally {
    await sql.end();
  }
}
