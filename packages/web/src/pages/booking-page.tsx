import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { meetingTypesQuery, slotsQuery } from "../api/queries";
import { BookingSlotsView } from "../components/booking-slots-view";
import { detectGuestTimeZone } from "../lib/slots";

type BookingPageProps = {
  guestTimeZone?: string;
};

export function BookingPage({ guestTimeZone = detectGuestTimeZone() }: BookingPageProps = {}) {
  const { id } = useParams();
  const meetingTypesResult = useQuery(meetingTypesQuery);
  const slotsResult = useQuery({
    ...slotsQuery(id ?? ""),
    enabled: id !== undefined,
  });

  const meetingType = meetingTypesResult.data?.meetingTypes.find((item) => item.id === id);
  const meetingTypeSummary =
    meetingType === undefined
      ? undefined
      : { name: meetingType.name, durationMinutes: meetingType.durationMinutes };

  if (meetingTypesResult.isLoading || slotsResult.isLoading) {
    return <BookingSlotsView status="loading" meetingType={meetingTypeSummary} />;
  }

  if (meetingTypesResult.isError || slotsResult.isError) {
    return (
      <BookingSlotsView
        status="error"
        meetingType={meetingTypeSummary}
        message="Не удалось загрузить свободные слоты."
      />
    );
  }

  if (meetingType === undefined) {
    return <BookingSlotsView status="error" message="Тип встречи не найден." />;
  }

  const slots = slotsResult.data;

  if (slots === undefined || !("slots" in slots)) {
    return (
      <BookingSlotsView
        status="error"
        meetingType={meetingTypeSummary}
        message="Не удалось загрузить свободные слоты."
      />
    );
  }

  return (
    <BookingSlotsView
      status="ready"
      meetingType={meetingTypeSummary}
      timezone={slots.timezone}
      guestTimeZone={guestTimeZone}
      slots={slots.slots}
    />
  );
}
