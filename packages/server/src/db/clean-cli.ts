import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { loadConfig } from "../config.js";
import { cleanDatabase } from "./clean.js";
import { schema } from "./schema.js";

const config = loadConfig();
const pool = new Pool({ connectionString: config.databaseUrl });
const db = drizzle(pool, { schema });

try {
  await cleanDatabase(db, pool);
  process.stdout.write("Database cleaned\n");
} finally {
  await pool.end();
}
