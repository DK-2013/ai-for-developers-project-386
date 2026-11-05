import { Temporal } from "temporal-polyfill";
import type { OwnerConfig } from "../config.js";
import { BOOKING_HORIZON_DAYS, SLOT_STEP_MINUTES } from "./booking-rules.js";
import {
  bookingWindow,
  firstSlotLocalStart,
  isOnSlotGrid,
  localTimeWindow,
  type BookingWindow,
  type InstantInterval,
} from "./time/index.js";

export type Slot = InstantInterval;

export type ComputeSlotsInput = {
  now: Temporal.Instant;
  owner: OwnerConfig;
  durationMinutes: number;
  occupied: readonly InstantInterval[];
};

export type SlotEngineResult = {
  window: BookingWindow;
  slots: Slot[];
};

function overlaps(left: InstantInterval, right: InstantInterval): boolean {
  return (
    Temporal.Instant.compare(left.start, right.end) < 0 &&
    Temporal.Instant.compare(left.end, right.start) > 0
  );
}

export type BookableSlotInput = {
  now: Temporal.Instant;
  owner: OwnerConfig;
  durationMinutes: number;
  start: Temporal.Instant;
};

type BookableStartContext = {
  now: Temporal.Instant;
  start: Temporal.Instant;
  end: Temporal.Instant;
  localStart: Temporal.ZonedDateTime;
  window: BookingWindow;
  workingWindow: InstantInterval;
};

/**
 * The one set of structural rules a start must pass to be bookable: strictly
 * in the future, inside the booking window and the working window, on the
 * fifteen-minute grid, and leaving room for the full duration before the
 * working day ends. Callers resolve the working day and its interval.
 *
 * Occupancy is deliberately absent: the database decides that, because a
 * pre-check loses the race.
 */
function isBookableStart(context: BookableStartContext): boolean {
  const { now, start, end, localStart, window, workingWindow } = context;

  if (Temporal.Instant.compare(start, now) <= 0) {
    return false;
  }

  if (
    Temporal.Instant.compare(start, window.start) < 0 ||
    Temporal.Instant.compare(start, window.end) >= 0
  ) {
    return false;
  }

  if (Temporal.Instant.compare(start, workingWindow.start) < 0) {
    return false;
  }

  if (!isOnSlotGrid(localStart)) {
    return false;
  }

  return Temporal.Instant.compare(end, workingWindow.end) <= 0;
}

/**
 * Resolves a requested start to the interval a booking would occupy, or
 * `undefined` when the start is not bookable.
 */
export function bookableSlot(input: BookableSlotInput): Slot | undefined {
  const { now, owner, durationMinutes, start } = input;
  const window = bookingWindow(now, owner.timeZone);
  const localStart = start.toZonedDateTimeISO(owner.timeZone);
  const localDate = localStart.toPlainDate();

  if (!owner.workingDays.includes(localDate.dayOfWeek)) {
    return undefined;
  }

  const workingWindow = localTimeWindow(localDate, owner.timeZone, owner.workingHours);
  const end = start.add({ minutes: durationMinutes });
  const context: BookableStartContext = {
    now,
    start,
    end,
    localStart,
    window,
    workingWindow,
  };

  return isBookableStart(context) ? { start, end } : undefined;
}

/**
 * Computes free slots for one meeting type. The owner's zone defines the
 * booking window, working days, working hours, and the fifteen-minute grid;
 * occupied intervals are excluded on a half-open basis so touching endpoints
 * do not conflict.
 */
export function computeSlots(input: ComputeSlotsInput): SlotEngineResult {
  const { now, owner, durationMinutes, occupied } = input;
  const window = bookingWindow(now, owner.timeZone);
  const today = now.toZonedDateTimeISO(owner.timeZone).toPlainDate();
  const slots: Slot[] = [];

  for (let dayOffset = 0; dayOffset < BOOKING_HORIZON_DAYS; dayOffset += 1) {
    const date = today.add({ days: dayOffset });

    if (!owner.workingDays.includes(date.dayOfWeek)) {
      continue;
    }

    const workingWindow = localTimeWindow(date, owner.timeZone, owner.workingHours);
    let localStart = firstSlotLocalStart(date, owner.timeZone, owner.workingHours);

    while (Temporal.Instant.compare(localStart.toInstant(), workingWindow.end) < 0) {
      const start = localStart.toInstant();
      const end = start.add({ minutes: durationMinutes });
      const context: BookableStartContext = {
        now,
        start,
        end,
        localStart,
        window,
        workingWindow,
      };

      if (isBookableStart(context)) {
        const slot = { start, end };
        const isFree = !occupied.some((interval) => overlaps(slot, interval));

        if (isFree) {
          slots.push(slot);
        }
      }

      localStart = localStart.add({ minutes: SLOT_STEP_MINUTES });
    }
  }

  return { window, slots };
}
