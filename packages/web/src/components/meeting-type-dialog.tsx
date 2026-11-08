import { useEffect, useRef, useState } from "react";
import { MeetingTypeForm } from "./meeting-type-form";

export type MeetingTypeDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function MeetingTypeDialog({ open, onClose, onSuccess }: MeetingTypeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    function handleClick(event: MouseEvent): void {
      if (event.target === dialog && !isSubmitting) {
        onClose();
      }
    }

    dialog.addEventListener("click", handleClick);

    return () => {
      dialog.removeEventListener("click", handleClick);
    };
  }, [isSubmitting, onClose]);

  function requestClose(): void {
    if (isSubmitting) {
      return;
    }

    onClose();
  }

  return (
    <dialog
      aria-labelledby="meeting-type-dialog-title"
      className="m-auto w-[min(32rem,calc(100vw_-_2rem))] rounded-lg border border-border bg-background p-0 text-foreground backdrop:bg-foreground/40"
      onCancel={(event) => {
        if (isSubmitting) {
          event.preventDefault();
        }
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      {open ? (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold" id="meeting-type-dialog-title">
              Новый тип встречи
            </h2>
            <button
              aria-label="Закрыть"
              className="rounded-md border border-border bg-background px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
              disabled={isSubmitting}
              onClick={requestClose}
              type="button"
            >
              ×
            </button>
          </div>
          <MeetingTypeForm
            onCancel={requestClose}
            onSubmittingChange={setIsSubmitting}
            onSuccess={onSuccess}
          />
        </div>
      ) : null}
    </dialog>
  );
}
