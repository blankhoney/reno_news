import Link from "next/link";

export default function AdminDeniedPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <Link href="/">Home</Link>
          <h1>Admin access required</h1>
          <p>This area requires an authenticated admin session.</p>
          <Link href={adminDeniedLoginPath()}>Log in</Link>
        </div>
      </header>
    </main>
  );
}

export function adminDeniedLoginPath(): string {
  const params = new URLSearchParams({ next: "/admin" });
  return `/login?${params.toString()}`;
}
