import { describe, expect, it } from "vitest";
import { ConfigError, parseConfig } from "./config.js";

describe("parseConfig", () => {
  it("applies the documented defaults", () => {
    const config = parseConfig({});

    expect(config.port).toBe(3000);
    expect(config.databaseUrl).toBe("postgres://postgres:postgres@localhost:5432/call_calendar");
    expect(config.owner.timeZone).toBe("Europe/Moscow");
    expect(config.owner.workingHours.start.toString()).toBe("10:00:00");
    expect(config.owner.workingHours.end.toString()).toBe("18:00:00");
    expect(config.owner.workingDays).toEqual([1, 2, 3, 4, 5]);
  });

  it("reads overrides and sorts working days", () => {
    const config = parseConfig({
      PORT: "4000",
      DATABASE_URL: "postgresql://postgres:postgres@db:5432/call_calendar_test",
      OWNER_TIMEZONE: "Europe/Berlin",
      WORKING_HOURS_START: "09:30",
      WORKING_HOURS_END: "17:00",
      WORKING_DAYS: "5,1,3",
    });

    expect(config.port).toBe(4000);
    expect(config.databaseUrl).toBe("postgresql://postgres:postgres@db:5432/call_calendar_test");
    expect(config.owner.timeZone).toBe("Europe/Berlin");
    expect(config.owner.workingHours.start.toString()).toBe("09:30:00");
    expect(config.owner.workingHours.end.toString()).toBe("17:00:00");
    expect(config.owner.workingDays).toEqual([1, 3, 5]);
  });

  it("rejects a non-numeric port", () => {
    expect(() => parseConfig({ PORT: "api" })).toThrow(ConfigError);
  });

  it("rejects an out-of-range port", () => {
    expect(() => parseConfig({ PORT: "70000" })).toThrow(ConfigError);
  });

  it("rejects an unknown time zone", () => {
    expect(() => parseConfig({ OWNER_TIMEZONE: "Mars/Olympus" })).toThrow(ConfigError);
  });

  it("rejects a working day outside ISO weekdays", () => {
    expect(() => parseConfig({ WORKING_DAYS: "1,8" })).toThrow(ConfigError);
  });

  it("rejects reversed working hours", () => {
    const env = { WORKING_HOURS_START: "18:00", WORKING_HOURS_END: "10:00" };

    expect(() => parseConfig(env)).toThrow(ConfigError);
  });

  it("rejects a database URL that is not PostgreSQL", () => {
    expect(() => parseConfig({ DATABASE_URL: "mysql://localhost/db" })).toThrow(ConfigError);
  });

  it("reports every problem at once", () => {
    const env = { PORT: "api", WORKING_DAYS: "0" };

    expect(() => parseConfig(env)).toThrow(/PORT[\s\S]*WORKING_DAYS/);
  });
});
