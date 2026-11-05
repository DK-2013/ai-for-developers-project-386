import { Temporal } from "temporal-polyfill";

/** Adapts a database `timestamptz` value to a domain instant. */
export function toInstant(date: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

/** Adapts a domain instant to a database `timestamptz` value. */
export function toDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}
