# Call Calendar

A single owner publishes meeting types and free slots; guests book a slot without authenticating, and no two bookings may overlap.

## Language

**Owner**:
The one person whose calendar the app publishes. Fixed by configuration, not identified by credentials.
_Avoid_: User, admin, host, account

**Guest**:
A visitor who books a slot without registering.
_Avoid_: Client, customer, attendee

**Attendee**:
The person named on a booking. Usually the guest, but not necessarily the person making the request.
_Avoid_: Participant

**Meeting type**:
A named, described kind of meeting with a fixed duration in minutes. A guest picks a meeting type, never a raw time range.
_Avoid_: Event type, appointment type, slot type

**Slot**:
A proposed start and end instant that a guest may book. Slots are computed, never stored.
_Avoid_: Time slot, timeslot, availability block

**Bookable start**:
A start instant that passes every structural rule: on the slot grid, inside working hours and working days, inside the booking window, not in the past, and leaving room for the meeting type's full duration before the working day ends.
_Avoid_: Valid slot, free slot (free means "not booked", which is a different check)

**Booking**:
A committed reservation of one slot by one guest. The meeting type name and the end instant are captured when it is created.
_Avoid_: Appointment, reservation, meeting

**Booking conflict**:
A booking whose interval overlaps another booking's interval. Touching endpoints do not conflict.
_Avoid_: Collision, double booking, overlap error

**Booking window**:
The 14 owner-local calendar days a guest may book into. The half-interval [today 00:00, today + 14 days 00:00) in the owner's time zone: slots exist from today through today+13 inclusive, and the window slides forward every day.
_Avoid_: Horizon, range, period

**Working hours**:
The owner-local time-of-day range and weekdays during which slots exist.
_Avoid_: Business hours, office hours, schedule

**Slot step**:
The fixed 15-minute spacing between bookable start instants.
_Avoid_: Interval, granularity

**Owner time zone**:
The IANA zone that defines the owner's calendar days, working hours, and what "today" means. Instants are always stored and transmitted in UTC.
_Avoid_: Local time, server time zone, timezone setting

**Guest time zone**:
The IANA zone of the guest's browser. The guest-facing calendar renders in it, with the owner's zone shown as reference; it never affects the slot grid, which is fixed by the owner's zone.
_Avoid_: Display zone, user locale
