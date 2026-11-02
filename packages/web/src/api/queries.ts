import { CallCalendarClient } from "@calendar/sdk";
import { queryOptions } from "@tanstack/react-query";

const client = new CallCalendarClient({ endpoint: "/api" });

export const meetingTypesQuery = queryOptions({
  queryKey: ["meeting-types"],
  queryFn: () => client.listMeetingTypes(),
});
