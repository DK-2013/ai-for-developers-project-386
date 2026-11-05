import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bookings, meetingTypes } from "../src/db/schema.js";
import { createTestDatabase, type TestDatabase } from "./helpers/database.js";

let database: TestDatabase;

async function insertMeetingType(
  name: string = "Intro call",
  durationMinutes: number = 30,
): Promise<string> {
  const rows = await database.db
    .insert(meetingTypes)
    .values({ name, durationMinutes })
    .returning({ id: meetingTypes.id });
  const row = rows.at(0);

  if (row === undefined) {
    throw new Error("Insert meeting type returned no row");
  }

  return row.id;
}

async function insertBooking(meetingTypeId: string, startAt: string, endAt: string): Promise<void> {
  await database.db.insert(bookings).values({
    meetingTypeId,
    meetingTypeName: "Intro call",
    attendeeName: "Guest",
    attendeeEmail: "guest@example.com",
    startAt: new Date(startAt),
    endAt: new Date(endAt),
  });
}

beforeAll(async () => {
  database = await createTestDatabase("db");
});

beforeEach(async () => {
  await database.reset();
});

afterAll(async () => {
  await database.destroy();
});

describe("database schema", () => {
  it("applies migrations to a clean database", async () => {
    const tables = await database.db.execute(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const tableNames = tables.rows.map((row) => row.table_name);

    expect(tableNames).toEqual(expect.arrayContaining(["meeting_types", "bookings"]));

    const extensions = await database.db.execute(
      sql`select extname from pg_extension where extname = 'btree_gist'`,
    );

    expect(extensions.rows).toHaveLength(1);

    const constraints = await database.db.execute(
      sql`select conname from pg_constraint where conname = 'bookings_no_overlap'`,
    );

    expect(constraints.rows).toHaveLength(1);
  });

  it("rejects a meeting type whose duration is not a valid slot length", async () => {
    const insertion = database.db.insert(meetingTypes).values({ name: "Bad", durationMinutes: 16 });

    await expect(insertion).rejects.toMatchObject({ cause: { code: "23514" } });
  });

  it("allows touching bookings and rejects overlapping ones", async () => {
    const meetingTypeId = await insertMeetingType();

    await insertBooking(meetingTypeId, "2026-01-05T10:00:00Z", "2026-01-05T10:30:00Z");
    await insertBooking(meetingTypeId, "2026-01-05T10:30:00Z", "2026-01-05T11:00:00Z");

    const overlappingInsertion = insertBooking(
      meetingTypeId,
      "2026-01-05T10:15:00Z",
      "2026-01-05T10:45:00Z",
    );

    await expect(overlappingInsertion).rejects.toMatchObject({ cause: { code: "23P01" } });
  });

  it("rejects overlapping bookings across meeting types", async () => {
    const introId = await insertMeetingType("Intro call", 30);
    const consultationId = await insertMeetingType("Consultation", 45);

    await insertBooking(introId, "2026-01-05T10:00:00Z", "2026-01-05T10:30:00Z");

    const overlappingInsertion = insertBooking(
      consultationId,
      "2026-01-05T10:15:00Z",
      "2026-01-05T10:45:00Z",
    );

    await expect(overlappingInsertion).rejects.toMatchObject({ cause: { code: "23P01" } });
  });
});
