import type { IncomingMessage, ServerResponse } from "node:http";
import { Temporal } from "temporal-polyfill";
import type { HttpContext } from "./generated/helpers/router.js";
import { createCallCalendarRouter } from "./generated/http/router.js";
import type {
  ApiError,
  CreateMeetingTypeRequest,
  MeetingType,
  SlotList,
} from "./generated/models/all/call-calendar.js";
import type { CallCalendar } from "./generated/models/all/index.js";

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function apiError(code: ApiError["code"], message: string): ApiError {
  return { code, message };
}

/**
 * Placeholder implementation. Persistence and the booking engine are not wired
 * yet, so the handlers answer with empty data and fixed responses. Keeping them
 * here keeps the generated router, the contract types, and the HTTP surface in
 * sync while the domain layer is built.
 */
const service: CallCalendar<HttpContext> = {
  async healthz() {
    return {
      statusCode: 200 as const,
      body: { status: "ok" },
    };
  },

  async listMeetingTypes() {
    return {
      statusCode: 200 as const,
      body: { meetingTypes: [] },
    };
  },

  async createMeetingType(_ctx, body: CreateMeetingTypeRequest) {
    const meetingType: MeetingType = {
      id: "placeholder",
      name: body.name,
      durationMinutes: body.durationMinutes,
    };

    if (body.description !== undefined) {
      meetingType.description = body.description;
    }

    return {
      statusCode: 201 as const,
      body: meetingType,
    };
  },

  async listSlots(_ctx, _id) {
    const instant = Temporal.Now.instant();

    const body: SlotList = {
      timezone: "UTC",
      windowStart: instant,
      windowEnd: instant,
      slots: [],
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

  async createBooking() {
    return {
      statusCode: 409 as const,
      body: apiError("slot_not_available", "Slot is not available"),
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
});

export function requestHandler(request: IncomingMessage, response: ServerResponse): void {
  router.dispatch(request, response);
}
