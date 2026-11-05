import { asc, gt } from "drizzle-orm";
import { isPostgresError } from "../db/errors.js";
import { bookings, type Database } from "../db/schema.js";
import { toDate, toInstant } from "../db/time.js";
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
        startAt: toDate(input.startAt),
        endAt: toDate(input.endAt),
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
