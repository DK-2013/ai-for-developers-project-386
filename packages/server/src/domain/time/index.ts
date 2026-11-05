import { Temporal } from "temporal-polyfill";
import type { OwnerConfig } from "../../config.js";
import { BOOKING_HORIZON_DAYS, SLOT_STEP_MINUTES } from "../booking-rules.js";

const MIDNIGHT = Temporal.PlainTime.from("00:00");

export type BookingWindow = {
  start: Temporal.Instant;
  end: Temporal.Instant;
};

export type InstantInterval = {
  start: Temporal.Instant;
  end: Temporal.Instant;
};

/**
 * True when the local wall time falls on a quarter-hour. The grid is anchored
 * to :00/:15/:30/:45, not to the start of the working day, so a working day
 * that begins at 10:07 still offers 10:15 first.
 */
export function isOnSlotGrid(local: Temporal.ZonedDateTime): boolean {
  const hasSubMinutePart =
    local.second !== 0 ||
    local.millisecond !== 0 ||
    local.microsecond !== 0 ||
    local.nanosecond !== 0;

  return local.minute % SLOT_STEP_MINUTES === 0 && !hasSubMinutePart;
}

/** The first quarter-hour local time at or after the working-day start. */
export function firstSlotLocalStart(
  date: Temporal.PlainDate,
  timeZone: string,
  workingHours: OwnerConfig["workingHours"],
): Temporal.ZonedDateTime {
  const workingStart = date.toZonedDateTime({ timeZone, plainTime: workingHours.start });
  const truncated = workingStart.with({
    second: 0,
    millisecond: 0,
    microsecond: 0,
    nanosecond: 0,
  });
  const remainder = truncated.minute % SLOT_STEP_MINUTES;
  const hasSubMinutePart =
    workingStart.second !== 0 ||
    workingStart.millisecond !== 0 ||
    workingStart.microsecond !== 0 ||
    workingStart.nanosecond !== 0;

  if (remainder === 0 && !hasSubMinutePart) {
    return truncated;
  }

  return truncated.add({ minutes: SLOT_STEP_MINUTES - remainder });
}

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
