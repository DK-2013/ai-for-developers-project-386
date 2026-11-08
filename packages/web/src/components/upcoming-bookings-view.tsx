import type { Booking } from "@calendar/sdk";
import { formatSlotDay, formatSlotTime } from "../lib/slots";

export type UpcomingBookingsViewProps =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; bookings: Booking[]; timeZone: string };

function BookingItem({ booking, timeZone }: { booking: Booking; timeZone: string }) {
  return (
    <li className="rounded-md border border-border p-4">
      <h2 className="text-lg font-semibold">{booking.meetingTypeName}</h2>
      <p className="mt-1">
        {formatSlotDay(booking.startAt, timeZone)}, {formatSlotTime(booking.startAt, timeZone)}–
        {formatSlotTime(booking.endAt, timeZone)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {booking.attendeeName}, {booking.attendeeEmail}
      </p>
    </li>
  );
}

export function UpcomingBookingsView(props: UpcomingBookingsViewProps) {
  if (props.status === "loading") {
    return <p className="mt-2 text-muted-foreground">Загрузка...</p>;
  }

  if (props.status === "error") {
    return <p className="mt-2 text-muted-foreground">Не удалось загрузить предстоящие встречи.</p>;
  }

  if (props.bookings.length === 0) {
    return <p className="mt-2 text-muted-foreground">Пока нет предстоящих встреч.</p>;
  }

  return (
    <ul className="mt-2 grid gap-4">
      {props.bookings.map((booking) => (
        <BookingItem key={booking.id} booking={booking} timeZone={props.timeZone} />
      ))}
    </ul>
  );
}
