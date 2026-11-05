import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Temporal } from "temporal-polyfill";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createRequestHandler } from "../src/app.js";
import { parseConfig, type OwnerConfig } from "../src/config.js";
import { bookings } from "../src/db/schema.js";
import { createTestDatabase, type TestDatabase } from "./helpers/database.js";

const DEFAULT_MEETING_TYPE_ID = "00000000-0000-4000-8000-000000000001";
const MOSCOW = "Europe/Moscow";

type SlotListBody = {
  timezone: string;
  windowStart: string;
  windowEnd: string;
  slots: { startAt: string; endAt: string }[];
};

let database: TestDatabase;
let server: Server;
let baseUrl: string;
let now: Date;

async function startServer(owner: OwnerConfig = parseConfig({}).owner): Promise<{
  server: Server;
  baseUrl: string;
}> {
  const requestHandler = createRequestHandler({
    db: database.db,
    owner,
    clock: () => now,
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

async function withServer(
  owner: OwnerConfig,
  operation: (url: string) => Promise<void>,
): Promise<void> {
  const started = await startServer(owner);

  try {
    await operation(started.baseUrl);
  } finally {
    await stopServer(started.server);
  }
}

async function getSlots(
  meetingTypeId: string = DEFAULT_MEETING_TYPE_ID,
  url: string = baseUrl,
): Promise<{ status: number; body: SlotListBody }> {
  const response = await fetch(`${url}/meeting-types/${meetingTypeId}/slots`);
  const body = (await response.json()) as SlotListBody;

  return { status: response.status, body };
}

async function createMeetingType(durationMinutes: number): Promise<string> {
  const response = await fetch(`${baseUrl}/meeting-types`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: `Type ${durationMinutes}`, durationMinutes }),
  });
  const body = (await response.json()) as { id: string };

  expect(response.status).toBe(201);
  return body.id;
}

async function insertBooking(startAt: string, endAt: string): Promise<void> {
  await database.db.insert(bookings).values({
    meetingTypeId: DEFAULT_MEETING_TYPE_ID,
    meetingTypeName: "Звонок",
    attendeeName: "Guest",
    attendeeEmail: "guest@example.com",
    startAt: new Date(startAt),
    endAt: new Date(endAt),
  });
}

function localTime(instant: string, timeZone: string = MOSCOW): Temporal.PlainDateTime {
  return Temporal.Instant.from(instant).toZonedDateTimeISO(timeZone).toPlainDateTime();
}

function localDate(instant: string, timeZone: string = MOSCOW): string {
  return localTime(instant, timeZone).toPlainDate().toString();
}

function startsOfDay(body: SlotListBody, date: string): string[] {
  return body.slots.filter((slot) => localDate(slot.startAt) === date).map((slot) => slot.startAt);
}

