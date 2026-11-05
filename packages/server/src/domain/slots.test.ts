import { Temporal } from "temporal-polyfill";
import { array, assert, integer, property, record, type Arbitrary } from "fast-check";
import { describe, expect, it } from "vitest";
import type { OwnerConfig } from "../config.js";
import { BOOKING_HORIZON_DAYS, SLOT_STEP_MINUTES } from "./booking-rules.js";
import { bookableSlot, computeSlots, type ComputeSlotsInput, type Slot } from "./slots.js";
import { localTimeWindow, type InstantInterval } from "./time/index.js";

const MOSCOW = "Europe/Moscow";

function plainTime(value: string): Temporal.PlainTime {
  return Temporal.PlainTime.from(value);
}

function instant(value: string): Temporal.Instant {
  return Temporal.Instant.from(value);
}

function weekdayOwner(overrides: Partial<OwnerConfig> = {}): OwnerConfig {
  return {
    timeZone: MOSCOW,
    workingHours: { start: plainTime("10:00"), end: plainTime("18:00") },
    workingDays: [1, 2, 3, 4, 5],
    ...overrides,
  };
}

function compute(
  now: Temporal.Instant,
  durationMinutes: number,
  occupied: InstantInterval[] = [],
  owner: OwnerConfig = weekdayOwner(),
): Slot[] {
  const input: ComputeSlotsInput = { now, owner, durationMinutes, occupied };

  return computeSlots(input).slots;
}

function localTimeOf(slot: Slot): Temporal.PlainDateTime {
  return slot.start.toZonedDateTimeISO(MOSCOW).toPlainDateTime();
}

