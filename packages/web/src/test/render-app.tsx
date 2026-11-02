import type { MeetingTypeList } from "@calendar/sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { App } from "../app";
import { meetingTypesQuery } from "../api/queries";

export function createQueryClient(seed?: MeetingTypeList): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  if (seed) {
    queryClient.setQueryData(meetingTypesQuery.queryKey, seed);
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
