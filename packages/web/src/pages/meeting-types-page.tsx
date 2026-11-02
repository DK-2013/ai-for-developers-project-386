import { useQuery } from "@tanstack/react-query";
import { meetingTypesQuery } from "../api/queries";
import { MeetingTypesView } from "../components/meeting-types-view";

export function MeetingTypesPage() {
  const { data, isLoading, isError } = useQuery(meetingTypesQuery);

  if (isLoading) {
    return <MeetingTypesView status="loading" />;
  }

  if (isError) {
    return <MeetingTypesView status="error" />;
  }

  const meetingTypes = data?.meetingTypes ?? [];

  return <MeetingTypesView status="ready" meetingTypes={meetingTypes} />;
}
