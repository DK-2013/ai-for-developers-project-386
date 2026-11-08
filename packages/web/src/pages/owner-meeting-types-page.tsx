import { useQuery } from "@tanstack/react-query";
import { meetingTypesQuery } from "../api/queries";
import { MeetingTypeForm } from "../components/meeting-type-form";
import { OwnerMeetingTypesView } from "../components/owner-meeting-types-view";

export function OwnerMeetingTypesPage() {
  const { data, isLoading, isError } = useQuery(meetingTypesQuery);

  return (
    <>
      <section className="mt-6">
        <h1 className="text-2xl font-bold">Типы встреч</h1>
        {isLoading ? <OwnerMeetingTypesView status="loading" /> : null}
        {isError ? <OwnerMeetingTypesView status="error" /> : null}
        {data ? <OwnerMeetingTypesView status="ready" meetingTypes={data.meetingTypes} /> : null}
      </section>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Новый тип встречи</h2>
        <MeetingTypeForm />
      </section>
    </>
  );
}
