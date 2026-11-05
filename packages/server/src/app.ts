import type { IncomingMessage, ServerResponse } from "node:http";
import { Temporal } from "temporal-polyfill";
import type { Booking } from "./bookings/domain.js";
import { BookingConflictError, createBookingRepository } from "./bookings/repository.js";
import { parseCreateBookingRequest } from "./bookings/validation.js";
import type { Clock } from "./clock.js";
import type { OwnerConfig } from "./config.js";
import type { Database } from "./db/schema.js";
import { bookableSlot, computeSlots } from "./domain/slots.js";
import { bookingWindow } from "./domain/time/index.js";
import type { HttpContext } from "./generated/helpers/router.js";
import { createCallCalendarRouter } from "./generated/http/router.js";
import type {
  ApiError,
  Booking as WireBooking,
  CreateMeetingTypeRequest,
  MeetingType as WireMeetingType,
  SlotList,
} from "./generated/models/all/call-calendar.js";
import type { CallCalendar } from "./generated/models/all/index.js";
import type { MeetingType } from "./meeting-types/domain.js";
import { createMeetingTypeRepository } from "./meeting-types/repository.js";
import { parseCreateMeetingTypeRequest } from "./meeting-types/validation.js";
import { createSlotRepository } from "./slots/repository.js";

export type RequestHandlerDependencies = {
  db: Database;
  owner: OwnerConfig;
  clock: Clock;
};

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function apiError(code: ApiError["code"], message: string): ApiError {
  return { code, message };
}

function toWireMeetingType(meetingType: MeetingType): WireMeetingType {
  const wire: WireMeetingType = {
    id: meetingType.id,
    name: meetingType.name,
    durationMinutes: meetingType.durationMinutes,
  };

  if (meetingType.description !== undefined) {
    wire.description = meetingType.description;
  }

  return wire;
}

function toWireBooking(booking: Booking): WireBooking {
  return {
    id: booking.id,
    meetingTypeId: booking.meetingTypeId,
    meetingTypeName: booking.meetingTypeName,
    startAt: booking.startAt,
    endAt: booking.endAt,
    attendeeName: booking.attendeeName,
    attendeeEmail: booking.attendeeEmail,
  };
}

export function createRequestHandler({
  db,
  owner,
  clock,
}: RequestHandlerDependencies): (request: IncomingMessage, response: ServerResponse) => void {
  const meetingTypes = createMeetingTypeRepository(db);
  const slots = createSlotRepository(db);
  const bookings = createBookingRepository(db);

  const service: CallCalendar<HttpContext> = {
    async healthz() {
      return {
        statusCode: 200 as const,
        body: { status: "ok" },
      };
    },

    async listMeetingTypes() {
      const savedMeetingTypes = await meetingTypes.list();

      return {
        statusCode: 200 as const,
        body: { meetingTypes: savedMeetingTypes.map(toWireMeetingType) },
      };
    },

    async createMeetingType(_ctx, body: CreateMeetingTypeRequest) {
      const parsed = parseCreateMeetingTypeRequest(body);

      if (!parsed.ok) {
        return {
          statusCode: 400 as const,
          body: apiError("invalid_request", parsed.message),
        };
      }

      const meetingType = await meetingTypes.create(parsed.value);

      return {
        statusCode: 201 as const,
        body: toWireMeetingType(meetingType),
      };
    },

    async listSlots(_ctx, id) {
      const meetingType = await meetingTypes.findById(id);

      if (meetingType === undefined) {
        return {
          statusCode: 404 as const,
          body: apiError("meeting_type_not_found", "Meeting type not found"),
        };
      }

      const now = clock();
      const instant = Temporal.Instant.fromEpochMilliseconds(now.getTime());
      const window = bookingWindow(instant, owner.timeZone);
      const occupied = await slots.listOccupied(window);
      const result = computeSlots({
        now: instant,
        owner,
        durationMinutes: meetingType.durationMinutes,
        occupied,
      });

      const body: SlotList = {
        timezone: owner.timeZone,
        windowStart: result.window.start,
        windowEnd: result.window.end,
        slots: result.slots.map((slot) => ({ startAt: slot.start, endAt: slot.end })),
      };

      return {
        statusCode: 200 as const,
        body,
      };
    },

    async listBookings() {
      return {
        statusCode: 200 as const,
        body: { bookings: [] },
      };
    },

    async createBooking(_ctx, body) {
      const parsed = parseCreateBookingRequest(body);

      if (!parsed.ok) {
        return {
          statusCode: 400 as const,
          body: apiError("invalid_request", parsed.message),
        };
      }

      const meetingType = await meetingTypes.findById(parsed.value.meetingTypeId);

      if (meetingType === undefined) {
        return {
          statusCode: 404 as const,
          body: apiError("meeting_type_not_found", "Meeting type not found"),
        };
      }

      const now = clock();
      const instant = Temporal.Instant.fromEpochMilliseconds(now.getTime());
      const slot = bookableSlot({
        now: instant,
        owner,
        durationMinutes: meetingType.durationMinutes,
        start: parsed.value.startAt,
      });

      if (slot === undefined) {
        return {
          statusCode: 409 as const,
          body: apiError("slot_not_available", "Slot is not available"),
        };
      }

      let booking: Booking;

      try {
        booking = await bookings.create({
          meetingTypeId: meetingType.id,
          meetingTypeName: meetingType.name,
          attendeeName: parsed.value.attendeeName,
          attendeeEmail: parsed.value.attendeeEmail,
          startAt: slot.start,
          endAt: slot.end,
        });
      } catch (error) {
        if (error instanceof BookingConflictError) {
          return {
            statusCode: 409 as const,
            body: apiError("slot_not_available", "Slot is not available"),
          };
        }

        throw error;
      }

      return {
        statusCode: 201 as const,
        body: toWireBooking(booking),
      };
    },
  };

  const router = createCallCalendarRouter(service, {
    onRequestNotFound(ctx) {
      sendJson(ctx.response, 404, apiError("invalid_request", "Not Found"));
    },
    onInvalidRequest(ctx) {
      sendJson(ctx.response, 400, apiError("invalid_request", "Malformed request"));
    },
    onInternalError(ctx, error) {
      // The generated body parser reports malformed JSON through onInvalidRequest
      // and then rejects, which the router routes here. That response is already
      // sent, so only log errors that still need a 500.
      if (ctx.response.headersSent || ctx.response.writableEnded) {
        return;
      }

      console.error("Unexpected request error", error);
      // A 500 is outside the contract, so it deliberately does not reuse ApiError:
      // its `code` union only describes errors the API promises to return.
      sendJson(ctx.response, 500, { message: "Internal Server Error" });
    },
  });

  return (request, response) => {
    router.dispatch(request, response);
  };
}
