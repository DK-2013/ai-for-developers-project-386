import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createRequestHandler } from "../src/app.js";
import { parseConfig } from "../src/config.js";
import type { Database } from "../src/db/schema.js";
import { createTestDatabase, type TestDatabase } from "./helpers/database.js";

const FIXED_NOW = new Date("2026-01-05T10:00:00.000Z");
const DEFAULT_MEETING_TYPE_ID = "00000000-0000-4000-8000-000000000001";
const UNKNOWN_MEETING_TYPE_ID = "00000000-0000-4000-8000-000000000099";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type BookingBody = {
  id: string;
  meetingTypeId: string;
  meetingTypeName: string;
  startAt: string;
  endAt: string;
  attendeeName: string;
  attendeeEmail: string;
};

type Response = { status: number; body: unknown };

let database: TestDatabase;
let server: Server;
let baseUrl: string;
let currentNow = FIXED_NOW;

async function startServer(db: Database): Promise<{ server: Server; baseUrl: string }> {
  const requestHandler = createRequestHandler({
    db,
    owner: parseConfig({}).owner,
    clock: () => currentNow,
  });
  const nextServer = createServer(requestHandler);

  await new Promise<void>((resolve, reject) => {
    nextServer.once("error", reject);
    nextServer.listen(0, "127.0.0.1", resolve);
  });

  const address = nextServer.address() as AddressInfo;

  return { server: nextServer, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function stopServer(target: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    target.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function createMeetingType(name: string, durationMinutes: number): Promise<string> {
  const response = await fetch(`${baseUrl}/meeting-types`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, durationMinutes }),
  });
  const body = (await response.json()) as { id: string };

  expect(response.status).toBe(201);
  return body.id;
}

