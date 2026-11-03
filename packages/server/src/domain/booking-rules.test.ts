import { describe, expect, it } from "vitest";
import { BOOKING_HORIZON_DAYS, SLOT_STEP_MINUTES } from "./booking-rules.js";

describe("booking rules", () => {
  it("stays fixed by the spec instead of becoming configuration", () => {
    expect(BOOKING_HORIZON_DAYS).toBe(14);
    expect(SLOT_STEP_MINUTES).toBe(15);
  });
});
