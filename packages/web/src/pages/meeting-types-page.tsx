import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CallCalendarClient } from "@calendar/sdk";

const client = new CallCalendarClient({ endpoint: "/api" });

export function MeetingTypesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["meeting-types"],
    queryFn: () => client.listMeetingTypes(),
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-muted-foreground">Загрузка...</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-muted-foreground">Не удалось загрузить типы встреч.</p>
      </main>
    );
  }

  const meetingTypes = data?.meetingTypes ?? [];

  return (
    <main className="mx-auto max-w-4xl p-6">
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
    </main>
  );
}
