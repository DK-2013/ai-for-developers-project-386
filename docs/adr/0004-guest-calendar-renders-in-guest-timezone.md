# Guest calendar renders in the guest's browser time zone

The guest-facing calendar shows slots in the time zone of the guest's browser; the owner's time zone is displayed alongside as reference information. This supersedes the earlier display rule ("the calendar is shown in the owner's zone") from [ADR 0002](0002-wire-time-is-utc-instants.md); its wire decision is unchanged: instants stay UTC on the wire, and the owner's zone still defines "today", the booking window, and the slot grid.

**Considered options:** render in the owner's zone with per-slot conversion for the guest (more faithful to the owner's grid, but forces every guest to do mental arithmetic and makes the owner's zone load-bearing in the UI).

**Consequences:** the client needs only the UTC instants and the browser zone to render; the `timezone` field in `SlotList` remains for reference display and for any consumer that groups slots by owner-local day. Product wording lives in `docs/SPEC.md`.
