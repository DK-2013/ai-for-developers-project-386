import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MeetingTypeDialog } from "../components/meeting-type-dialog";

function renderDialog(open: boolean): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MeetingTypeDialog open={open} onClose={() => {}} onSuccess={() => {}} />
    </QueryClientProvider>,
  );
}

describe("meeting type dialog", () => {
  it("renders the form only while it is open", () => {
    expect(renderDialog(false)).not.toContain('name="name"');

    const markup = renderDialog(true);

    expect(markup).toContain("<dialog");
    expect(markup).toContain('name="name"');
    expect(markup).toContain('name="description"');
    expect(markup).toContain('name="durationMinutes"');
    expect(markup).toContain("Закрыть");
    expect(markup).toContain("Создать тип встречи");
    expect(markup).toContain("Отмена");
  });
});
