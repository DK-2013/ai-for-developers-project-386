import { describe, expect, it } from "vitest";
import { renderApp } from "./render-app";

describe("web smoke test", () => {
  it("renders the public page", () => {
    const markup = renderApp("/");

    expect(markup).toContain("Календарь звонков");
    expect(markup).toContain('href="/owner"');
  });

  it("renders the owner cabinet with the creation form", () => {
    const markup = renderApp("/owner");

    expect(markup).toContain("Личный кабинет");
    expect(markup).toContain("Новый тип встречи");
    expect(markup).toContain('name="name"');
    expect(markup).toContain('name="durationMinutes"');
    expect(markup).toContain("Создать тип встречи");
  });
});
