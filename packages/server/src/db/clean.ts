import type { Pool } from "pg";
import { runMigrations } from "./migrate.js";
import type { Database } from "./schema.js";
import { seedDefaultMeetingType } from "./seed.js";

/**
 * Empties all application tables and restores the default seed. Migrations run
 * first so the task also works before the server has ever started.
 */
export async function cleanDatabase(db: Database, pool: Pool): Promise<void> {
  await runMigrations(db);
  await pool.query("TRUNCATE TABLE bookings, meeting_types RESTART IDENTITY CASCADE");
  await seedDefaultMeetingType(db);
}