describe("slot engine", () => {
  it("starts strictly after the current instant", () => {
    const slots = compute(instant("2026-01-05T10:00:00Z"), 15);
    const firstDay = slots.filter(
      (slot) => localTimeOf(slot).toPlainDate().toString() === "2026-01-05",
    );

    expect(slots.at(0)?.start.toString()).toBe("2026-01-05T10:15:00Z");
    expect(firstDay.at(-1)?.start.toString()).toBe("2026-01-05T14:45:00Z");
  });

  it("generates starts on a fifteen-minute step inside working hours", () => {
    const slots = compute(instant("2026-01-05T06:00:00Z"), 15);

    for (const slot of slots) {
      const local = localTimeOf(slot);
      const minuteOffset = local.minute % SLOT_STEP_MINUTES;
      const atOrAfterOpening = Temporal.PlainTime.compare(local.toPlainTime(), plainTime("10:00"));
      const beforeClosing = Temporal.PlainTime.compare(local.toPlainTime(), plainTime("18:00"));

      expect(minuteOffset).toBe(0);
      expect(atOrAfterOpening).toBeGreaterThanOrEqual(0);
      expect(beforeClosing).toBeLessThan(0);
    }

    for (let index = 1; index < slots.length; index += 1) {
      const previous = slots[index - 1];
      const current = slots[index];

      if (previous === undefined || current === undefined) {
        throw new Error("Missing slot");
      }

      const gap = current.start.since(previous.start);
      const gapRemainder = gap.minutes % SLOT_STEP_MINUTES;

      expect(gapRemainder).toBe(0);
    }
  });

  it("only offers owner working days", () => {
    const slots = compute(instant("2026-01-05T06:00:00Z"), 15);
    const days = new Set(slots.map((slot) => localTimeOf(slot).dayOfWeek));
    const sortedDays = [...days].toSorted();

    expect(sortedDays).toEqual([1, 2, 3, 4, 5]);
  });

  it("uses configured working days and hours", () => {
    const owner = weekdayOwner({
      workingHours: { start: plainTime("09:00"), end: plainTime("11:00") },
      workingDays: [1, 3],
    });

    const slots = compute(instant("2026-01-05T00:00:00Z"), 15, [], owner);
    const localTimes = slots.map((slot) => localTimeOf(slot).toString());
    const workingDayNumbers = new Set(slots.map((slot) => localTimeOf(slot).dayOfWeek));

    expect(localTimes.at(0)).toBe("2026-01-05T09:00:00");
    expect(localTimes.at(-1)).toBe("2026-01-14T10:45:00");
    expect(workingDayNumbers).toEqual(new Set([1, 3]));
  });

  it("keeps every meeting inside the working day for 30-minute types", () => {
    const slots = compute(instant("2026-01-05T06:00:00Z"), 30);
    const firstDay = slots.filter(
      (slot) => localTimeOf(slot).toPlainDate().toString() === "2026-01-05",
    );
    const last = firstDay.at(-1);
    const duration = last?.end.since(last.start).total("minutes");

    expect(last?.start.toString()).toBe("2026-01-05T14:30:00Z");
    expect(last?.end.toString()).toBe("2026-01-05T15:00:00Z");
    expect(duration).toBe(30);
  });

  it("keeps every meeting inside the working day for 45-minute types", () => {
    const slots = compute(instant("2026-01-05T06:00:00Z"), 45);
    const firstDay = slots.filter(
      (slot) => localTimeOf(slot).toPlainDate().toString() === "2026-01-05",
    );
    const last = firstDay.at(-1);
    const duration = last?.end.since(last.start).total("minutes");

    expect(last?.start.toString()).toBe("2026-01-05T14:15:00Z");
    expect(last?.end.toString()).toBe("2026-01-05T15:00:00Z");
    expect(duration).toBe(45);
  });

  it("keeps 30- and 45-minute ends on the fifteen-minute grid", () => {
    for (const durationMinutes of [30, 45]) {
      const slots = compute(instant("2026-01-05T06:00:00Z"), durationMinutes);

      for (const slot of slots) {
        const end = slot.end.toZonedDateTimeISO(MOSCOW).toPlainDateTime();
        const minuteOffset = end.minute % SLOT_STEP_MINUTES;
        const duration = slot.end.since(slot.start).total("minutes");

        expect(minuteOffset).toBe(0);
        expect(duration).toBe(durationMinutes);
      }
    }
  });

  it("drops the rest of today when no meeting fits before closing", () => {
    const slots = compute(instant("2026-01-05T14:50:00Z"), 15);

    expect(slots.at(0)?.start.toString()).toBe("2026-01-06T07:00:00Z");
  });

  it("excludes a partially overlapping booking", () => {
    const occupied = [
      { start: instant("2026-01-05T07:00:00Z"), end: instant("2026-01-05T07:30:00Z") },
    ];
    const slots = compute(instant("2026-01-05T00:00:00Z"), 30, occupied);
    const starts = slots.map((slot) => slot.start.toString());

    expect(starts).not.toContain("2026-01-05T07:00:00Z");
    expect(starts).not.toContain("2026-01-05T07:15:00Z");
    expect(starts).toContain("2026-01-05T07:30:00Z");
  });

  it("allows a meeting to start exactly when another ends", () => {
    const occupied = [
      { start: instant("2026-01-05T07:00:00Z"), end: instant("2026-01-05T07:30:00Z") },
    ];
    const slots = compute(instant("2026-01-05T00:00:00Z"), 45, occupied);
    const starts = slots.map((slot) => slot.start.toString());

    expect(starts).not.toContain("2026-01-05T07:00:00Z");
    expect(starts).not.toContain("2026-01-05T07:15:00Z");
    expect(starts).toContain("2026-01-05T07:30:00Z");
  });

  it("returns no slots when the type is longer than the working day", () => {
    const slots = compute(instant("2026-01-05T00:00:00Z"), 1440);

    expect(slots).toEqual([]);
  });
});

function arbitraryInstant(): Arbitrary<Temporal.Instant> {
  return integer({
    min: Date.UTC(2026, 0, 1),
    max: Date.UTC(2026, 0, 31),
  }).map((milliseconds) => Temporal.Instant.fromEpochMilliseconds(milliseconds));
}

function arbitraryDurationMinutes(): Arbitrary<number> {
  return integer({ min: 1, max: 96 }).map((steps) => steps * SLOT_STEP_MINUTES);
}

function arbitraryOccupied(): Arbitrary<InstantInterval[]> {
  return array(
    record({
      start: arbitraryInstant(),
      durationMinutes: arbitraryDurationMinutes(),
    }),
    { maxLength: 8 },
  ).map((items) =>
    items.map(({ start, durationMinutes }) => ({
      start,
      end: start.add({ minutes: durationMinutes }),
    })),
  );
}

/**
 * An independent model built from the spec predicates: enumerate every
 * quarter-hour wall time in the owner's zone, then keep the ones that fall on
 * a working day, fit the working hours, lie in the future and window, and do
 * not overlap a booking. It deliberately does not reuse the production
 * window, grid, or overlap helpers.
 */
