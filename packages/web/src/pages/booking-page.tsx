import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { meetingTypesQuery } from "../api/queries";

export function BookingPage() {
  const { id } = useParams();
  const { data } = useQuery(meetingTypesQuery);
  const meetingType = data?.meetingTypes.find((item) => item.id === id);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Выбор времени</h1>
      {meetingType ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {meetingType.name} · {meetingType.durationMinutes} мин
        </p>
      ) : null}
      <p className="mt-2 text-muted-foreground">
        Свободные слоты и форма записи появятся, когда будет подключён движок бронирования.
      </p>
      <Link className="mt-4 inline-block underline" to="/">
        Назад к списку типов встреч
      </Link>
    </main>
  );
}
