import { NavLink, Outlet } from "react-router-dom";

function tabClassName({ isActive }: { isActive: boolean }): string {
  return isActive
    ? "border-b-2 border-foreground pb-2 text-sm font-semibold"
    : "border-b-2 border-transparent pb-2 text-sm text-muted-foreground hover:text-foreground";
}

export function OwnerLayout() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <nav aria-label="Разделы личного кабинета" className="flex gap-6 border-b border-border">
        <NavLink className={tabClassName} end to="/owner">
          Встречи
        </NavLink>
        <NavLink className={tabClassName} to="/owner/meeting-types">
          Типы встреч
        </NavLink>
      </nav>
      <Outlet />
    </main>
  );
}
