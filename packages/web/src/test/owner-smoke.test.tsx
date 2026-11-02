import { describe, expect, it } from "vitest";
import { renderApp } from "./render-app";

describe("web smoke test", () => {
  it("renders the public page", () => {
    const markup = renderApp("/");

    expect(markup).toContain("Календарь звонков");
    expect(markup).toContain('href="/owner"');
  });

  it("renders the owner cabinet", () => {
    const markup = renderApp("/owner");

    expect(markup).toContain("Личный кабинет");
  });
});
