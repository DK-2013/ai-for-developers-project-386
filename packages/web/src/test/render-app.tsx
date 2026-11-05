import type { ApiError, BookingList, MeetingTypeList, SlotList } from "@calendar/sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { App } from "../app";
import { bookingsQuery, meetingTypesQuery, slotsQuery } from "../api/queries";

type SlotsSeed = {
  meetingTypeId: string;
  slots: SlotList | ApiError;
};

export function createQueryClient(
  seed?: MeetingTypeList,
  slotsSeed?: SlotsSeed,
  bookingsSeed?: BookingList,
): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  if (seed) {
    queryClient.setQueryData(meetingTypesQuery.queryKey, seed);
  }

  if (slotsSeed) {
    queryClient.setQueryData(slotsQuery(slotsSeed.meetingTypeId).queryKey, slotsSeed.slots);
  }

  if (bookingsSeed) {
    queryClient.setQueryData(bookingsQuery.queryKey, bookingsSeed);
  }

  return queryClient;
}

export function renderApp(path: string, queryClient: QueryClient = createQueryClient()): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
