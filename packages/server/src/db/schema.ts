import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const meetingTypes = pgTable(
  "meeting_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    description: varchar("description", { length: 2000 }),
    durationMinutes: integer("duration_minutes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "meeting_types_duration_check",
      sql`${table.durationMinutes} between 15 and 1440 and ${table.durationMinutes} % 15 = 0`,
    ),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingTypeId: uuid("meeting_type_id")
      .notNull()
      .references(() => meetingTypes.id, { onDelete: "restrict" }),
    meetingTypeName: varchar("meeting_type_name", { length: 200 }).notNull(),
    attendeeName: varchar("attendee_name", { length: 200 }).notNull(),
    attendeeEmail: varchar("attendee_email", { length: 254 }).notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("bookings_time_check", sql`${table.endAt} > ${table.startAt}`),
    index("bookings_start_at_idx").on(table.startAt),
  ],
);

export const schema = { meetingTypes, bookings };

export type Database = NodePgDatabase<typeof schema>;
