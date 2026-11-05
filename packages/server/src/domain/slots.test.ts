import { Temporal } from "temporal-polyfill";
import { array, assert, integer, property, record, type Arbitrary } from "fast-check";
import { describe, expect, it } from "vitest";
import type { OwnerConfig } from "../config.js";
import { BOOKING_HORIZON_DAYS, SLOT_STEP_MINUTES } from "./booking-rules.js";
import { computeSlots, type ComputeSlotsInput, type InstantInterval, type Slot } from "./slots.js";
import { localTimeWindow } from "./time/index.js";

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
      expect(local.minute % SLOT_STEP_MINUTES).toBe(0);
      expect(
        Temporal.PlainTime.compare(local.toPlainTime(), plainTime("10:00")),
      ).toBeGreaterThanOrEqual(0);
      expect(Temporal.PlainTime.compare(local.toPlainTime(), plainTime("18:00"))).toBeLessThan(0);
    }

    for (let index = 1; index < slots.length; index += 1) {
      const previous = slots[index - 1];
      const current = slots[index];

      if (previous === undefined || current === undefined) {
        throw new Error("Missing slot");
      }

      const gap = current.start.since(previous.start);

      expect(gap.minutes % SLOT_STEP_MINUTES).toBe(0);
    }
  });

  it("only offers owner working days", () => {
    const slots = compute(instant("2026-01-05T06:00:00Z"), 15);
    const days = new Set(slots.map((slot) => localTimeOf(slot).dayOfWeek));

    expect([...days].toSorted()).toEqual([1, 2, 3, 4, 5]);
  });

  it("uses configured working days and hours", () => {
    const owner = weekdayOwner({
      workingHours: { start: plainTime("09:00"), end: plainTime("11:00") },
      workingDays: [1, 3],
    });

    const slots = compute(instant("2026-01-05T00:00:00Z"), 15, [], owner);
    const localTimes = slots.map((slot) => localTimeOf(slot).toString());

    expect(localTimes.at(0)).toBe("2026-01-05T09:00:00");
    expect(localTimes.at(-1)).toBe("2026-01-14T10:45:00");
    expect(new Set(slots.map((slot) => localTimeOf(slot).dayOfWeek))).toEqual(new Set([1, 3]));
  });

  it("keeps every meeting inside the working day for 30-minute types", () => {
    const slots = compute(instant("2026-01-05T06:00:00Z"), 30);
    const firstDay = slots.filter(
      (slot) => localTimeOf(slot).toPlainDate().toString() === "2026-01-05",
    );
    const last = firstDay.at(-1);

    expect(last?.start.toString()).toBe("2026-01-05T14:30:00Z");
    expect(last?.end.toString()).toBe("2026-01-05T15:00:00Z");
    expect(last?.end.since(last.start).total("minutes")).toBe(30);
  });

  it("keeps every meeting inside the working day for 45-minute types", () => {
    const slots = compute(instant("2026-01-05T06:00:00Z"), 45);
    const firstDay = slots.filter(
      (slot) => localTimeOf(slot).toPlainDate().toString() === "2026-01-05",
    );
    const last = firstDay.at(-1);

    expect(last?.start.toString()).toBe("2026-01-05T14:15:00Z");
    expect(last?.end.toString()).toBe("2026-01-05T15:00:00Z");
    expect(last?.end.since(last.start).total("minutes")).toBe(45);
  });

  it("keeps 30- and 45-minute ends on the fifteen-minute grid", () => {
    for (const durationMinutes of [30, 45]) {
      const slots = compute(instant("2026-01-05T06:00:00Z"), durationMinutes);

      for (const slot of slots) {
        const end = slot.end.toZonedDateTimeISO(MOSCOW).toPlainDateTime();

        expect(end.minute % SLOT_STEP_MINUTES).toBe(0);
        expect(slot.end.since(slot.start).total("minutes")).toBe(durationMinutes);
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

function bruteForceSlots(input: ComputeSlotsInput): Slot[] {
  const today = input.now.toZonedDateTimeISO(input.owner.timeZone).toPlainDate();
  const slots: Slot[] = [];

  for (let offset = 0; offset < BOOKING_HORIZON_DAYS; offset += 1) {
    const date = today.add({ days: offset });

    if (!input.owner.workingDays.includes(date.dayOfWeek)) {
      continue;
    }

    const window = localTimeWindow(date, input.owner.timeZone, input.owner.workingHours);
    let start = window.start;

    while (
      Temporal.Instant.compare(start.add({ minutes: input.durationMinutes }), window.end) <= 0
    ) {
      const end = start.add({ minutes: input.durationMinutes });
      const inFuture = Temporal.Instant.compare(start, input.now) > 0;
      const overlaps = input.occupied.some(
        (interval) =>
          Temporal.Instant.compare(start, interval.end) < 0 &&
          Temporal.Instant.compare(end, interval.start) > 0,
      );

      if (inFuture && !overlaps) {
        slots.push({ start, end });
      }

      start = start.add({ minutes: SLOT_STEP_MINUTES });
    }
  }

  return slots;
}

describe("slot engine properties", () => {
  it("stays inside the booking window and working day, on the grid, and clear of bookings", () => {
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

          expect(Temporal.Instant.compare(now, result.window.start)).toBeGreaterThanOrEqual(0);
          expect(Temporal.Instant.compare(now, result.window.end)).toBeLessThan(0);
          expect(Temporal.Instant.compare(result.window.start, result.window.end)).toBeLessThan(0);

          for (const slot of result.slots) {
            expect(Temporal.Instant.compare(slot.start, now)).toBeGreaterThan(0);
            expect(
              Temporal.Instant.compare(slot.start, result.window.start),
            ).toBeGreaterThanOrEqual(0);
            expect(Temporal.Instant.compare(slot.end, result.window.end)).toBeLessThanOrEqual(0);
            expect(slot.end.since(slot.start).total("minutes")).toBe(durationMinutes);

            const local = slot.start.toZonedDateTimeISO(input.owner.timeZone);
            expect(input.owner.workingDays).toContain(local.dayOfWeek);

            const dayWindow = localTimeWindow(
              local.toPlainDate(),
              input.owner.timeZone,
              input.owner.workingHours,
            );

            expect(Temporal.Instant.compare(slot.start, dayWindow.start)).toBeGreaterThanOrEqual(0);
            expect(Temporal.Instant.compare(slot.end, dayWindow.end)).toBeLessThanOrEqual(0);
            expect(slot.start.since(dayWindow.start).total("minutes") % SLOT_STEP_MINUTES).toBe(0);

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
  });

  it("agrees with a brute-force model", () => {
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

          expect(computeSlots(input).slots).toEqual(bruteForceSlots(input));
        },
      ),
      { numRuns: 100 },
    );
  });
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
