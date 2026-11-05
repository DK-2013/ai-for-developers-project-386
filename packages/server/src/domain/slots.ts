import { Temporal } from "temporal-polyfill";
import type { OwnerConfig } from "../config.js";
import { BOOKING_HORIZON_DAYS, SLOT_STEP_MINUTES } from "./booking-rules.js";
import { bookingWindow, localTimeWindow, type BookingWindow } from "./time/index.js";

export type InstantInterval = {
  start: Temporal.Instant;
  end: Temporal.Instant;
};

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
    let start = workingWindow.start;

    while (
      Temporal.Instant.compare(start.add({ minutes: durationMinutes }), workingWindow.end) <= 0
    ) {
      const slot = { start, end: start.add({ minutes: durationMinutes }) };
      const inFuture = Temporal.Instant.compare(start, now) > 0;
      const isFree = !occupied.some((interval) => overlaps(slot, interval));

      if (inFuture && isFree) {
        slots.push(slot);
      }

      start = start.add({ minutes: SLOT_STEP_MINUTES });
    }
  }

  return { window, slots };
}
