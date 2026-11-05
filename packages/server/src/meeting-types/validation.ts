import type { CreateMeetingTypeRequest } from "../generated/models/all/call-calendar.js";

export type CreateMeetingTypeValidation =
  | { ok: true; value: CreateMeetingTypeRequest }
  | { ok: false; message: string };

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function codePointLength(value: string): number {
  return [...value].length;
}

function invalid(message: string): CreateMeetingTypeValidation {
  return { ok: false, message };
}

/**
 * Validates the generated router's untyped request body against the contract.
 * String limits are counted in code points so an emoji costs one character,
 * matching the contract's character semantics rather than UTF-16 units.
 */
export function parseCreateMeetingTypeRequest(body: unknown): CreateMeetingTypeValidation {
  if (!isRecord(body)) {
    return invalid("request body must be a JSON object");
  }

  const { name, description, durationMinutes } = body;

  if (typeof name !== "string") {
    return invalid("name must be a string");
  }

  if (codePointLength(name) > 200) {
    return invalid("name must be at most 200 characters");
  }

  if ("description" in body) {
    if (typeof description !== "string") {
      return invalid("description must be a string when present");
    }

    if (codePointLength(description) > 2000) {
      return invalid("description must be at most 2000 characters");
    }
  }

  if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes)) {
    return invalid("durationMinutes must be an integer");
  }

  if (durationMinutes < 15 || durationMinutes > 1440) {
    return invalid("durationMinutes must be between 15 and 1440");
  }

  if (durationMinutes % 15 !== 0) {
    return invalid("durationMinutes must be a multiple of 15");
  }

  const value: CreateMeetingTypeRequest = { name, durationMinutes };

  if (typeof description === "string") {
    value.description = description;
  }

  return { ok: true, value };
}
