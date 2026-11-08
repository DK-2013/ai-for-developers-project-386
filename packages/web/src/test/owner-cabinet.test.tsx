import type { BookingList, MeetingTypeList } from "@calendar/sdk";
import { describe, expect, it } from "vitest";
import { createQueryClient, renderApp } from "./render-app";

const bookings: BookingList = {
  bookings: [
    {
      id: "00000000-0000-4000-8000-000000000010",
      meetingTypeId: "00000000-0000-4000-8000-000000000001",
      meetingTypeName: "Знакомство",
      startAt: new Date("2026-01-06T07:00:00Z"),
      endAt: new Date("2026-01-06T07:30:00Z"),
      attendeeName: "Анна",
      attendeeEmail: "anna@example.com",
    },
  ],
};

const meetingTypes: MeetingTypeList = {
  meetingTypes: [
    { id: "intro", name: "Знакомство", description: "Первый звонок", durationMinutes: 30 },
    { id: "deep-dive", name: "Разбор", durationMinutes: 60 },
  ],
};

describe("owner cabinet", () => {
  it("renders the upcoming bookings section at /owner", () => {
    const markup = renderApp("/owner", createQueryClient(undefined, undefined, bookings));

    expect(markup).toContain('<h1 class="text-2xl font-bold">Предстоящие встречи</h1>');
    expect(markup).toContain("Знакомство");
    expect(markup).toContain("Анна");
    expect(markup).not.toContain("Личный кабинет</h1>");
    expect(markup).not.toContain("Создавайте типы встреч и следите за предстоящими звонками.");
  });

  it("marks the active tab and the cabinet header link at /owner", () => {
    const markup = renderApp("/owner", createQueryClient(undefined, undefined, bookings));

    expect(markup).toContain('href="/owner/meeting-types"');
    expect(markup).toMatch(/<a [^>]*aria-current="page"[^>]*href="\/owner"[^>]*>Встречи<\/a>/);
    expect(markup).toMatch(
      /<a [^>]*aria-current="page"[^>]*href="\/owner"[^>]*>Личный кабинет<\/a>/,
    );
    expect(markup).not.toMatch(
      /<a [^>]*aria-current="page"[^>]*href="\/"[^>]*>Календарь звонков<\/a>/,
    );
  });

  it("renders the meeting-type list and creation form at /owner/meeting-types", () => {
    const markup = renderApp("/owner/meeting-types", createQueryClient(meetingTypes));

    expect(markup).toContain('<h1 class="text-2xl font-bold">Типы встреч</h1>');
    expect(markup).toContain("Знакомство");
    expect(markup).toContain("Первый звонок");
    expect(markup).toContain("30 мин");
    expect(markup).toContain("Разбор");
    expect(markup).toContain("60 мин");
    expect(markup).toContain('name="name"');
    expect(markup).toContain("Создать тип встречи");
    expect(markup).not.toContain('href="/book/');
    expect(markup.indexOf("Знакомство")).toBeLessThan(markup.indexOf("Разбор"));
  });

  it("marks the meeting-types tab and the cabinet header link as current", () => {
    const markup = renderApp("/owner/meeting-types", createQueryClient(meetingTypes));

    expect(markup).toMatch(
      /<a [^>]*aria-current="page"[^>]*href="\/owner\/meeting-types"[^>]*>Типы встреч<\/a>/,
    );
    expect(markup).toMatch(
      /<a [^>]*aria-current="page"[^>]*href="\/owner"[^>]*>Личный кабинет<\/a>/,
    );
    expect(markup).not.toMatch(/<a [^>]*aria-current="page"[^>]*href="\/owner"[^>]*>Встречи<\/a>/);
  });

  it("shows the empty state when the owner has no meeting types", () => {
    const markup = renderApp("/owner/meeting-types", createQueryClient({ meetingTypes: [] }));

    expect(markup).toContain("Пока нет типов встреч.");
    expect(markup).toContain("Создать тип встречи");
  });
});
