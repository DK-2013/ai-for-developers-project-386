import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@doc("API for booking calls in an owner's calendar.")
@service(#{ title: "Call Calendar API" })
@server("http://localhost:3000", "Local server")
namespace CallCalendar;

model CalendarConfig {
  timezone: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: int32[];
  slotStepMinutes: int32;
  horizonDays: int32;
  today: string;
}

model HealthStatus {
  status: string;
}

@route("/healthz")
@get
op healthz(): {
  @statusCode statusCode: 200;
  @body body: HealthStatus;
};

