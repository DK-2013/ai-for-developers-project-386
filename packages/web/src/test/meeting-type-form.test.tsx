import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MeetingTypeFormView,
  type MeetingTypeFormViewProps,
} from "../components/meeting-type-form";

function renderForm(overrides: Partial<MeetingTypeFormViewProps> = {}): string {
  return renderToStaticMarkup(
    <MeetingTypeFormView status="idle" onCancel={() => {}} onSubmit={() => {}} {...overrides} />,
  );
}

describe("meeting type form", () => {
  it("renders the contract-bounded fields", () => {
    const markup = renderForm();

    expect(markup).toContain('name="name"');
    expect(markup).toContain('maxLength="200"');
    expect(markup).toContain('name="description"');
    expect(markup).toContain('maxLength="2000"');
    expect(markup).toContain('name="durationMinutes"');
    expect(markup).toContain('type="number"');
    expect(markup).toContain('min="15"');
    expect(markup).toContain('max="1440"');
    expect(markup).toContain('step="15"');
    expect(markup).toContain("Создать тип встречи");
  });

  it("shows the API error message", () => {
    const markup = renderForm({
      status: "error",
      message: "durationMinutes must be a multiple of 15",
    });

    expect(markup).toContain("durationMinutes must be a multiple of 15");
  });

  it("renders a cancel action", () => {
    const markup = renderForm();

    expect(markup).toContain("Отмена");
  });

  it("disables the submit and cancel buttons while submitting", () => {
    const markup = renderForm({ status: "submitting" });

    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Создание\.\.\.<\/button>/);
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Отмена<\/button>/);
  });
});
