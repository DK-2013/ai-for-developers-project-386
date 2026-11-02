import type { MeetingType } from "@calendar/sdk";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type MeetingTypesViewProps =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; meetingTypes: MeetingType[] };

function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-4xl p-6">{children}</main>;
}

export function MeetingTypesView(props: MeetingTypesViewProps) {
  if (props.status === "loading") {
    return (
      <Page>
        <p className="text-muted-foreground">Загрузка...</p>
      </Page>
    );
  }

  if (props.status === "error") {
    return (
      <Page>
        <p className="text-muted-foreground">Не удалось загрузить типы встреч.</p>
      </Page>
    );
  }

  const { meetingTypes } = props;

  return (
    <Page>
      <h1 className="text-2xl font-bold">Выберите тип встречи</h1>
      {meetingTypes.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Пока нет доступных типов встреч</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {meetingTypes.map((meetingType) => (
            <Link
              key={meetingType.id}
              to={`/book/${meetingType.id}`}
              className="rounded-lg border border-border p-4 hover:bg-muted"
            >
              <h2 className="text-lg font-semibold">{meetingType.name}</h2>
              {meetingType.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{meetingType.description}</p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">
                {meetingType.durationMinutes} мин
              </p>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
