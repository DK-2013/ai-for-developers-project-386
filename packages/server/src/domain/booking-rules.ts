/**
 * Rules fixed by `docs/SPEC.md`: the booking window spans 14 calendar days and
 * available starts are 15 minutes apart. Changing them is a spec change, not a
 * configuration change.
 */
export const BOOKING_HORIZON_DAYS = 14;
export const SLOT_STEP_MINUTES = 15;
