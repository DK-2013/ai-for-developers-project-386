import { NavLink, Route, Routes } from "react-router-dom";
import { OwnerBookingsPage } from "./pages/owner-bookings-page";
import { OwnerLayout } from "./pages/owner-layout";
import { OwnerMeetingTypesPage } from "./pages/owner-meeting-types-page";
import { MeetingTypesPage } from "./pages/meeting-types-page";
import { BookingPage } from "./pages/booking-page";

function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
        <NavLink
          className={({ isActive }) =>
            isActive ? "text-lg font-semibold underline" : "text-lg font-semibold"
          }
          end
          to="/"
        >
          Календарь звонков
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            isActive ? "text-sm font-semibold underline" : "text-sm underline"
          }
          to="/owner"
        >
          Личный кабинет
        </NavLink>
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
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<OwnerBookingsPage />} />
          <Route path="meeting-types" element={<OwnerMeetingTypesPage />} />
        </Route>
      </Routes>
    </div>
  );
}
