import { describe, expect, it } from "vitest";
import { parseCreateMeetingTypeRequest } from "./validation.js";

function expectInvalid(body: unknown): string {
  const result = parseCreateMeetingTypeRequest(body);

  expect(result.ok).toBe(false);
  return result.ok ? "" : result.message;
}

describe("parseCreateMeetingTypeRequest", () => {
  it("accepts a minimal request", () => {
    const result = parseCreateMeetingTypeRequest({
      name: "Intro call",
      durationMinutes: 30,
    });

    expect(result).toEqual({
      ok: true,
      value: { name: "Intro call", durationMinutes: 30 },
    });
  });

  it("accepts an optional description", () => {
    const result = parseCreateMeetingTypeRequest({
      name: "Intro call",
      description: "A short introduction",
      durationMinutes: 30,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        name: "Intro call",
        description: "A short introduction",
        durationMinutes: 30,
      },
    });
  });

  it("counts name length in code points, not UTF-16 units", () => {
    // Each emoji is two UTF-16 units but one code point.
    const name = "😀".repeat(200);
    const result = parseCreateMeetingTypeRequest({ name, durationMinutes: 30 });

    expect(result.ok).toBe(true);
  });

  it("rejects a name longer than 200 code points", () => {
    const message = expectInvalid({ name: "😀".repeat(201), durationMinutes: 30 });

    expect(message).toContain("200");
  });

  it("counts description length in code points", () => {
    const description = "😀".repeat(2000);
    const result = parseCreateMeetingTypeRequest({
      name: "Intro call",
      description,
      durationMinutes: 30,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a description longer than 2000 code points", () => {
    const message = expectInvalid({
      name: "Intro call",
      description: "😀".repeat(2001),
      durationMinutes: 30,
    });

    expect(message).toContain("2000");
  });

  it("rejects a null description instead of treating it as absent", () => {
    const message = expectInvalid({
      name: "Intro call",
      description: null,
      durationMinutes: 30,
    });

    expect(message).toContain("description");
  });

  it("rejects a body that is not a JSON object", () => {
    expect(expectInvalid(null)).toContain("object");
    expect(expectInvalid([])).toContain("object");
    expect(expectInvalid("text")).toContain("object");
    expect(expectInvalid(42)).toContain("object");
  });

  it("rejects a missing or non-string name", () => {
    expect(expectInvalid({ durationMinutes: 30 })).toContain("name");
    expect(expectInvalid({ name: 42, durationMinutes: 30 })).toContain("name");
  });

  it("rejects a non-string description", () => {
    expect(expectInvalid({ name: "Intro call", description: 42, durationMinutes: 30 })).toContain(
      "description",
    );
  });

  it.each([
    ["missing", undefined],
    ["a string", "30"],
    ["a fraction", 30.5],
    ["below the minimum", 14],
    ["above the maximum", 1441],
    ["not a multiple of fifteen", 16],
    ["not a number", Number.NaN],
  ])("rejects durationMinutes that is %s", (_label, durationMinutes) => {
    const body = { name: "Intro call", durationMinutes };
    const message = expectInvalid(body);

    expect(message).toContain("durationMinutes");
  });

  it.each([15, 30, 1440])("accepts durationMinutes %i", (durationMinutes) => {
    const result = parseCreateMeetingTypeRequest({
      name: "Intro call",
      durationMinutes,
    });

    expect(result.ok).toBe(true);
  });

  it("never throws for arbitrary JSON values", () => {
    const values: unknown[] = [
      undefined,
      null,
      true,
      false,
      0,
      -1,
      "",
      [],
      {},
      { name: null, durationMinutes: null },
      { name: "ok", description: {}, durationMinutes: 15 },
      { name: "ok", durationMinutes: 15, extra: "ignored" },
    ];

    for (const value of values) {
      expect(() => parseCreateMeetingTypeRequest(value)).not.toThrow();
    }
  });
});
