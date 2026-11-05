import type { IncomingMessage, ServerResponse } from "node:http";
import { Temporal } from "temporal-polyfill";
import type { Clock } from "./clock.js";
import type { OwnerConfig } from "./config.js";
import type { Database } from "./db/schema.js";
import type { HttpContext } from "./generated/helpers/router.js";
import { createCallCalendarRouter } from "./generated/http/router.js";
import type {
  ApiError,
  CreateMeetingTypeRequest,
  SlotList,
} from "./generated/models/all/call-calendar.js";
import type { CallCalendar } from "./generated/models/all/index.js";
import { createMeetingTypeRepository } from "./meeting-types/repository.js";
import { parseCreateMeetingTypeRequest } from "./meeting-types/validation.js";

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

export function createRequestHandler({
  db,
  owner,
  clock,
}: RequestHandlerDependencies): (request: IncomingMessage, response: ServerResponse) => void {
  const meetingTypes = createMeetingTypeRepository(db);

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
        body: { meetingTypes: savedMeetingTypes },
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
        body: meetingType,
      };
    },

    async listSlots(_ctx, _id) {
      const now = clock();
      const instant = Temporal.Instant.fromEpochMilliseconds(now.getTime());

      const body: SlotList = {
        timezone: owner.timeZone,
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
    onInternalError(ctx, error) {
      // The generated body parser reports malformed JSON through onInvalidRequest
      // and then rejects, which the router routes here. That response is already
      // sent, so only log errors that still need a 500.
      if (ctx.response.headersSent || ctx.response.writableEnded) {
        return;
      }

      console.error("Unexpected request error", error);
      sendJson(ctx.response, 500, apiError("invalid_request", "Internal Server Error"));
    },
  });

  return (request, response) => {
    router.dispatch(request, response);
  };
}
