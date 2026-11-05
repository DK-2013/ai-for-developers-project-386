import { asc, gt } from "drizzle-orm";
import { Temporal } from "temporal-polyfill";
import { isPostgresError } from "../db/errors.js";
import { bookings, type Database } from "../db/schema.js";
import type { Booking, NewBooking } from "./domain.js";

const EXCLUSION_VIOLATION = "23P01";

/** A booking whose interval overlaps an existing booking. */
export class BookingConflictError extends Error {
  constructor() {
    super("Booking conflicts with an existing booking");
    this.name = "BookingConflictError";
  }
}

type BookingRow = typeof bookings.$inferSelect;

function toInstant(date: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    meetingTypeId: row.meetingTypeId,
    meetingTypeName: row.meetingTypeName,
    attendeeName: row.attendeeName,
    attendeeEmail: row.attendeeEmail,
    startAt: toInstant(row.startAt),
    endAt: toInstant(row.endAt),
  };
}

export type BookingRepository = {
  create(input: NewBooking): Promise<Booking>;
  /** Bookings that have not ended yet, across all meeting types, by start. */
  listUpcoming(now: Date): Promise<Booking[]>;
};

export function createBookingRepository(db: Database): BookingRepository {
  return {
    async create(input) {
      const values: typeof bookings.$inferInsert = {
        meetingTypeId: input.meetingTypeId,
        meetingTypeName: input.meetingTypeName,
        attendeeName: input.attendeeName,
        attendeeEmail: input.attendeeEmail,
        startAt: new Date(input.startAt.epochMilliseconds),
        endAt: new Date(input.endAt.epochMilliseconds),
      };

      let rows: BookingRow[];

      try {
        rows = await db.insert(bookings).values(values).returning();
      } catch (error) {
        if (isPostgresError(error, EXCLUSION_VIOLATION)) {
          throw new BookingConflictError();
        }

        throw new Error("Create booking: insert failed", { cause: error });
      }

      const row = rows.at(0);

      if (row === undefined) {
        throw new Error("Create booking: insert returned no row");
      }

      return toBooking(row);
    },

    async listUpcoming(now) {
      let rows: BookingRow[];

      try {
        rows = await db
          .select()
          .from(bookings)
          .where(gt(bookings.endAt, now))
          .orderBy(asc(bookings.startAt), asc(bookings.id));
      } catch (error) {
        throw new Error("List upcoming bookings: query failed", { cause: error });
      }

      return rows.map(toBooking);
    },
  };
}
