import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MeetingTypesView } from "../components/meeting-types-view";

function renderView(props: Parameters<typeof MeetingTypesView>[0]): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <MeetingTypesView {...props} />
    </MemoryRouter>,
  );
}

describe("meeting types view", () => {
  it("shows a loading state", () => {
    const markup = renderView({ status: "loading" });

    expect(markup).toContain("Загрузка...");
  });

  it("shows an error state", () => {
    const markup = renderView({ status: "error" });

    expect(markup).toContain("Не удалось загрузить типы встреч.");
  });

  it("shows an empty state when there are no meeting types", () => {
    const markup = renderView({ status: "ready", meetingTypes: [] });

    expect(markup).toContain("Пока нет доступных типов встреч");
  });

  it("lists meeting types and links each one to its booking page", () => {
    const markup = renderView({
      status: "ready",
      meetingTypes: [
        { id: "intro", name: "Знакомство", description: "Первый звонок", durationMinutes: 30 },
        { id: "deep-dive", name: "Разбор", durationMinutes: 60 },
      ],
    });

    expect(markup).toContain("Знакомство");
    expect(markup).toContain("Первый звонок");
    expect(markup).toContain("30 мин");
    expect(markup).toContain("Разбор");
    expect(markup).toContain("60 мин");
    expect(markup).toContain('href="/book/intro"');
    expect(markup).toContain('href="/book/deep-dive"');
    expect(markup).not.toContain("Пока нет доступных типов встреч");
  });
});
