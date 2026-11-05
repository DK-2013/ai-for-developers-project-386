import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createRequestHandler } from "../src/app.js";
import { parseConfig } from "../src/config.js";
import { schema, type Database } from "../src/db/schema.js";
import { seedDefaultMeetingType } from "../src/db/seed.js";
import { createTestDatabase, type TestDatabase } from "./helpers/database.js";

const FIXED_NOW = new Date("2026-01-01T10:00:00.000Z");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DEFAULT_MEETING_TYPE = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Звонок",
  description: "Стандартный звонок",
  durationMinutes: 15,
};

let database: TestDatabase;
let server: Server;
let baseUrl: string;

async function startServer(db: Database): Promise<{ server: Server; baseUrl: string }> {
  const requestHandler = createRequestHandler({
    db,
    owner: parseConfig({}).owner,
    clock: () => FIXED_NOW,
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

async function postMeetingType(body: unknown): Promise<{ status: number; body: unknown }> {
  const payload = JSON.stringify(body);

  if (payload === undefined) {
    throw new Error("Test body is not JSON-serializable");
  }

  return postRawMeetingType(payload);
}

async function postRawMeetingType(body: string): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${baseUrl}/meeting-types`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const parsed: unknown = await response.json();

  return { status: response.status, body: parsed };
}

async function listMeetingTypes(url: string = baseUrl): Promise<unknown> {
  const response = await fetch(`${url}/meeting-types`);
  const body: unknown = await response.json();

  expect(response.status).toBe(200);
  return body;
}

beforeAll(async () => {
  database = await createTestDatabase("app");
  const started = await startServer(database.db);
  server = started.server;
  baseUrl = started.baseUrl;
});

beforeEach(async () => {
  await database.reset();
});

afterAll(async () => {
  await stopServer(server);
  await database.destroy();
});

describe("HTTP surface", () => {
  it("responds to health checks", async () => {
    const response = await fetch(`${baseUrl}/healthz`);
    const status = response.status;
    const body: unknown = await response.json();

    expect(status).toBe(200);
    expect(body).toEqual({ status: "ok" });
  });

  it("exposes the default meeting type on a clean database", async () => {
    const body = await listMeetingTypes();

    expect(body).toEqual({
      meetingTypes: [DEFAULT_MEETING_TYPE],
    });
  });

  it("keeps exactly one default meeting type when the seed runs twice", async () => {
    await seedDefaultMeetingType(database.db);
    await seedDefaultMeetingType(database.db);

    const body = await listMeetingTypes();
    const meetingTypes = (body as { meetingTypes: unknown[] }).meetingTypes;

    expect(meetingTypes).toEqual([DEFAULT_MEETING_TYPE]);
  });

  it("creates a meeting type and returns it", async () => {
    const response = await postMeetingType({
      name: "Intro call",
      description: "A short introduction",
      durationMinutes: 30,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Intro call",
      description: "A short introduction",
      durationMinutes: 30,
    });

    const created = response.body as { id: string };
    expect(created.id).toMatch(UUID_PATTERN);
  });

  it("creates a meeting type without a description", async () => {
    const response = await postMeetingType({ name: "Intro call", durationMinutes: 30 });

    expect(response.status).toBe(201);
    expect(response.body).not.toHaveProperty("description");
  });

  it("lists saved meeting types in creation order", async () => {
    await postMeetingType({ name: "First", durationMinutes: 15 });
    await postMeetingType({ name: "Second", durationMinutes: 60 });

    const body = await listMeetingTypes();
    const names = (body as { meetingTypes: { name: string }[] }).meetingTypes.map(
      (meetingType) => meetingType.name,
    );

    expect(names).toEqual([DEFAULT_MEETING_TYPE.name, "First", "Second"]);
  });

  it("keeps meeting types after a new pool and server start", async () => {
    const created = await postMeetingType({ name: "Persisted", durationMinutes: 30 });
    const newPool = new Pool({ connectionString: database.url });
    const newDb = drizzle(newPool, { schema });
    const restarted = await startServer(newDb);

    try {
      const body = await listMeetingTypes(restarted.baseUrl);
      const meetingTypes = (body as { meetingTypes: unknown[] }).meetingTypes;

      expect(meetingTypes).toEqual([DEFAULT_MEETING_TYPE, created.body]);
    } finally {
      await stopServer(restarted.server);
      await newPool.end();
    }
  });

  it.each([
    ["name longer than 200 characters", { name: "a".repeat(201), durationMinutes: 30 }],
    ["name that is not a string", { name: 42, durationMinutes: 30 }],
    ["missing name", { durationMinutes: 30 }],
    [
      "description longer than 2000 characters",
      { name: "Intro call", description: "a".repeat(2001), durationMinutes: 30 },
    ],
    ["null description", { name: "Intro call", description: null, durationMinutes: 30 }],
    [
      "description that is not a string",
      { name: "Intro call", description: 42, durationMinutes: 30 },
    ],
    ["duration 14", { name: "Intro call", durationMinutes: 14 }],
    ["duration 1441", { name: "Intro call", durationMinutes: 1441 }],
    ["duration 16", { name: "Intro call", durationMinutes: 16 }],
    ["fractional duration", { name: "Intro call", durationMinutes: 30.5 }],
    ["string duration", { name: "Intro call", durationMinutes: "30" }],
    ["missing duration", { name: "Intro call" }],
    ["body that is an array", []],
    ["body that is null", null],
    ["body that is a string", "text"],
    ["body that is a number", 42],
  ])("rejects a request with %s", async (_label, body) => {
    const response = await postMeetingType(body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "invalid_request",
      message: expect.any(String),
    });
  });

  it("returns 400 for malformed JSON without writing a second response", async () => {
    const response = await postRawMeetingType("{");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: "invalid_request",
      message: "Malformed request",
    });
  });

  it("returns 404 for unknown routes", async () => {
    const response = await fetch(`${baseUrl}/unknown`);
    const status = response.status;
    const body: unknown = await response.json();

    expect(status).toBe(404);
    expect(body).toEqual({ code: "invalid_request", message: "Not Found" });
  });
});
