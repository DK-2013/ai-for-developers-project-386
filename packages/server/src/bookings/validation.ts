import { Temporal } from "temporal-polyfill";

export type CreateBookingValidation =
  | { ok: true; value: NewBookingInput }
  | { ok: false; message: string };

/** The subset of a booking the request supplies; the handler resolves the rest. */
type NewBookingInput = {
  meetingTypeId: string;
  startAt: Temporal.Instant;
  attendeeName: string;
  attendeeEmail: string;
};

type JsonRecord = Record<string, unknown>;

const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function codePointLength(value: string): number {
  return [...value].length;
}

function invalid(message: string): CreateBookingValidation {
  return { ok: false, message };
}

/**
 * Validates the generated router's untyped request body against the contract.
 * The body is untrusted JSON, so `startAt` arrives as a string even though the
 * generated wire type is a `Temporal.Instant`.
 */
export function parseCreateBookingRequest(body: unknown): CreateBookingValidation {
  if (!isRecord(body)) {
    return invalid("request body must be a JSON object");
  }

  const { meetingTypeId, startAt, attendeeName, attendeeEmail } = body;

  if (typeof meetingTypeId !== "string" || meetingTypeId.length === 0) {
    return invalid("meetingTypeId must be a non-empty string");
  }

  let start: Temporal.Instant;

  if (typeof startAt === "string") {
    try {
      start = Temporal.Instant.from(startAt);
    } catch {
      return invalid("startAt must be an RFC 3339 instant string");
    }
  } else if (startAt instanceof Temporal.Instant) {
    start = startAt;
  } else {
    return invalid("startAt must be an RFC 3339 instant string");
  }

  if (typeof attendeeName !== "string") {
    return invalid("attendeeName must be a string");
  }

  if (codePointLength(attendeeName) > MAX_NAME_LENGTH) {
    return invalid(`attendeeName must be at most ${MAX_NAME_LENGTH} characters`);
  }

  if (typeof attendeeEmail !== "string") {
    return invalid("attendeeEmail must be a string");
  }

  if (codePointLength(attendeeEmail) > MAX_EMAIL_LENGTH) {
    return invalid(`attendeeEmail must be at most ${MAX_EMAIL_LENGTH} characters`);
  }

  if (!EMAIL_PATTERN.test(attendeeEmail)) {
    return invalid("attendeeEmail must be a valid email address");
  }

  return {
    ok: true,
    value: {
      meetingTypeId,
      startAt: start,
      attendeeName,
      attendeeEmail,
    },
  };
}
