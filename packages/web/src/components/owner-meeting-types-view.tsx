import type { MeetingType } from "@calendar/sdk";

export type OwnerMeetingTypesViewProps =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; meetingTypes: MeetingType[] };

export function OwnerMeetingTypesView(props: OwnerMeetingTypesViewProps) {
  if (props.status === "loading") {
    return <p className="mt-2 text-muted-foreground">Загрузка...</p>;
  }

  if (props.status === "error") {
    return <p className="mt-2 text-muted-foreground">Не удалось загрузить типы встреч.</p>;
  }

  if (props.meetingTypes.length === 0) {
    return <p className="mt-2 text-muted-foreground">Пока нет типов встреч.</p>;
  }

  return (
    <ul className="mt-4 grid gap-4">
      {props.meetingTypes.map((meetingType) => (
        <li key={meetingType.id} className="rounded-md border border-border p-4">
          <h2 className="text-lg font-semibold">{meetingType.name}</h2>
          {meetingType.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{meetingType.description}</p>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground">{meetingType.durationMinutes} мин</p>
        </li>
      ))}
    </ul>
  );
}
