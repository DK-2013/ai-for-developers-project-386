import { useQuery } from "@tanstack/react-query";
import { bookingsQuery } from "../api/queries";
import { UpcomingBookingsView } from "../components/upcoming-bookings-view";
import { detectBrowserTimeZone } from "../lib/slots";

export function OwnerBookingsPage() {
  const bookingsResult = useQuery(bookingsQuery);
  const timeZone = detectBrowserTimeZone();

  return (
    <section className="mt-6">
      <h1 className="text-2xl font-bold">Предстоящие встречи</h1>
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
  );
}
