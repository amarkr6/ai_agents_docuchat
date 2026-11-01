/**
 * FILE: pages/RegisterPage.tsx
 * PURPOSE: Sign-up screen. (The very first account becomes the admin.)
 */
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";
import { AuthForm, TextField } from "../components/AuthForm";

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleRegister() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await register(name, email, password);
      navigate("/documents"); // new users start by uploading a document
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Create your account"
      subtitle="Upload documents and ask questions about them"
      error={error}
      isSubmitting={isSubmitting}
      submitLabel="Sign up"
      onSubmit={handleRegister}
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <TextField label="Name" value={name} onChange={setName} autoComplete="name" />
      <TextField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <TextField label="Password (min 8 characters)" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
    </AuthForm>
  );
}
