import type { MeetingTypeList } from "@calendar/sdk";
import { describe, expect, it } from "vitest";
import { createQueryClient, renderApp } from "./render-app";

const meetingTypes: MeetingTypeList = {
  meetingTypes: [{ id: "intro", name: "Знакомство", durationMinutes: 30 }],
};

describe("app routing", () => {
  it("renders the booking page for a meeting type", () => {
    const markup = renderApp("/book/intro", createQueryClient(meetingTypes));

    expect(markup).toContain("Выбор времени");
    expect(markup).toContain("Знакомство");
  });

  it("lists meeting types on the home page", () => {
    const markup = renderApp("/", createQueryClient(meetingTypes));

    expect(markup).toContain("Знакомство");
    expect(markup).toContain('href="/book/intro"');
  });

  it("follows a meeting type card into the booking page", () => {
    const home = renderApp("/", createQueryClient(meetingTypes));
    const href = home.match(/href="(\/book\/[^"]+)"/)?.[1] ?? "";

    expect(href).not.toBe("");

    const booking = renderApp(href, createQueryClient(meetingTypes));

    expect(booking).toContain("Выбор времени");
    expect(booking).toContain("Знакомство");
  });
});
