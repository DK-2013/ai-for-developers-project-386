import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@doc("API for booking calls in an owner's calendar.")
@service(#{ title: "Call Calendar API" })
@server("http://localhost:3000", "Local server")
namespace CallCalendar;

model HealthStatus {
  status: string;
}

model MeetingType {
  id: string;
  @maxLength(200) name: string;
  @maxLength(2000) description?: string;

  /**
   * Slot length in minutes. Must be a multiple of fifteen and at least 15; the
   * upper bound is a sanity check, not the length of the owner's working day.
   */
  @minValue(15) @maxValue(1440) durationMinutes: int32;
}

model MeetingTypeList {
  meetingTypes: MeetingType[];
}

model CreateMeetingTypeRequest {
  @maxLength(200) name: string;
  @maxLength(2000) description?: string;
  @minValue(15) @maxValue(1440) durationMinutes: int32;
}

model Slot {
  startAt: utcDateTime;
  endAt: utcDateTime;
}

model SlotList {
  /** IANA time zone of the calendar owner. */
  timezone: string;

  /** Start of the booking window: midnight today in the owner's time zone. */
  windowStart: utcDateTime;

  /** End of the booking window: midnight 14 days later, exclusive. */
  windowEnd: utcDateTime;

  slots: Slot[];
}

model CreateBookingRequest {
  meetingTypeId: string;
  startAt: utcDateTime;
  @maxLength(200) attendeeName: string;
  @format("email") @maxLength(254) attendeeEmail: string;
}

model Booking {
  id: string;
  meetingTypeId: string;

  /** Meeting type name captured when the booking was created. */
  meetingTypeName: string;

  startAt: utcDateTime;
  endAt: utcDateTime;
  attendeeName: string;
  attendeeEmail: string;
}

model BookingList {
  bookings: Booking[];
}

union ApiErrorCode {
  invalid_request: "invalid_request",
  meeting_type_not_found: "meeting_type_not_found",
  slot_not_available: "slot_not_available",
}

@error
model ApiError {
  code: ApiErrorCode;
  message: string;
}

@route("/healthz")
@get
op healthz(): {
  @statusCode statusCode: 200;
  @body body: HealthStatus;
};

@route("/meeting-types")
@get
@doc("List all meeting types. Public: `owner` is a UI section, not an auth boundary.")
op listMeetingTypes(): {
  @statusCode statusCode: 200;
  @body body: MeetingTypeList;
};

@route("/meeting-types")
@post
@doc("Create a meeting type. Names are not unique.")
op createMeetingType(@body body: CreateMeetingTypeRequest):
  | {
      @statusCode statusCode: 201;
      @body body: MeetingType;
    }
  | {
      @statusCode statusCode: 400;
      @body body: ApiError;
    };

@route("/meeting-types/{id}/slots")
@get
@doc("List free slots in the booking window, on owner-local calendar days.")
op listSlots(@path id: string):
  | {
      @statusCode statusCode: 200;
      @body body: SlotList;
    }
  | {
      @statusCode statusCode: 404;
      @body body: ApiError;
    };

@route("/bookings")
@get
@doc("List bookings that have not ended yet, all meeting types, sorted by startAt.")
op listBookings(): {
  @statusCode statusCode: 200;
  @body body: BookingList;
};

@route("/bookings")
@post
@doc("Book a free slot.")
op createBooking(@body body: CreateBookingRequest):
  | {
      @statusCode statusCode: 201;
      @body body: Booking;
    }
  | {
      @statusCode statusCode: 400;
      @body body: ApiError;
    }
  | {
      @statusCode statusCode: 404;
      @body body: ApiError;
    }
  | {
      @statusCode statusCode: 409;
      @body body: ApiError;
    };
