import { CallCalendarClient } from "@calendar/sdk";
import { queryOptions } from "@tanstack/react-query";

export const apiClient = new CallCalendarClient({ endpoint: "/api" });

export const meetingTypesQuery = queryOptions({
  queryKey: ["meeting-types"],
  queryFn: () => apiClient.listMeetingTypes(),
});
