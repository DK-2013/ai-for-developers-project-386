import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "../app";

function renderAt(path: string): string {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

  return markup;
}

describe("web smoke test", () => {
  it("renders the public page", () => {
    const markup = renderAt("/");

    expect(markup).toContain("Календарь звонков");
    expect(markup).toContain('href="/owner"');
  });

  it("renders the owner cabinet", () => {
    const markup = renderAt("/owner");

    expect(markup).toContain("Личный кабинет");
  });
});
