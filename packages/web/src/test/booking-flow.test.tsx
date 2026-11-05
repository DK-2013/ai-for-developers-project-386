import type { Booking, Slot } from "@calendar/sdk";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BookingSlotsView, type BookingSlotsViewProps } from "../components/booking-slots-view";

const slots: Slot[] = [
  { startAt: new Date("2026-01-05T07:00:00Z"), endAt: new Date("2026-01-05T07:15:00Z") },
  { startAt: new Date("2026-01-05T07:15:00Z"), endAt: new Date("2026-01-05T07:30:00Z") },
];

const booking: Booking = {
  id: "00000000-0000-4000-8000-000000000010",
  meetingTypeId: "00000000-0000-4000-8000-000000000001",
  meetingTypeName: "Знакомство",
  startAt: new Date("2026-01-05T07:00:00Z"),
  endAt: new Date("2026-01-05T07:15:00Z"),
  attendeeName: "Гость",
  attendeeEmail: "guest@example.com",
};

type ReadyProps = Extract<BookingSlotsViewProps, { status: "ready" }>;

function renderView(overrides: Partial<ReadyProps> = {}): string {
  const props: ReadyProps = {
    status: "ready",
    meetingType: { name: "Знакомство", durationMinutes: 15 },
    timezone: "Europe/Moscow",
    guestTimeZone: "Asia/Tokyo",
    slots,
    booking: { status: "idle" },
    onSelectSlot: () => {},
    onSubmit: () => {},
    ...overrides,
  };

  return renderToStaticMarkup(
    <MemoryRouter>
      <BookingSlotsView {...props} />
    </MemoryRouter>,
  );
}

describe("booking flow", () => {
  it("offers free slots as selectable buttons before a slot is chosen", () => {
    const markup = renderView();

    expect(markup).toContain("16:00");
    expect(markup).toContain("16:15");
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).not.toContain('name="attendeeName"');
  });

  it("shows the name and email form for the selected slot", () => {
    const markup = renderView({ selectedSlot: slots[0] });

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('name="attendeeName"');
    expect(markup).toContain('maxLength="200"');
    expect(markup).toContain('name="attendeeEmail"');
    expect(markup).toContain('type="email"');
    expect(markup).toContain('maxLength="254"');
    expect(markup).toContain("Забронировать");
  });

  it("disables the submit button while submitting", () => {
    const markup = renderView({
      selectedSlot: slots[0],
      booking: { status: "submitting" },
    });

    expect(markup).toContain("disabled");
    expect(markup).toContain("Бронирование...");
  });

  it("shows a clear conflict message", () => {
    const markup = renderView({
      booking: {
        status: "error",
        message: "Это время уже занято. Пожалуйста, выберите другой слот.",
      },
    });

    expect(markup).toContain("Это время уже занято. Пожалуйста, выберите другой слот.");
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("16:00");
  });

  it("shows the successful booking instead of the form", () => {
    const markup = renderView({ booking: { status: "success", booking } });

    expect(markup).toContain("Вы записаны");
    expect(markup).toContain("Знакомство");
    expect(markup).toContain("16:00");
    expect(markup).toContain("Гость");
    expect(markup).toContain("guest@example.com");
    expect(markup).not.toContain('name="attendeeName"');
    expect(markup).not.toContain('aria-pressed="false"');
  });
});
