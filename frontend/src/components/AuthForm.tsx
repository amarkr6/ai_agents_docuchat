/**
 * FILE: components/AuthForm.tsx
 * PURPOSE: Shared card layout for the Login and Register pages.
 */
import type { FormEvent, ReactNode } from "react";

interface Props {
  title: string;
  subtitle: string;
  error: string;
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: () => void;
  footer: ReactNode;
  children: ReactNode;
}

export function AuthForm({ title, subtitle, error, isSubmitting, submitLabel, onSubmit, footer, children }: Props) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the browser from reloading the page
    onSubmit();
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-zinc-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="text-3xl">📄</div>
          <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>

        {children}

        {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Please wait…" : submitLabel}
        </button>

        <p className="text-center text-sm text-zinc-600">{footer}</p>
      </form>
    </div>
  );
}

/** Labeled input used inside AuthForm. */
export function TextField(props: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{props.label}</span>
      <input
        required
        type={props.type ?? "text"}
        value={props.value}
        autoComplete={props.autoComplete}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
