import { useQuery } from "@tanstack/react-query";
import { bookingsQuery } from "../api/queries";
import { MeetingTypeForm } from "../components/meeting-type-form";
import { UpcomingBookingsView } from "../components/upcoming-bookings-view";
import { detectGuestTimeZone } from "../lib/slots";

export function OwnerPage() {
  const bookingsResult = useQuery(bookingsQuery);
  const timeZone = detectGuestTimeZone();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Личный кабинет</h1>
      <p className="mt-2 text-muted-foreground">
        Создавайте типы встреч и следите за предстоящими звонками.
      </p>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Предстоящие встречи</h2>
        {bookingsResult.isLoading ? <UpcomingBookingsView status="loading" /> : null}
        {bookingsResult.isError ? <UpcomingBookingsView status="error" /> : null}
        {bookingsResult.data ? (
          <UpcomingBookingsView
            status="ready"
            bookings={bookingsResult.data.bookings}
            timeZone={timeZone}
          />
        ) : null}
      </section>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Новый тип встречи</h2>
        <MeetingTypeForm />
      </section>
    </main>
  );
}
