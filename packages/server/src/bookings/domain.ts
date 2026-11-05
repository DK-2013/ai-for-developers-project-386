import type { Temporal } from "temporal-polyfill";

/** A validated booking request plus the facts the handler resolves. */
export type NewBooking = {
  meetingTypeId: string;
  meetingTypeName: string;
  attendeeName: string;
  attendeeEmail: string;
  startAt: Temporal.Instant;
  endAt: Temporal.Instant;
};

/** A booking as stored in the database. */
export type Booking = NewBooking & {
  id: string;
};
