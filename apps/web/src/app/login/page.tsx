import Image from "next/image";
import Link from "next/link";

interface LoginPageProps {
  searchParams: Promise<{ authenticated?: string; error?: string }>;
}

export const instant = false;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const statusMessage = getStatusMessage(query.authenticated, query.error);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">Your cases stay private</p>
        <h1 id="login-title">Sign in to get started</h1>
        <p className="login-description">
          Use your Google account to create and return to your billing cases.
          Your billing provider account is never connected.
        </p>
        <a className="google-sign-in-button" href={`${apiUrl}/auth/google`}>
          <Image
            src="/google-g-logo.png"
            alt=""
            aria-hidden="true"
            width={20}
            height={20}
          />
          Continue with Google
        </a>
        {statusMessage && <p className="login-status" role="status">{statusMessage}</p>}
        <Link className="login-back-link" href="/">Back to the homepage</Link>
      </section>
    </main>
  );
}

function getStatusMessage(authenticated?: string, error?: string): string {
  if (authenticated === "1") return "You are signed in with Google.";
  if (error === "oauth_failed") return "Google sign-in could not be completed. Please try again.";
  return "";
}
