import Link from "next/link";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/admin");
  const errorMessage = loginErrorMessage(params.error);

  return (
    <main className="reader-shell login-shell">
      <header className="reader-header">
        <div>
          <Link href="/">Home</Link>
          <h1>Admin login</h1>
        </div>
      </header>

      <form className="login-form" action={loginFormAction(next)} method="post">
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit">Log in</button>
      </form>
    </main>
  );
}

export function loginFormAction(next: string | undefined): string {
  const params = new URLSearchParams();
  params.set("next", safeNextPath(next, "/admin"));
  return `/api/auth/login?${params.toString()}`;
}

export function loginErrorMessage(error: string | undefined): string | null {
  switch (error) {
    case undefined:
      return null;
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "admin_required":
      return "Login with an admin account to continue.";
    default:
      return "Login failed. Try again.";
  }
}

function safeNextPath(value: string | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}
