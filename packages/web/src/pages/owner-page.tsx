import { MeetingTypeForm } from "../components/meeting-type-form";

export function OwnerPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Личный кабинет</h1>
      <p className="mt-2 text-muted-foreground">
        Учебный каркас: личный кабинет владельца календаря.
      </p>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Новый тип встречи</h2>
        <MeetingTypeForm />
      </section>
    </main>
  );
}
