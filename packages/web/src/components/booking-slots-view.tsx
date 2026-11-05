import type { Booking, MeetingType, Slot } from "@calendar/sdk";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatSlotDay, formatSlotTime, groupSlotsByDay } from "../lib/slots";

type MeetingTypeSummary = Pick<MeetingType, "name" | "durationMinutes">;

export type BookingFormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; booking: Booking }
  | { status: "error"; message: string };

export type BookingSlotsViewProps =
  | { status: "loading"; meetingType?: MeetingTypeSummary }
  | { status: "error"; meetingType?: MeetingTypeSummary; message: string }
  | {
      status: "ready";
      meetingType?: MeetingTypeSummary;
      timezone: string;
      guestTimeZone: string;
      slots: readonly Slot[];
      selectedSlot?: Slot;
      onSelectSlot?: (slot: Slot) => void;
      booking: BookingFormState;
      onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
    };

function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-4xl p-6">{children}</main>;
}

function MeetingTypeHeading({ meetingType }: { meetingType?: MeetingTypeSummary }) {
  if (meetingType === undefined) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-muted-foreground">
      {meetingType.name} · {meetingType.durationMinutes} мин
    </p>
  );
}

function SuccessContent({ booking, guestTimeZone }: { booking: Booking; guestTimeZone: string }) {
  return (
    <section
      aria-label="Подтверждение бронирования"
      className="mt-6 space-y-2 rounded-md border border-border p-4"
    >
      <h2 className="text-lg font-semibold">Вы записаны</h2>
      <p>
        {booking.meetingTypeName} · {formatSlotDay(booking.startAt, guestTimeZone)},{" "}
        {formatSlotTime(booking.startAt, guestTimeZone)}
      </p>
      <p className="text-sm text-muted-foreground">
        {booking.attendeeName}, {booking.attendeeEmail}
      </p>
    </section>
  );
}

function BookingForm({
  slot,
  guestTimeZone,
  state,
  onSubmit,
}: {
  slot: Slot;
  guestTimeZone: string;
  state: BookingFormState;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const submitting = state.status === "submitting";

  return (
    <form className="mt-6 grid gap-4 rounded-md border border-border p-4" onSubmit={onSubmit}>
      <p className="text-sm font-medium">
        Выбрано: {formatSlotDay(slot.startAt, guestTimeZone)},{" "}
        {formatSlotTime(slot.startAt, guestTimeZone)}
      </p>
      <label className="grid gap-1 text-sm font-medium">
        Имя
        <input
          className="rounded-md border border-border bg-background px-3 py-2"
          maxLength={200}
          name="attendeeName"
          required
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        E-mail
        <input
          className="rounded-md border border-border bg-background px-3 py-2"
          maxLength={254}
          name="attendeeEmail"
          required
          type="email"
        />
      </label>
      <button
        className="justify-self-start rounded-md border border-border bg-background px-4 py-2 hover:bg-muted disabled:opacity-50"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Бронирование..." : "Забронировать"}
      </button>
    </form>
  );
}

function SlotsContent({ props }: { props: Extract<BookingSlotsViewProps, { status: "ready" }> }) {
  if (props.booking.status === "success") {
    return <SuccessContent booking={props.booking.booking} guestTimeZone={props.guestTimeZone} />;
  }

  const groups = groupSlotsByDay(props.slots, props.guestTimeZone);

  return (
    <div className="mt-6 space-y-6">
      {props.booking.status === "error" ? (
        <p className="text-sm text-muted-foreground" role="alert">
          {props.booking.message}
        </p>
      ) : null}
      {props.selectedSlot ? (
        <BookingForm
          guestTimeZone={props.guestTimeZone}
          onSubmit={props.onSubmit}
          slot={props.selectedSlot}
          state={props.booking}
        />
      ) : null}
      {groups.length === 0 ? (
        <p className="text-muted-foreground">Нет свободных слотов в ближайшие 14 дней.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Время в вашем часовом поясе. Часовой пояс владельца: {props.timezone}.
          </p>
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="text-lg font-semibold capitalize">{group.heading}</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {group.slots.map((slot) => {
                  const selected = props.selectedSlot?.startAt.getTime() === slot.startAt.getTime();

                  return (
                    <li key={slot.startAt.toISOString()}>
                      <button
                        aria-pressed={selected}
                        className={
                          selected
                            ? "rounded-md border border-border bg-muted px-3 py-2 text-sm"
                            : "rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                        }
                        onClick={() => props.onSelectSlot?.(slot)}
                        type="button"
                      >
                        {formatSlotTime(slot.startAt, props.guestTimeZone)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

export function BookingSlotsView(props: BookingSlotsViewProps) {
  return (
    <Page>
      <h1 className="text-2xl font-bold">Выбор времени</h1>
      <MeetingTypeHeading meetingType={props.meetingType} />
      {props.status === "loading" ? (
        <p className="mt-6 text-muted-foreground">Загрузка...</p>
      ) : null}
      {props.status === "error" ? (
        <p className="mt-6 text-muted-foreground">{props.message}</p>
      ) : null}
      {props.status === "ready" ? <SlotsContent props={props} /> : null}
      <Link className="mt-6 inline-block underline" to="/">
        Назад к списку типов встреч
      </Link>
    </Page>
  );
}
