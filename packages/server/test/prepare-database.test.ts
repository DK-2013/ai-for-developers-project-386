import { afterEach, describe, expect, it } from "vitest";
import { prepareDatabase } from "../src/db/prepare-database.js";
import { meetingTypes } from "../src/db/schema.js";
import {
  createTestDatabase,
  type TestDatabase,
  type TestDatabaseOptions,
} from "./helpers/database.js";

const DEFAULT_MEETING_TYPE = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Звонок",
  description: "Стандартный звонок",
  durationMinutes: 15,
};

const openedDatabases: TestDatabase[] = [];

async function openDatabase(label: string, options: TestDatabaseOptions): Promise<TestDatabase> {
  const database = await createTestDatabase(label, options);
  openedDatabases.push(database);

  return database;
}

afterEach(async () => {
  const database = openedDatabases.pop();

  if (database !== undefined) {
    await database.destroy();
  }
});

describe("prepareDatabase", () => {
  it("seeds the default meeting type when migrations are disabled", async () => {
    const database = await openDatabase("prepare_seed", {
      migrateOnStart: true,
      seedOnStart: false,
    });

    await prepareDatabase(database.db, { migrateOnStart: false });

    const rows = await database.db
      .select({
        id: meetingTypes.id,
        name: meetingTypes.name,
        description: meetingTypes.description,
        durationMinutes: meetingTypes.durationMinutes,
      })
      .from(meetingTypes);

    expect(rows).toEqual([DEFAULT_MEETING_TYPE]);
  });

  it("rejects when the schema has not been migrated", async () => {
    const database = await openDatabase("prepare_missing_schema", {
      migrateOnStart: false,
      seedOnStart: false,
    });

    const preparation = prepareDatabase(database.db, { migrateOnStart: false });

    await expect(preparation).rejects.toMatchObject({ cause: { code: "42P01" } });
  });
});
