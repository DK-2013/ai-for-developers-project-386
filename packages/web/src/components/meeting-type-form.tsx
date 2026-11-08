import type { CreateMeetingTypeRequest } from "@calendar/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiClient, meetingTypesQuery } from "../api/queries";
import { buttonClassName } from "../lib/button-classes";

export type MeetingTypeFormStatus = "idle" | "submitting" | "error";

export type MeetingTypeFormViewProps = {
  status: MeetingTypeFormStatus;
  message?: string;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function MeetingTypeFormView({
  status,
  message,
  onCancel,
  onSubmit,
}: MeetingTypeFormViewProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-1 text-sm font-medium">
        Название
        <input
          className="rounded-md border border-border bg-background px-3 py-2"
          maxLength={200}
          name="name"
          ref={nameInputRef}
          required
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Описание (необязательно)
        <textarea
          className="rounded-md border border-border bg-background px-3 py-2"
          maxLength={2000}
          name="description"
          rows={3}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Длительность, минут
        <input
          className="rounded-md border border-border bg-background px-3 py-2"
          defaultValue={30}
          max={1440}
          min={15}
          name="durationMinutes"
          required
          step={15}
          type="number"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button className={buttonClassName} disabled={status === "submitting"} type="submit">
          {status === "submitting" ? "Создание..." : "Создать тип встречи"}
        </button>
        <button
          className={buttonClassName}
          disabled={status === "submitting"}
          onClick={onCancel}
          type="button"
        >
          Отмена
        </button>
      </div>
      {status === "error" && message ? (
        <p className="text-sm text-muted-foreground" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export type MeetingTypeFormProps = {
  onCancel: () => void;
  onSubmittingChange: (isSubmitting: boolean) => void;
  onSuccess: () => void;
};

export function MeetingTypeForm({ onCancel, onSubmittingChange, onSuccess }: MeetingTypeFormProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MeetingTypeFormStatus>("idle");
  const [message, setMessage] = useState<string>();
  const mutation = useMutation({
    mutationFn: (input: CreateMeetingTypeRequest) => apiClient.createMeetingType(input),
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const durationMinutes = Number(formData.get("durationMinutes"));
    const request: CreateMeetingTypeRequest = { name, durationMinutes };

    if (description !== "") {
      request.description = description;
    }

    setStatus("submitting");
    setMessage(undefined);
    onSubmittingChange(true);

    try {
      const result = await mutation.mutateAsync(request);

      if ("code" in result) {
        setStatus("error");
        setMessage(result.message);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: meetingTypesQuery.queryKey });
      form.reset();
      setStatus("idle");
      setMessage(undefined);
      onSuccess();
    } catch (error) {
      console.error("Create meeting type failed", error);
      setStatus("error");
      setMessage("Не удалось создать тип встречи. Попробуйте ещё раз.");
    } finally {
      onSubmittingChange(false);
    }
  }

  return (
    <MeetingTypeFormView
      message={message}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      status={status}
    />
  );
}
