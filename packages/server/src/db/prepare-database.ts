import { runMigrations } from "./migrate.js";
import type { Database } from "./schema.js";
import { seedDefaultMeetingType } from "./seed.js";

export type PrepareDatabaseOptions = {
  migrateOnStart: boolean;
};

/**
 * Brings the database to a serving state before the HTTP server starts:
 * optional migrations first, then the unconditional default seed. Errors
 * propagate so a failure aborts startup.
 */
export async function prepareDatabase(
  db: Database,
  { migrateOnStart }: PrepareDatabaseOptions,
): Promise<void> {
  if (migrateOnStart) {
    await runMigrations(db);
  }

  await seedDefaultMeetingType(db);
}