function bruteForceSlots(input: ComputeSlotsInput): Slot[] {
  const { now, owner, durationMinutes, occupied } = input;
  const timeZone = owner.timeZone;
  const today = now.toZonedDateTimeISO(timeZone).toPlainDate();
  const windowStart = today.toZonedDateTime({ timeZone }).toInstant();
  const windowEndDate = today.add({ days: BOOKING_HORIZON_DAYS });
  const windowEnd = windowEndDate.toZonedDateTime({ timeZone }).toInstant();
  const slots: Slot[] = [];

  for (let offset = 0; offset < BOOKING_HORIZON_DAYS; offset += 1) {
    const date = today.add({ days: offset });

    if (!owner.workingDays.includes(date.dayOfWeek)) {
      continue;
    }

    const dayEnd = date
      .toZonedDateTime({ timeZone, plainTime: owner.workingHours.end })
      .toInstant();

    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 15, 30, 45]) {
        const slotPlainTime = Temporal.PlainTime.from({ hour, minute });
        const localStart = date.toZonedDateTime({ timeZone, plainTime: slotPlainTime });
        const start = localStart.toInstant();
        const end = start.add({ minutes: durationMinutes });

        if (Temporal.PlainTime.compare(localStart.toPlainTime(), owner.workingHours.start) < 0) {
          continue;
        }

        if (Temporal.Instant.compare(start, now) <= 0) {
          continue;
        }

        if (Temporal.Instant.compare(start, windowStart) < 0) {
          continue;
        }

        if (Temporal.Instant.compare(start, windowEnd) >= 0) {
          continue;
        }

        if (Temporal.Instant.compare(end, dayEnd) > 0) {
          continue;
        }

        const isOccupied = occupied.some(
          (interval) =>
            Temporal.Instant.compare(start, interval.end) < 0 &&
            Temporal.Instant.compare(end, interval.start) > 0,
        );

        if (!isOccupied) {
          slots.push({ start, end });
        }
      }
    }
  }

  return slots;
}

describe("bookable slot", () => {
  const now = instant("2026-01-05T10:00:00Z");

  it("accepts every slot the engine generates", () => {
    const slots = compute(now, 30);

    for (const slot of slots) {
      const bookable = bookableSlot({
        now,
        owner: weekdayOwner(),
        durationMinutes: 30,
        start: slot.start,
      });

      expect(bookable).toEqual(slot);
    }
  });

  it("rejects a start in the past", () => {
    const bookable = bookableSlot({
      now,
      owner: weekdayOwner(),
      durationMinutes: 15,
      start: instant("2026-01-05T09:45:00Z"),
    });

    expect(bookable).toBeUndefined();
  });

  it("rejects a start off the fifteen-minute grid", () => {
    const bookable = bookableSlot({
      now,
      owner: weekdayOwner(),
      durationMinutes: 15,
      start: instant("2026-01-06T07:05:00Z"),
    });

    expect(bookable).toBeUndefined();
  });

  it("anchors the first slot to a local quarter-hour, not the working-day start", () => {
    const owner = weekdayOwner({
      workingHours: { start: plainTime("10:07"), end: plainTime("18:00") },
    });
    const slots = compute(instant("2026-01-05T00:00:00Z"), 15, [], owner);
    const first = slots.at(0);
    const firstLocal = first?.start.toZonedDateTimeISO(MOSCOW).toPlainTime();

    expect(firstLocal?.toString()).toBe("10:15:00");
  });

  it("rejects a non-quarter-hour start even when the working day begins then", () => {
    const owner = weekdayOwner({
      workingHours: { start: plainTime("10:07"), end: plainTime("18:00") },
    });
    const offGrid = bookableSlot({
      now,
      owner,
      durationMinutes: 15,
      start: instant("2026-01-06T07:07:00Z"),
    });
    const onGrid = bookableSlot({
      now,
      owner,
      durationMinutes: 15,
      start: instant("2026-01-06T07:15:00Z"),
    });

    expect(offGrid).toBeUndefined();
    expect(onGrid).toBeDefined();
  });

  it("rejects a start that does not fit before the working day ends", () => {
    const bookable = bookableSlot({
      now,
      owner: weekdayOwner(),
      durationMinutes: 30,
      start: instant("2026-01-06T14:45:00Z"),
    });

    expect(bookable).toBeUndefined();
  });
});

