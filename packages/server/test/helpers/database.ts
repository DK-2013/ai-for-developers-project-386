import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { runMigrations } from "../../src/db/migrate.js";
import { schema, type Database } from "../../src/db/schema.js";

const DEFAULT_TEST_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/call_calendar_test";

export type TestDatabase = {
  db: Database;
  pool: Pool;
  url: string;
  reset(): Promise<void>;
  destroy(): Promise<void>;
};

function databaseUrlWithName(url: string, name: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${name}`;
  return parsed.toString();
}

function sanitizeIdentifier(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 63);
}

/**
 * Every Vitest worker and test file gets its own database so parallel workers
 * cannot see each other's rows and each file starts from the production schema.
 */
function testDatabaseName(label: string): string {
  const baseUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const baseName = new URL(baseUrl).pathname.replace(/^\//, "") || "call_calendar_test";
  const worker = process.env.VITEST_POOL_ID ?? "1";

  return sanitizeIdentifier(`${baseName}_${worker}_${label}`);
}

async function withAdminClient<T>(operation: (client: Client) => Promise<T>): Promise<T> {
  const baseUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const client = new Client({ connectionString: databaseUrlWithName(baseUrl, "postgres") });
  await client.connect();

  try {
    return await operation(client);
  } finally {
    await client.end();
  }
}

export async function createTestDatabase(label: string): Promise<TestDatabase> {
  const baseUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const name = testDatabaseName(label);
  const url = databaseUrlWithName(baseUrl, name);

  await withAdminClient(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${name}" TEMPLATE template0`);
  });

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  try {
    await runMigrations(db);
  } catch (error) {
    await pool.end();
    throw new Error(`Prepare test database: ${name}`, { cause: error });
  }

  return {
    db,
    pool,
    url,
    async reset() {
      await pool.query("TRUNCATE TABLE bookings, meeting_types RESTART IDENTITY CASCADE");
    },
    async destroy() {
      await pool.end();

      await withAdminClient(async (client) => {
        await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      });
    },
  };
}
