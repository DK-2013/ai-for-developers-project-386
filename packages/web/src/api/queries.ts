import { CallCalendarClient } from "@calendar/sdk";
import { queryOptions } from "@tanstack/react-query";

const FALLBACK_ORIGIN = "http://localhost:3000";

/**
 * The generated SDK passes the endpoint to `URL`, so it must be absolute. In
 * the browser the API lives on the same origin as the page and Vite proxies
 * `/api` to the server; tests and non-browser environments use the local
 * development origin.
 */
export function resolveApiEndpoint(
  origin: string | undefined = globalThis.location?.origin,
): string {
  return new URL("/api", origin ?? FALLBACK_ORIGIN).toString();
}

export function apiClientOptions(origin?: string) {
  const endpoint = resolveApiEndpoint(origin);

  return {
    endpoint,
    // The runtime refuses plain HTTP unless this is set; production uses HTTPS.
    allowInsecureConnection: endpoint.startsWith("http://"),
  };
}

export const apiClient = new CallCalendarClient(apiClientOptions());

export const meetingTypesQuery = queryOptions({
  queryKey: ["meeting-types"],
  queryFn: () => apiClient.listMeetingTypes(),
});
