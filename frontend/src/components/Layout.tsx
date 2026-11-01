/**
 * FILE: components/Layout.tsx
 * PURPOSE: Page frame shown after login — top navigation bar + page content.
 *
 * <Outlet /> is where React Router renders the current page (Chat, Documents…).
 */
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  editor: "bg-brand-100 text-brand-700",
  viewer: "bg-zinc-200 text-zinc-700",
};

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation links. The Admin link only appears for admins.
  const links = [
    { to: "/", label: "Chat" },
    { to: "/documents", label: "Documents" },
    { to: "/metrics", label: "Metrics" },
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b border-zinc-200 bg-white px-4">
        <span className="text-lg font-semibold tracking-tight">
          📄 DocuChat <span className="text-brand-600">AI</span>
        </span>

        <nav className="flex gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden text-zinc-600 sm:inline">{user?.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user?.role ?? "viewer"]}`}>
            {user?.role}
          </span>
          <button onClick={handleLogout} className="rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100">
            Log out
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
