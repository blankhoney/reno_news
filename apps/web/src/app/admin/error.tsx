"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="admin-shell">
      <h1>Admin Error</h1>
      <p>{error.message}</p>
      <button type="button" onClick={reset}>
        Retry
      </button>
    </main>
  );
}
