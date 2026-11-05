import type { MeetingTypeList, SlotList } from "@calendar/sdk";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { slotsQuery } from "../api/queries";
import { BookingPage } from "../pages/booking-page";
import { createQueryClient } from "./render-app";

const meetingTypes: MeetingTypeList = {
  meetingTypes: [{ id: "intro", name: "Знакомство", durationMinutes: 30 }],
};

function slotList(slots: SlotList["slots"]): SlotList {
  return {
    timezone: "Europe/Moscow",
    windowStart: new Date("2026-01-04T21:00:00Z"),
    windowEnd: new Date("2026-01-18T21:00:00Z"),
    slots,
  };
}

function renderPage(slots: SlotList, guestTimeZone: string = "Asia/Tokyo"): string {
  const queryClient = createQueryClient(meetingTypes, { meetingTypeId: "intro", slots });

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/book/intro"]}>
        <Routes>
          <Route path="/book/:id" element={<BookingPage guestTimeZone={guestTimeZone} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("booking page", () => {
  it("shows slots in the guest browser zone and the owner zone as reference", () => {
    const markup = renderPage(
      slotList([
        { startAt: new Date("2026-01-05T07:00:00Z"), endAt: new Date("2026-01-05T07:30:00Z") },
        { startAt: new Date("2026-01-05T10:00:00Z"), endAt: new Date("2026-01-05T10:30:00Z") },
      ]),
    );

    expect(markup).toContain("Выбор времени");
    expect(markup).toContain("Знакомство");
    expect(markup).toContain("30 мин");
    expect(markup).toContain("Europe/Moscow");
    expect(markup).toContain("16:00");
    expect(markup).toContain("19:00");
    expect(markup).toContain("понедельник, 5 января");
  });

  it("groups slots into guest-local calendar days", () => {
    const markup = renderPage(
      slotList([
        { startAt: new Date("2026-01-05T07:00:00Z"), endAt: new Date("2026-01-05T07:30:00Z") },
        { startAt: new Date("2026-01-05T16:00:00Z"), endAt: new Date("2026-01-05T16:30:00Z") },
      ]),
    );

    expect(markup).toContain("понедельник, 5 января");
    expect(markup).toContain("вторник, 6 января");
    expect(markup).toContain("01:00");
  });

  it("shows an empty state when the window has no free slots", () => {
    const markup = renderPage(slotList([]));

    expect(markup).toContain("Нет свободных слотов в ближайшие 14 дней.");
  });

  it("shows the API error when slots cannot be loaded", () => {
    const queryClient = createQueryClient(meetingTypes, {
      meetingTypeId: "intro",
      slots: {
        code: "meeting_type_not_found",
        message: "Meeting type not found",
      },
    });

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/book/intro"]}>
          <Routes>
            <Route path="/book/:id" element={<BookingPage guestTimeZone="Asia/Tokyo" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(markup).toContain("Не удалось загрузить свободные слоты.");
  });

  it("shows a not-found message for an unknown meeting type", () => {
    const queryClient = createQueryClient(meetingTypes);
    queryClient.setQueryData(slotsQuery("unknown").queryKey, slotList([]));

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/book/unknown"]}>
          <Routes>
            <Route path="/book/:id" element={<BookingPage guestTimeZone="Asia/Tokyo" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(markup).toContain("Тип встречи не найден.");
  });
});
