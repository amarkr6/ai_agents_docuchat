/**
 * FILE: pages/LoginPage.tsx
 * PURPOSE: Email + password login screen.
 */
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";
import { AuthForm, TextField } from "../components/AuthForm";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />; // already logged in

  async function handleLogin() {
    setIsSubmitting(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Log in to chat with your documents"
      error={error}
      isSubmitting={isSubmitting}
      submitLabel="Log in"
      onSubmit={handleLogin}
      footer={
        <>
          No account?{" "}
          <Link to="/register" className="font-medium text-brand-700 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <TextField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <TextField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
    </AuthForm>
  );
}
