import { and, gt, lt } from "drizzle-orm";
import { bookings, type Database } from "../db/schema.js";
import { toDate, toInstant } from "../db/time.js";
import type { BookingWindow, InstantInterval } from "../domain/time/index.js";

export type SlotRepository = {
  /** Bookings whose half-open interval intersects the booking window. */
  listOccupied(window: BookingWindow): Promise<InstantInterval[]>;
};

export function createSlotRepository(db: Database): SlotRepository {
  return {
    async listOccupied(window) {
      let rows: { startAt: Date; endAt: Date }[];

      try {
        rows = await db
          .select({ startAt: bookings.startAt, endAt: bookings.endAt })
          .from(bookings)
          .where(
            and(lt(bookings.startAt, toDate(window.end)), gt(bookings.endAt, toDate(window.start))),
          );
      } catch (error) {
        throw new Error("List occupied bookings: query failed", { cause: error });
      }

      return rows.map((row) => ({
        start: toInstant(row.startAt),
        end: toInstant(row.endAt),
      }));
    },
  };
}
