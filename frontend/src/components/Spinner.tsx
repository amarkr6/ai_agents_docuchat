/**
 * FILE: components/Spinner.tsx
 * PURPOSE: Small reusable loading spinner.
 */
export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${className} animate-spin rounded-full border-2 border-zinc-300 border-t-brand-600`}
    />
  );
}
