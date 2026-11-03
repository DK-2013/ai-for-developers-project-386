# Wire time is UTC instants plus the owner's time zone

Every `startAt` and `endAt` on the wire is an RFC 3339 UTC instant, and `SlotList` carries the owner's IANA time zone explicitly. The owner's "today", working hours, and slot grid are computed server-side in that zone. A guest can be in a different zone from the owner, so localizing on the server would produce wall-clock strings that lose the instant and break across DST transitions.

**Considered options:** owner-local naive times (simpler for the guest page, but ambiguous for a guest in another zone and useless for sorting or deduplication).

**Consequences:** the client formats instants itself, and any consumer that groups slots by day needs the `timezone` field.

> Display note superseded: this ADR originally implied the guest calendar renders in the owner's zone. [ADR 0004](0004-guest-calendar-renders-in-guest-timezone.md) moved rendering to the guest's browser zone; the wire decision above stands.
