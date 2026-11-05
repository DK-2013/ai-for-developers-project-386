import type { Slot } from "@calendar/sdk";

type SlotDayGroup = {
  key: string;
  heading: string;
  slots: Slot[];
};

const dateKeyFormat = (timeZone: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const dayFormat = (timeZone: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const timeFormat = (timeZone: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

function dateKey(date: Date, format: Intl.DateTimeFormat): string {
  const parts = format.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * Groups slots by the guest's calendar day. The owner's zone fixes the grid;
 * only the displayed day and time follow the guest's zone.
 */
export function groupSlotsByDay(slots: readonly Slot[], timeZone: string): SlotDayGroup[] {
  const keyFormat = dateKeyFormat(timeZone);
  const headingFormat = dayFormat(timeZone);
  const groups = new Map<string, Slot[]>();

  for (const slot of slots) {
    const key = dateKey(slot.startAt, keyFormat);
    const group = groups.get(key);

    if (group === undefined) {
      groups.set(key, [slot]);
    } else {
      group.push(slot);
    }
  }

  return [...groups.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([key, groupSlots]) => {
      const sorted = groupSlots.toSorted(
        (left, right) => left.startAt.getTime() - right.startAt.getTime(),
      );
      const first = sorted.at(0);

      if (first === undefined) {
        throw new Error("Group slots: empty group");
      }

      return { key, heading: headingFormat.format(first.startAt), slots: sorted };
    });
}

/** Formats a slot's start in the guest's browser time zone. */
export function formatSlotTime(date: Date, timeZone: string): string {
  return timeFormat(timeZone).format(date);
}

/** Formats a slot's guest-local calendar day. */
export function formatSlotDay(date: Date, timeZone: string): string {
  return dayFormat(timeZone).format(date);
}

/** The browser's IANA time zone, falling back to UTC outside a browser. */
export function detectBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
