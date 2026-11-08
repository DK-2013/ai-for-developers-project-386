import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { meetingTypesQuery } from "../api/queries";
import { MeetingTypeDialog } from "../components/meeting-type-dialog";
import { OwnerMeetingTypesView } from "../components/owner-meeting-types-view";
import { buttonClassName } from "../lib/button-classes";

export function OwnerMeetingTypesPage() {
  const { data, isLoading, isError } = useQuery(meetingTypesQuery);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string>();

  function openDialog(): void {
    setConfirmationMessage(undefined);
    setIsDialogOpen(true);
  }

  function closeDialog(): void {
    setIsDialogOpen(false);
  }

  function handleSuccess(): void {
    setIsDialogOpen(false);
    setConfirmationMessage("Тип встречи создан.");
  }

  return (
    <>
      <section className="mt-6">
        <h1 className="text-2xl font-bold">Типы встреч</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={buttonClassName} onClick={openDialog} type="button">
            Добавить тип встречи
          </button>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {confirmationMessage}
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
