/**
 * FILE: App.tsx
 * PURPOSE: Defines all the pages (routes) of the app.
 *
 *   /login, /register      -> public pages
 *   /, /documents, /metrics -> any logged-in user
 *   /admin                 -> admins only
 */
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ChatPage } from "./pages/ChatPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { MetricsPage } from "./pages/MetricsPage";
import { AdminPage } from "./pages/AdminPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Every route inside here shares the Layout (top navigation) and needs login */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<ChatPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Unknown URL -> home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
