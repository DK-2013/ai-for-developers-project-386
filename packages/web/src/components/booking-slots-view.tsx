import type { MeetingType, Slot } from "@calendar/sdk";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatSlotTime, groupSlotsByDay } from "../lib/slots";

type MeetingTypeSummary = Pick<MeetingType, "name" | "durationMinutes">;

export type BookingSlotsViewProps =
  | { status: "loading"; meetingType?: MeetingTypeSummary }
  | { status: "error"; meetingType?: MeetingTypeSummary; message: string }
  | {
      status: "ready";
      meetingType?: MeetingTypeSummary;
      timezone: string;
      guestTimeZone: string;
      slots: readonly Slot[];
    };

function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-4xl p-6">{children}</main>;
}

function MeetingTypeHeading({ meetingType }: { meetingType?: MeetingTypeSummary }) {
  if (meetingType === undefined) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-muted-foreground">
      {meetingType.name} · {meetingType.durationMinutes} мин
    </p>
  );
}

function SlotsContent({ props }: { props: Extract<BookingSlotsViewProps, { status: "ready" }> }) {
  const groups = groupSlotsByDay(props.slots, props.guestTimeZone);

  if (groups.length === 0) {
    return <p className="mt-6 text-muted-foreground">Нет свободных слотов в ближайшие 14 дней.</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm text-muted-foreground">
        Время в вашем часовом поясе. Часовой пояс владельца: {props.timezone}.
      </p>
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="text-lg font-semibold capitalize">{group.heading}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {group.slots.map((slot) => (
              <li key={slot.startAt.toISOString()}>
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  {formatSlotTime(slot.startAt, props.guestTimeZone)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function BookingSlotsView(props: BookingSlotsViewProps) {
  return (
    <Page>
      <h1 className="text-2xl font-bold">Выбор времени</h1>
      <MeetingTypeHeading meetingType={props.meetingType} />
      {props.status === "loading" ? (
        <p className="mt-6 text-muted-foreground">Загрузка...</p>
      ) : null}
      {props.status === "error" ? (
        <p className="mt-6 text-muted-foreground">{props.message}</p>
      ) : null}
      {props.status === "ready" ? <SlotsContent props={props} /> : null}
      <Link className="mt-6 inline-block underline" to="/">
        Назад к списку типов встреч
      </Link>
    </Page>
  );
}