beforeAll(async () => {
  database = await createTestDatabase("slots");
  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

beforeEach(async () => {
  await database.reset();
  now = new Date("2026-01-05T10:00:00.000Z");
});

afterAll(async () => {
  await stopServer(server);
  await database.destroy();
});

describe("GET /meeting-types/{id}/slots", () => {
  it("returns 404 for an unknown meeting type", async () => {
    const response = await getSlots("00000000-0000-4000-8000-000000000099");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      code: "meeting_type_not_found",
      message: expect.any(String),
    });
  });

  it("returns 404 for an id that is not a UUID", async () => {
    const response = await getSlots("not-a-uuid");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: "meeting_type_not_found" });
  });

  it("returns the owner time zone and the owner-local window bounds", async () => {
    const response = await getSlots();

    expect(response.status).toBe(200);
    expect(response.body.timezone).toBe(MOSCOW);
    expect(response.body.windowStart).toBe("2026-01-04T21:00:00Z");
    expect(response.body.windowEnd).toBe("2026-01-18T21:00:00Z");
  });

  it("keeps every slot inside the booking window", async () => {
    const response = await getSlots();
    const { windowStart, windowEnd, slots } = response.body;

    expect(slots.length).toBeGreaterThan(0);

    for (const slot of slots) {
      expect(
        Temporal.Instant.compare(
          Temporal.Instant.from(slot.startAt),
          Temporal.Instant.from(windowStart),
        ),
      ).toBeGreaterThanOrEqual(0);
      expect(
        Temporal.Instant.compare(
          Temporal.Instant.from(slot.endAt),
          Temporal.Instant.from(windowEnd),
        ),
      ).toBeLessThanOrEqual(0);
    }
  });

  it("slides the window with the injected clock", async () => {
    const first = await getSlots();

    now = new Date("2026-01-06T10:00:00.000Z");
    const second = await getSlots();

    expect(first.body.windowStart).toBe("2026-01-04T21:00:00Z");
    expect(second.body.windowStart).toBe("2026-01-05T21:00:00Z");
    expect(second.body.windowEnd).toBe("2026-01-19T21:00:00Z");
  });

  it("starts strictly after the current instant", async () => {
    now = new Date("2026-01-05T14:50:00.000Z");
    const response = await getSlots();

    expect(startsOfDay(response.body, "2026-01-05")).toEqual([]);
    expect(response.body.slots.at(0)?.startAt).toBe("2026-01-06T07:00:00Z");
  });

  it("offers only owner working days", async () => {
    const response = await getSlots();
    const days = new Set(response.body.slots.map((slot) => localTime(slot.startAt).dayOfWeek));

    expect([...days].toSorted()).toEqual([1, 2, 3, 4, 5]);
    expect(startsOfDay(response.body, "2026-01-10")).toEqual([]);
    expect(startsOfDay(response.body, "2026-01-11")).toEqual([]);
  });

  it("offers starts on a fifteen-minute step within working hours", async () => {
    const response = await getSlots();
    const starts = startsOfDay(response.body, "2026-01-06");

    expect(starts.at(0)).toBe("2026-01-06T07:00:00Z");
    expect(starts.at(-1)).toBe("2026-01-06T14:45:00Z");

    for (let index = 0; index < starts.length; index += 1) {
      const current = starts[index];

      if (current === undefined) {
        throw new Error("Missing start");
      }

      const local = localTime(current);
      expect(local.minute % 15).toBe(0);
      expect(local.hour).toBeGreaterThanOrEqual(10);
      expect(local.hour).toBeLessThan(18);
    }

    const gaps = starts.slice(1).map((current, index) => {
      const previous = starts[index];

      if (previous === undefined) {
        throw new Error("Missing previous start");
      }

      return Temporal.Instant.from(current).since(Temporal.Instant.from(previous)).total("minutes");
    });

    for (const gap of gaps) {
      expect(gap).toBe(15);
    }
  });

  it("anchors the grid to local quarter-hours when the working day starts off-grid", async () => {
    const owner: OwnerConfig = {
      timeZone: "UTC",
      workingHours: {
        start: Temporal.PlainTime.from("10:07"),
        end: Temporal.PlainTime.from("18:00"),
      },
      workingDays: [1, 2, 3, 4, 5],
    };

    await withServer(owner, async (url) => {
      now = new Date("2026-01-05T00:00:00.000Z");
      const response = await getSlots(DEFAULT_MEETING_TYPE_ID, url);
      const first = response.body.slots.at(0);
      const firstLocal = first === undefined ? undefined : localTime(first.startAt, "UTC");

      expect(firstLocal?.toPlainTime().toString()).toBe("10:15:00");
    });
  });

  it("keeps a 30-minute meeting before the end of the working day", async () => {
    const meetingTypeId = await createMeetingType(30);
    const response = await getSlots(meetingTypeId);
    const starts = startsOfDay(response.body, "2026-01-06");

    expect(starts.at(0)).toBe("2026-01-06T07:00:00Z");
    expect(starts.at(-1)).toBe("2026-01-06T14:30:00Z");

    for (const slot of response.body.slots) {
      const duration = Temporal.Instant.from(slot.endAt).since(Temporal.Instant.from(slot.startAt));

      expect(duration.total("minutes")).toBe(30);
      expect(localTime(slot.endAt).minute % 15).toBe(0);
      expect(
        Temporal.PlainTime.compare(
          localTime(slot.endAt).toPlainTime(),
          Temporal.PlainTime.from("18:00"),
        ),
      ).toBeLessThanOrEqual(0);
    }
  });

  it("keeps a 45-minute meeting before the end of the working day", async () => {
    const meetingTypeId = await createMeetingType(45);
    const response = await getSlots(meetingTypeId);
    const starts = startsOfDay(response.body, "2026-01-06");

    expect(starts.at(0)).toBe("2026-01-06T07:00:00Z");
    expect(starts.at(-1)).toBe("2026-01-06T14:15:00Z");

    for (const slot of response.body.slots) {
      const duration = Temporal.Instant.from(slot.endAt).since(Temporal.Instant.from(slot.startAt));

      expect(duration.total("minutes")).toBe(45);
      expect(localTime(slot.endAt).minute % 15).toBe(0);
    }
  });

  it("excludes a partially overlapping booking", async () => {
    await insertBooking("2026-01-06T07:15:00Z", "2026-01-06T07:30:00Z");
    const response = await getSlots();
    const starts = startsOfDay(response.body, "2026-01-06");

    expect(starts).not.toContain("2026-01-06T07:15:00Z");
    expect(starts).toContain("2026-01-06T07:30:00Z");
  });

  it("excludes starts whose longer meeting would overlap a booking", async () => {
    const meetingTypeId = await createMeetingType(30);
    await insertBooking("2026-01-06T07:15:00Z", "2026-01-06T07:30:00Z");
    const response = await getSlots(meetingTypeId);
    const starts = startsOfDay(response.body, "2026-01-06");

    expect(starts).not.toContain("2026-01-06T07:00:00Z");
    expect(starts).not.toContain("2026-01-06T07:15:00Z");
    expect(starts).toContain("2026-01-06T07:30:00Z");
  });

  it("uses configured working days and hours", async () => {
    const owner: OwnerConfig = {
      timeZone: "UTC",
      workingHours: {
        start: Temporal.PlainTime.from("09:00"),
        end: Temporal.PlainTime.from("11:00"),
      },
      workingDays: [1, 3],
    };

    await withServer(owner, async (url) => {
      now = new Date("2026-01-05T00:00:00.000Z");
      const response = await getSlots(DEFAULT_MEETING_TYPE_ID, url);
      const days = new Set(
        response.body.slots.map((slot) => localTime(slot.startAt, "UTC").dayOfWeek),
      );
      const times = response.body.slots.map((slot) =>
        localTime(slot.startAt, "UTC").toPlainTime().toString(),
      );

      expect(response.body.timezone).toBe("UTC");
      expect([...days].toSorted()).toEqual([1, 3]);
      expect(times).toContain("09:00:00");
      expect(times).toContain("10:45:00");
      expect(times.every((time) => time >= "09:00:00" && time < "11:00:00")).toBe(true);
    });
  });
});
