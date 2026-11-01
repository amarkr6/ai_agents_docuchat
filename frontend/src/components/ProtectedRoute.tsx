/**
 * FILE: components/ProtectedRoute.tsx
 * PURPOSE: Wrapper for pages that require login (and optionally a role).
 *
 *   <ProtectedRoute>                 -> any logged-in user
 *   <ProtectedRoute roles={["admin"]}> -> admins only
 *
 * NOTE: This only hides pages in the UI. The REAL security check happens in
 * the backend (requireAuth / requireRole middleware).
 */
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";
import { Spinner } from "./Spinner";

interface Props {
  children: ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