// Each property runs 100 cases of a CPU-heavy pure calculation. The parallel
// suite can starve a worker, so give these two cases room beyond the default.
const PROPERTY_TIMEOUT_MS = 15_000;

describe("slot engine properties", () => {
  it(
    "stays inside the booking window and working day, on the grid, and clear of bookings",
    () => {
      assert(
        property(
          arbitraryInstant(),
          arbitraryDurationMinutes(),
          arbitraryOccupied(),
          (now, durationMinutes, occupied) => {
            const input: ComputeSlotsInput = {
              now,
              owner: weekdayOwner(),
              durationMinutes,
              occupied,
            };
            const result = computeSlots(input);
            const nowInsideWindowStart = Temporal.Instant.compare(now, result.window.start) >= 0;
            const nowBeforeWindowEnd = Temporal.Instant.compare(now, result.window.end) < 0;
            const windowStartBeforeEnd =
              Temporal.Instant.compare(result.window.start, result.window.end) < 0;

            expect(nowInsideWindowStart).toBe(true);
            expect(nowBeforeWindowEnd).toBe(true);
            expect(windowStartBeforeEnd).toBe(true);

            for (const slot of result.slots) {
              const startsInFuture = Temporal.Instant.compare(slot.start, now) > 0;
              const startsInWindow = Temporal.Instant.compare(slot.start, result.window.start) >= 0;
              const endsInWindow = Temporal.Instant.compare(slot.end, result.window.end) <= 0;
              const slotDuration = slot.end.since(slot.start).total("minutes");

              expect(startsInFuture).toBe(true);
              expect(startsInWindow).toBe(true);
              expect(endsInWindow).toBe(true);
              expect(slotDuration).toBe(durationMinutes);

              const local = slot.start.toZonedDateTimeISO(input.owner.timeZone);
              expect(input.owner.workingDays).toContain(local.dayOfWeek);

              const dayWindow = localTimeWindow(
                local.toPlainDate(),
                input.owner.timeZone,
                input.owner.workingHours,
              );

              const startsInsideWorkingDay =
                Temporal.Instant.compare(slot.start, dayWindow.start) >= 0;
              const endsInsideWorkingDay = Temporal.Instant.compare(slot.end, dayWindow.end) <= 0;
              const minuteOffset = local.minute % SLOT_STEP_MINUTES;
              const hasSubMinutePart =
                local.second !== 0 || local.millisecond !== 0 || local.microsecond !== 0;

              expect(startsInsideWorkingDay).toBe(true);
              expect(endsInsideWorkingDay).toBe(true);
              expect(minuteOffset).toBe(0);
              expect(hasSubMinutePart).toBe(false);

              for (const interval of input.occupied) {
                const overlaps =
                  Temporal.Instant.compare(slot.start, interval.end) < 0 &&
                  Temporal.Instant.compare(slot.end, interval.start) > 0;

                expect(overlaps).toBe(false);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    PROPERTY_TIMEOUT_MS,
  );

  it(
    "agrees with a brute-force model",
    () => {
      assert(
        property(
          arbitraryInstant(),
          arbitraryDurationMinutes(),
          arbitraryOccupied(),
          (now, durationMinutes, occupied) => {
            const input: ComputeSlotsInput = {
              now,
              owner: weekdayOwner(),
              durationMinutes,
              occupied,
            };
            const actual = computeSlots(input).slots;
            const model = bruteForceSlots(input);

            expect(actual).toEqual(model);
          },
        ),
        { numRuns: 100 },
      );
    },
    PROPERTY_TIMEOUT_MS,
  );
});

// Guard against accidentally regenerating a fixed window: the engine's window
// must slide with the injected instant.
describe("slot engine window", () => {
  it("slides by a day when the clock does", () => {
    const first = computeSlots({
      now: instant("2026-01-05T10:00:00Z"),
      owner: weekdayOwner(),
      durationMinutes: 15,
      occupied: [],
    });
    const second = computeSlots({
      now: instant("2026-01-06T10:00:00Z"),
      owner: weekdayOwner(),
      durationMinutes: 15,
      occupied: [],
    });

    expect(second.window.start.toString()).toBe("2026-01-05T21:00:00Z");
    expect(first.window.start.toString()).toBe("2026-01-04T21:00:00Z");
  });
});
