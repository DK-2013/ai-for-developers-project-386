import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { meetingTypesQuery } from "../api/queries";
import { MeetingTypeDialog } from "../components/meeting-type-dialog";
import { OwnerMeetingTypesView } from "../components/owner-meeting-types-view";

export function OwnerMeetingTypesPage() {
  const { data, isLoading, isError } = useQuery(meetingTypesQuery);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<string>();

  function openDialog(): void {
    setConfirmation(undefined);
    setIsDialogOpen(true);
  }

  function closeDialog(): void {
    setIsDialogOpen(false);
  }

  function handleSuccess(): void {
    setIsDialogOpen(false);
    setConfirmation("Тип встречи создан.");
  }

  return (
    <>
      <section className="mt-6">
        <h1 className="text-2xl font-bold">Типы встреч</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="rounded-md border border-border bg-background px-4 py-2 hover:bg-muted"
            onClick={openDialog}
            type="button"
          >
            Добавить тип встречи
          </button>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {confirmation}
          </p>
        </div>
        {isLoading ? <OwnerMeetingTypesView status="loading" /> : null}
        {isError ? <OwnerMeetingTypesView status="error" /> : null}
        {data ? <OwnerMeetingTypesView status="ready" meetingTypes={data.meetingTypes} /> : null}
      </section>
      <MeetingTypeDialog open={isDialogOpen} onClose={closeDialog} onSuccess={handleSuccess} />
    </>
  );
}
