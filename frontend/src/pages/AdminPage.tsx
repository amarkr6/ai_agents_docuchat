/**
 * FILE: pages/AdminPage.tsx
 * PURPOSE: Admin-only screen to view users and change their roles.
 */
import { useEffect, useState } from "react";
import { listUsersApi, updateUserRoleApi } from "../api/users.api";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/Spinner";
import type { User, UserRole } from "../types";

const ROLES: { value: UserRole; description: string }[] = [
  { value: "admin", description: "Manage users, see all documents & metrics" },
  { value: "editor", description: "Upload, share and chat with documents" },
  { value: "viewer", description: "Chat only with shared/public documents" },
];

export function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    listUsersApi().then(setUsers).catch((err) => setError(getErrorMessage(err)));
  }, []);

  async function changeRole(userId: string, role: UserRole) {
    setError("");
    setMessage("");
    try {
      const updated = await updateUserRoleApi(userId, role);
      setUsers((current) => current?.map((u) => (u.id === userId ? updated : u)) ?? null);
      setMessage(`${updated.name} is now ${updated.role}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">User management</h1>

        <ul className="mt-3 space-y-1 text-sm text-zinc-600">
          {ROLES.map((r) => (
            <li key={r.value}>
              <b className="text-zinc-800">{r.value}</b> — {r.description}
            </li>
          ))}
        </ul>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p className="mt-4 rounded-md bg-brand-50 p-3 text-sm text-brand-700">{message}</p>}

        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {!users ? (
            <div className="flex justify-center p-10">
              <Spinner />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium">
                      {u.name} {u.id === currentUser?.id && <span className="text-xs text-zinc-500">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={u.id === currentUser?.id}
                        onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                        className="rounded-md border border-zinc-300 px-2 py-1 disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.value}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