async function postBooking(body: unknown): Promise<Response> {
  const response = await fetch(`${baseUrl}/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed: unknown = await response.json();

  return { status: response.status, body: parsed };
}

async function getBookings(): Promise<Response> {
  const response = await fetch(`${baseUrl}/bookings`);
  const parsed: unknown = await response.json();

  return { status: response.status, body: parsed };
}

function bookingRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    meetingTypeId: DEFAULT_MEETING_TYPE_ID,
    startAt: "2026-01-06T07:00:00Z",
    attendeeName: "Гость",
    attendeeEmail: "guest@example.com",
    ...overrides,
  };
}

beforeAll(async () => {
  database = await createTestDatabase("bookings");
  const started = await startServer(database.db);
  server = started.server;
  baseUrl = started.baseUrl;
});

beforeEach(async () => {
  currentNow = FIXED_NOW;
  await database.reset();
});

afterAll(async () => {
  await stopServer(server);
  await database.destroy();
});

describe("POST /bookings", () => {
  it("creates a booking with the meeting type name snapshot and computed end", async () => {
    const response = await postBooking(bookingRequest());
    const body = response.body as BookingBody;

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      meetingTypeId: DEFAULT_MEETING_TYPE_ID,
      meetingTypeName: "Звонок",
      startAt: "2026-01-06T07:00:00Z",
      endAt: "2026-01-06T07:15:00Z",
      attendeeName: "Гость",
      attendeeEmail: "guest@example.com",
    });
    expect(body.id).toMatch(UUID_PATTERN);
  });

  it.each([
    ["body that is null", null],
    ["body that is an array", []],
    [
      "missing meetingTypeId",
      { startAt: "2026-01-06T07:00:00Z", attendeeName: "A", attendeeEmail: "a@example.com" },
    ],
    ["meetingTypeId that is not a string", bookingRequest({ meetingTypeId: 42 })],
    ["empty meetingTypeId", bookingRequest({ meetingTypeId: "" })],
    [
      "missing startAt",
      { meetingTypeId: DEFAULT_MEETING_TYPE_ID, attendeeName: "A", attendeeEmail: "a@example.com" },
    ],
    ["startAt that is not a string", bookingRequest({ startAt: 1767682800000 })],
    ["startAt without a time zone", bookingRequest({ startAt: "2026-01-06T07:00:00" })],
    ["startAt that is not a date", bookingRequest({ startAt: "tomorrow" })],
    [
      "missing attendeeName",
      {
        meetingTypeId: DEFAULT_MEETING_TYPE_ID,
        startAt: "2026-01-06T07:00:00Z",
        attendeeEmail: "a@example.com",
      },
    ],
    ["attendeeName longer than 200 characters", bookingRequest({ attendeeName: "a".repeat(201) })],
    ["attendeeName that is not a string", bookingRequest({ attendeeName: 42 })],
    [
      "missing attendeeEmail",
      {
        meetingTypeId: DEFAULT_MEETING_TYPE_ID,
        startAt: "2026-01-06T07:00:00Z",
        attendeeName: "A",
      },
    ],
    ["attendeeEmail that is not an email", bookingRequest({ attendeeEmail: "not-an-email" })],
    ["attendeeEmail without a domain", bookingRequest({ attendeeEmail: "guest@" })],
    [
      "attendeeEmail longer than 254 characters",
      bookingRequest({ attendeeEmail: `${"a".repeat(243)}@example.com` }),
    ],
  ])("returns 400 for %s", async (_label, body) => {
    const response = await postBooking(body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "invalid_request",
      message: expect.any(String),
    });
  });

  it("returns 404 for an unknown meeting type", async () => {
    const response = await postBooking(bookingRequest({ meetingTypeId: UNKNOWN_MEETING_TYPE_ID }));

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: "meeting_type_not_found" });
  });

  it("returns 404 for a meeting type id that is not a UUID", async () => {
    const response = await postBooking(bookingRequest({ meetingTypeId: "not-a-uuid" }));

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: "meeting_type_not_found" });
  });

  it.each([
    ["a start in the past", bookingRequest({ startAt: "2026-01-05T07:00:00Z" })],
    ["a start off the fifteen-minute grid", bookingRequest({ startAt: "2026-01-06T07:05:00Z" })],
    ["a start before working hours", bookingRequest({ startAt: "2026-01-06T06:45:00Z" })],
    ["a start after working hours", bookingRequest({ startAt: "2026-01-06T15:15:00Z" })],
    ["a start on a non-working day", bookingRequest({ startAt: "2026-01-10T07:00:00Z" })],
    ["a start outside the booking window", bookingRequest({ startAt: "2026-01-19T07:00:00Z" })],
  ])("returns 409 for %s", async (_label, body) => {
    const response = await postBooking(body);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "slot_not_available" });
  });

  it("returns 409 when the meeting does not fit before the working day ends", async () => {
    const meetingTypeId = await createMeetingType("Consultation", 30);
    const response = await postBooking(
      bookingRequest({ meetingTypeId, startAt: "2026-01-06T14:45:00Z" }),
    );

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "slot_not_available" });
  });

  it("returns 409 for a repeat booking of the same slot", async () => {
    const first = await postBooking(bookingRequest());
    const second = await postBooking(bookingRequest());

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({ code: "slot_not_available" });
  });

  it("returns 409 for a partial overlap across meeting types", async () => {
    const firstTypeId = await createMeetingType("Intro call", 30);
    const secondTypeId = await createMeetingType("Consultation", 45);
    const first = await postBooking(
      bookingRequest({ meetingTypeId: firstTypeId, startAt: "2026-01-06T07:00:00Z" }),
    );
    const second = await postBooking(
      bookingRequest({ meetingTypeId: secondTypeId, startAt: "2026-01-06T07:15:00Z" }),
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({ code: "slot_not_available" });
  });

  it("allows a meeting to start exactly when another ends", async () => {
    const meetingTypeId = await createMeetingType("Intro call", 30);
    const first = await postBooking(
      bookingRequest({ meetingTypeId, startAt: "2026-01-06T07:00:00Z" }),
    );
    const second = await postBooking(
      bookingRequest({ meetingTypeId, startAt: "2026-01-06T07:30:00Z" }),
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
  });

  it("allows only one of two concurrent requests for the same slot", async () => {
    const meetingTypeId = await createMeetingType("Intro call", 30);
    const request = () =>
      postBooking(bookingRequest({ meetingTypeId, startAt: "2026-01-06T07:00:00Z" }));

    const results = await Promise.allSettled([request(), request()]);
    const statuses = results.map((result) => {
      if (result.status === "rejected") {
        throw result.reason;
      }

      return result.value.status;
    });

    expect(statuses.toSorted()).toEqual([201, 409]);
  });
});

describe("GET /bookings", () => {
  it("returns upcoming bookings from every meeting type ordered by start", async () => {
    const consultationId = await createMeetingType("Консультация", 30);
    const later = await postBooking(
      bookingRequest({ startAt: "2026-01-06T08:00:00Z", attendeeName: "Анна" }),
    );
    const earlier = await postBooking(
      bookingRequest({
        meetingTypeId: consultationId,
        startAt: "2026-01-06T07:00:00Z",
        attendeeName: "Борис",
        attendeeEmail: "boris@example.com",
      }),
    );

    expect(later.status).toBe(201);
    expect(earlier.status).toBe(201);

    const response = await getBookings();
    const body = response.body as { bookings: BookingBody[] };

    expect(response.status).toBe(200);
    expect(body.bookings.map((booking) => booking.startAt)).toEqual([
      "2026-01-06T07:00:00Z",
      "2026-01-06T08:00:00Z",
    ]);
    expect(body.bookings.map((booking) => booking.meetingTypeName)).toEqual([
      "Консультация",
      "Звонок",
    ]);
    expect(body.bookings.map((booking) => booking.attendeeName)).toEqual(["Борис", "Анна"]);
  });

  it("includes the full booking details with the meeting type name snapshot", async () => {
    const consultationId = await createMeetingType("Консультация", 30);
    await postBooking(
      bookingRequest({
        meetingTypeId: consultationId,
        startAt: "2026-01-06T07:00:00Z",
        attendeeName: "Борис",
        attendeeEmail: "boris@example.com",
      }),
    );

    const response = await getBookings();
    const body = response.body as { bookings: BookingBody[] };

    expect(response.status).toBe(200);
    expect(body.bookings).toHaveLength(1);
    expect(body.bookings[0]).toMatchObject({
      meetingTypeId: consultationId,
      meetingTypeName: "Консультация",
      startAt: "2026-01-06T07:00:00Z",
      endAt: "2026-01-06T07:30:00Z",
      attendeeName: "Борис",
      attendeeEmail: "boris@example.com",
    });
  });

  it("excludes bookings that have ended and keeps the ones still running", async () => {
    await postBooking(bookingRequest({ startAt: "2026-01-06T07:00:00Z", attendeeName: "Анна" }));
    await postBooking(bookingRequest({ startAt: "2026-01-06T08:00:00Z", attendeeName: "Борис" }));

    currentNow = new Date("2026-01-06T07:15:00.000Z");

    const response = await getBookings();
    const body = response.body as { bookings: BookingBody[] };

    expect(response.status).toBe(200);
    expect(body.bookings.map((booking) => booking.attendeeName)).toEqual(["Борис"]);
  });

  it("returns an empty list when no booking is upcoming", async () => {
    await postBooking(bookingRequest({ startAt: "2026-01-06T07:00:00Z" }));

    currentNow = new Date("2026-01-06T08:00:00.000Z");

    const response = await getBookings();
    const body = response.body as { bookings: BookingBody[] };

    expect(response.status).toBe(200);
    expect(body.bookings).toEqual([]);
  });
});
