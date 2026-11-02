import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requestHandler } from "../src/app.js";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer(requestHandler);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
});

describe("HTTP surface", () => {
  it("responds to health checks", async () => {
    const response = await fetch(`${baseUrl}/healthz`);
    const status = response.status;
    const body = await response.json();

    expect(status).toBe(200);
    expect(body).toEqual({ status: "ok" });
  });

  it("lists meeting types", async () => {
    const response = await fetch(`${baseUrl}/meeting-types`);
    const status = response.status;
    const body = await response.json();

    expect(status).toBe(200);
    expect(body).toEqual({ meetingTypes: [] });
  });

  it("reports a conflict as a coded API error", async () => {
    const response = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        meetingTypeId: "missing",
        startAt: "2026-01-01T10:00:00Z",
        attendeeName: "Guest",
        attendeeEmail: "guest@example.com",
      }),
    });
    const status = response.status;
    const body = await response.json();

    expect(status).toBe(409);
    expect(body).toEqual({ code: "slot_not_available", message: "Slot is not available" });
  });

  it("returns 404 for unknown routes", async () => {
    const response = await fetch(`${baseUrl}/unknown`);
    const status = response.status;
    const body = await response.json();

    expect(status).toBe(404);
    expect(body).toEqual({ code: "invalid_request", message: "Not Found" });
  });
});
