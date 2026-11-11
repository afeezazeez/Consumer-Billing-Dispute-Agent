import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ClientAuthGuard } from "@/components/auth/ClientAuthGuard";

interface LoginPageProps {
  searchParams: Promise<{ authenticated?: string; error?: string }>;
}

export const instant = false;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const statusMessage = getStatusMessage(query.authenticated, query.error);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  // Server-side authentication check: redirect logged-in users away from /login
  let isServerAuthenticated = false;
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("billing.sid");
    if (sessionCookie) {
      const authResponse = await fetch(`${apiUrl}/auth/me`, {
        headers: { Cookie: `billing.sid=${sessionCookie.value}` },
        cache: "no-store",
      });
      if (authResponse.ok) {
        const payload = (await authResponse.json()) as { success?: boolean };
        if (payload.success) {
          isServerAuthenticated = true;
        }
      }
    }
  } catch {
    // If auth server is unreachable or cookie invalid, proceed to login form
  }

  if (isServerAuthenticated) {
    redirect("/dashboard");
  }

  return (
    <div className="modern-page-wrapper">
      {/* Client-side guard for browser sessions */}
      <ClientAuthGuard apiUrl={apiUrl} />

      {/* Header */}
      <header className="modern-site-header">
        <Link className="modern-brand" href="/" aria-label="Billzz home">
          Billzz
        </Link>
        <nav className="modern-nav" aria-label="Navigation">
          <Link className="modern-nav-link modern-login-nav-link" href="/">
            Back to home
          </Link>
        </nav>
      </header>

      {/* Main Login Body */}
      <main className="modern-login-main">
        <div className="modern-login-container">
          <div className="modern-hero-copy">
            <p className="modern-eyebrow">BILLING DISPUTES, EVIDENCE FIRST</p>
            <h1 className="modern-hero-title">
              Every claim in your dispute, backed by a record.
            </h1>
            <p className="modern-hero-desc">
              Sign in to organize a billing question and work through the next step.
            </p>
            <p className="modern-hero-note">
              No provider login. Nothing is sent unless you send it.
            </p>
          </div>

          <div className="modern-auth-card" role="region" aria-labelledby="login-card-title">
            <div className="modern-auth-card-header">
              <span className="modern-tag tag-documented">SIGN IN</span>
              <h2 className="modern-auth-card-title" id="login-card-title">
                Welcome back.
              </h2>
              <p className="modern-auth-card-subtitle">
                Use Google to create or return to your cases.
              </p>
            </div>

            <a className="modern-google-btn" href={`${apiUrl}/auth/google`}>
              <Image
                alt=""
                aria-hidden="true"
                height={20}
                src="/google-g-logo.png"
                width={20}
              />
              <span>Continue with Google</span>
            </a>

            {statusMessage && (
              <p className="modern-auth-status" role="status">
                {statusMessage}
              </p>
            )}

            <div className="modern-auth-card-footer">
              <span>You review and approve every message before using it.</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="modern-footer">
        <div className="modern-footer-container">
          <Link className="modern-footer-brand" href="/">
            Billzz
          </Link>
          <p className="modern-footer-tagline">
            Evidence organized. Next steps for you to decide.
          </p>
        </div>
      </footer>
    </div>
  );
}

function getStatusMessage(authenticated?: string, error?: string): string {
  if (authenticated === "1") return "You are signed in with Google.";
  if (error === "oauth_failed") return "Google sign-in could not be completed. Please try again.";
  return "";
}
