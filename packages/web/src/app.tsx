import { Link, Route, Routes } from "react-router-dom";
import { OwnerPage } from "./pages/owner-page";
import { MeetingTypesPage } from "./pages/meeting-types-page";
import { BookingPage } from "./pages/booking-page";

function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
        <Link className="text-lg font-semibold" to="/">
          Календарь звонков
        </Link>
        <Link className="text-sm underline" to="/owner">
          Личный кабинет
        </Link>
      </div>
    </header>
  );
}

export function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Routes>
        <Route path="/" element={<MeetingTypesPage />} />
        <Route path="/book/:id" element={<BookingPage />} />
        <Route path="/owner" element={<OwnerPage />} />
      </Routes>
    </div>
  );
}
