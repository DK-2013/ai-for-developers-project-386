import type { BookingList } from "@calendar/sdk";
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

describe("web smoke test", () => {
  it("renders the public page", () => {
    const markup = renderApp("/");

    expect(markup).toContain("Календарь звонков");
    expect(markup).toContain('href="/owner"');
  });

  it("renders the creation form on the meeting-types page", () => {
    const markup = renderApp("/owner/meeting-types");

    expect(markup).toContain("Новый тип встречи");
    expect(markup).toContain('name="name"');
    expect(markup).toContain('name="durationMinutes"');
    expect(markup).toContain("Создать тип встречи");
  });

  it("renders the upcoming bookings list in the owner cabinet", () => {
    const markup = renderApp("/owner", createQueryClient(undefined, undefined, bookings));

    expect(markup).toContain("Предстоящие встречи");
    expect(markup).toContain("Знакомство");
    expect(markup).toContain("Анна");
    expect(markup).toContain("anna@example.com");
    expect(markup).not.toContain("Пока нет предстоящих встреч.");
  });
});
