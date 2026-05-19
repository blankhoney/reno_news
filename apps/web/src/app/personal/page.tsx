import Link from "next/link";
import { PersonalPageClient } from "../PersonalPageClient";

export default function PersonalPage() {
  return (
    <main className="reader-shell">
      <header className="reader-header">
        <div>
          <Link href="/">Home</Link>
          <h1>Personal</h1>
          <p>Saved and read-later items stay in this browser.</p>
        </div>
        <Link href="/admin">Admin</Link>
      </header>

      <PersonalPageClient />
    </main>
  );
}
