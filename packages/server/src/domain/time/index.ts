import { Temporal } from "temporal-polyfill";
import type { OwnerConfig } from "../../config.js";
import { BOOKING_HORIZON_DAYS } from "../booking-rules.js";

const MIDNIGHT = Temporal.PlainTime.from("00:00");

export type BookingWindow = {
  start: Temporal.Instant;
  end: Temporal.Instant;
};

export type InstantInterval = {
  start: Temporal.Instant;
  end: Temporal.Instant;
};

/** Projects an owner-local calendar date and wall-clock time onto an instant. */
function atLocalTime(
  date: Temporal.PlainDate,
  timeZone: string,
  time: Temporal.PlainTime,
): Temporal.Instant {
  return date.toZonedDateTime({ timeZone, plainTime: time }).toInstant();
}

/**
 * The half-open booking window [today 00:00, today + 14 days 00:00) in the
 * owner's time zone. "Today" is decided by the owner zone, never by UTC.
 */
export function bookingWindow(now: Temporal.Instant, timeZone: string): BookingWindow {
  const today = now.toZonedDateTimeISO(timeZone).toPlainDate();
  const endDate = today.add({ days: BOOKING_HORIZON_DAYS });

  return {
    start: atLocalTime(today, timeZone, MIDNIGHT),
    end: atLocalTime(endDate, timeZone, MIDNIGHT),
  };
}

/** The working-hours interval of one owner-local calendar day, as instants. */
export function localTimeWindow(
  date: Temporal.PlainDate,
  timeZone: string,
  workingHours: OwnerConfig["workingHours"],
): InstantInterval {
  return {
    start: atLocalTime(date, timeZone, workingHours.start),
    end: atLocalTime(date, timeZone, workingHours.end),
  };
}
