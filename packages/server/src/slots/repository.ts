import { and, gt, lt } from "drizzle-orm";
import { Temporal } from "temporal-polyfill";
import { bookings, type Database } from "../db/schema.js";
import type { InstantInterval } from "../domain/slots.js";
import type { BookingWindow } from "../domain/time/index.js";

export type SlotRepository = {
  /** Bookings whose half-open interval intersects the booking window. */
  listOccupied(window: BookingWindow): Promise<InstantInterval[]>;
};

function toDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}

function toInstant(date: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

export function createSlotRepository(db: Database): SlotRepository {
  return {
    async listOccupied(window) {
      const rows = await db
        .select({ startAt: bookings.startAt, endAt: bookings.endAt })
        .from(bookings)
        .where(
          and(lt(bookings.startAt, toDate(window.end)), gt(bookings.endAt, toDate(window.start))),
        );

      return rows.map((row) => ({
        start: toInstant(row.startAt),
        end: toInstant(row.endAt),
      }));
    },
  };
}
