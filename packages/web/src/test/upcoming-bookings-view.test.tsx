import type { Booking } from "@calendar/sdk";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UpcomingBookingsView } from "../components/upcoming-bookings-view";

const bookings: Booking[] = [
  {
    id: "00000000-0000-4000-8000-000000000010",
    meetingTypeId: "00000000-0000-4000-8000-000000000001",
    meetingTypeName: "Знакомство",
    startAt: new Date("2026-01-06T07:00:00Z"),
    endAt: new Date("2026-01-06T07:30:00Z"),
    attendeeName: "Анна",
    attendeeEmail: "anna@example.com",
  },
  {
    id: "00000000-0000-4000-8000-000000000011",
    meetingTypeId: "00000000-0000-4000-8000-000000000002",
    meetingTypeName: "Разбор",
    startAt: new Date("2026-01-06T09:00:00Z"),
    endAt: new Date("2026-01-06T10:00:00Z"),
    attendeeName: "Борис",
    attendeeEmail: "boris@example.com",
  },
];

function renderView(props: Parameters<typeof UpcomingBookingsView>[0]): string {
  return renderToStaticMarkup(<UpcomingBookingsView {...props} />);
}

describe("upcoming bookings view", () => {
  it("shows a loading state", () => {
    const markup = renderView({ status: "loading" });

    expect(markup).toContain("Загрузка...");
  });

  it("shows an error state", () => {
    const markup = renderView({ status: "error" });

    expect(markup).toContain("Не удалось загрузить предстоящие встречи.");
  });

  it("shows an empty state when there are no upcoming bookings", () => {
    const markup = renderView({ status: "ready", bookings: [], timeZone: "Europe/Moscow" });

    expect(markup).toContain("Пока нет предстоящих встреч.");
  });

  it("lists the meeting type, time range, and guest details", () => {
    const markup = renderView({ status: "ready", bookings, timeZone: "Europe/Moscow" });

    expect(markup).toContain("Знакомство");
    expect(markup).toContain('<h2 class="text-lg font-semibold">Знакомство</h2>');
    expect(markup).toContain("вторник, 6 января");
    expect(markup).toContain("10:00–10:30");
    expect(markup).toContain("Анна");
    expect(markup).toContain("anna@example.com");
    expect(markup).toContain("Разбор");
    expect(markup).toContain("12:00–13:00");
    expect(markup).toContain("Борис");
    expect(markup).toContain("boris@example.com");
    expect(markup).not.toContain("Пока нет предстоящих встреч.");
  });
});
