import type { Slot } from "@calendar/sdk";
import { describe, expect, it } from "vitest";
import { formatSlotTime, groupSlotsByDay } from "../lib/slots";

function slot(startAt: string, minutes: number): Slot {
  const start = new Date(startAt);
  const end = new Date(start.getTime() + minutes * 60_000);

  return { startAt: start, endAt: end };
}

describe("guest slot formatting", () => {
  it("groups slots by the guest calendar day", () => {
    const slots = [slot("2026-01-05T16:00:00Z", 15), slot("2026-01-05T07:00:00Z", 15)];

    const groups = groupSlotsByDay(slots, "Asia/Tokyo");

    expect(groups.map((group) => group.key)).toEqual(["2026-01-05", "2026-01-06"]);
    expect(groups.map((group) => group.slots.length)).toEqual([1, 1]);
    expect(groups.at(0)?.heading).toBe("понедельник, 5 января");
    expect(groups.at(1)?.heading).toBe("вторник, 6 января");
  });

  it("sorts slots inside a day by start instant", () => {
    const slots = [
      slot("2026-01-05T10:00:00Z", 30),
      slot("2026-01-05T07:00:00Z", 15),
      slot("2026-01-05T08:30:00Z", 45),
    ];

    const groups = groupSlotsByDay(slots, "Europe/Moscow");
    const starts = groups.at(0)?.slots.map((item) => item.startAt.toISOString());

    expect(starts).toEqual([
      "2026-01-05T07:00:00.000Z",
      "2026-01-05T08:30:00.000Z",
      "2026-01-05T10:00:00.000Z",
    ]);
  });

  it("formats a start in the requested zone", () => {
    const date = new Date("2026-01-05T07:00:00Z");

    expect(formatSlotTime(date, "Asia/Tokyo")).toBe("16:00");
    expect(formatSlotTime(date, "Europe/Moscow")).toBe("10:00");
  });
});
