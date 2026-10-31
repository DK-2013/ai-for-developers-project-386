import { Link, Route, Routes } from "react-router-dom";
import { OwnerPage } from "./pages/owner-page";

function HomePage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Календарь звонков</h1>
      <p className="mt-2 text-muted-foreground">Публичная страница записи появится позже.</p>
      <Link className="mt-4 inline-block underline" to="/owner">
        Личный кабинет
      </Link>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/owner" element={<OwnerPage />} />
    </Routes>
  );
}
