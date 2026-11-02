# Slots are computed, not stored

Free slots are derived on demand from working hours, the booking window, the meeting type duration, and existing bookings; there is no `slots` table. Materializing them would need a writer reacting to every change of working hours, meeting type duration, and every clock tick, and would leave stale rows whenever the window slides. Overlap protection belongs to the database alone: `EXCLUDE USING gist (tstzrange(start_at, end_at, '[)') WITH &&)`.

**Considered options:** materialize slots on a schedule (fast reads, but a second source of truth that can disagree with `bookings`); pre-check overlaps in application code (loses a race to a concurrent insert, so the constraint is still required).
