export function OwnerPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Личный кабинет</h1>
      <p className="mt-2 text-muted-foreground">
        Учебный каркас: личный кабинет владельца календаря.
      </p>
      <button
        className="mt-4 rounded-md border border-border bg-background px-4 py-2 hover:bg-muted"
        type="button"
      >
        Загрузить встречи
      </button>
    </main>
  );
}
