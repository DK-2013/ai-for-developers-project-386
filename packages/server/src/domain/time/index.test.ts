import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";
import { bookingWindow, localTimeWindow } from "./index.js";

const MOSCOW = "Europe/Moscow";
const NEW_YORK = "America/New_York";

function instant(value: string): Temporal.Instant {
  return Temporal.Instant.from(value);
}

describe("booking window", () => {
  it("spans fourteen owner-local days from midnight today", () => {
    const now = instant("2026-01-05T10:00:00Z");

    const window = bookingWindow(now, MOSCOW);

    expect(window.start.toString()).toBe("2026-01-04T21:00:00Z");
    expect(window.end.toString()).toBe("2026-01-18T21:00:00Z");
  });

  it("uses the owner zone to decide which day is today", () => {
    const now = instant("2026-01-04T22:30:00Z");

    const window = bookingWindow(now, MOSCOW);

    expect(window.start.toString()).toBe("2026-01-04T21:00:00Z");
    expect(window.end.toString()).toBe("2026-01-18T21:00:00Z");
  });

  it("keeps local midnights across a daylight-saving transition", () => {
    const now = instant("2026-03-08T12:00:00Z");

    const window = bookingWindow(now, NEW_YORK);

    expect(window.start.toString()).toBe("2026-03-08T05:00:00Z");
    expect(window.end.toString()).toBe("2026-03-22T04:00:00Z");
  });
});

describe("local time window", () => {
  it("projects owner-local working hours onto instants", () => {
    const date = Temporal.PlainDate.from("2026-01-05");

    const window = localTimeWindow(date, MOSCOW, {
      start: Temporal.PlainTime.from("10:00"),
      end: Temporal.PlainTime.from("18:00"),
    });

    expect(window.start.toString()).toBe("2026-01-05T07:00:00Z");
    expect(window.end.toString()).toBe("2026-01-05T15:00:00Z");
  });
});
