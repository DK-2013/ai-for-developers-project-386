import { Temporal } from "temporal-polyfill";
import { assert, jsonValue, property } from "fast-check";
import { describe, expect, it } from "vitest";
import { parseCreateBookingRequest } from "./validation.js";

const VALID = {
  meetingTypeId: "00000000-0000-4000-8000-000000000001",
  startAt: Temporal.Instant.from("2026-01-06T07:00:00Z"),
  attendeeName: "Гость",
  attendeeEmail: "guest@example.com",
};

describe("create booking validation", () => {
  it("accepts a valid request and returns the parsed instant", () => {
    const result = parseCreateBookingRequest(VALID);

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) {
      return;
    }

    expect(result.value.startAt.toString()).toBe("2026-01-06T07:00:00Z");
    expect(result.value).toMatchObject({
      meetingTypeId: VALID.meetingTypeId,
      attendeeName: "Гость",
      attendeeEmail: "guest@example.com",
    });
  });

  it("accepts an RFC 3339 start string from the raw wire body", () => {
    const result = parseCreateBookingRequest({
      ...VALID,
      startAt: "2026-01-06T10:00:00+03:00",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects an email without an at sign", () => {
    const result = parseCreateBookingRequest({ ...VALID, attendeeEmail: "guest.example.com" });

    expect(result).toEqual({ ok: false, message: expect.any(String) });
  });

  it("never throws and never both accepts and rejects arbitrary JSON", () => {
    assert(
      property(jsonValue(), (body) => {
        const result = parseCreateBookingRequest(body);

        expect(typeof result.ok).toBe("boolean");
        expect(result.ok ? "value" in result : "message" in result).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
