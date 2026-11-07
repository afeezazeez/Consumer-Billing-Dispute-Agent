import Image from "next/image";

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
      <div className="login-layout">
        <section className="login-intro" aria-labelledby="login-title">
          <h1 id="login-title">Start with the records you have.</h1>
          <p>Sign in to organize a billing question and work through the next step.</p>
        </section>
        <section className="login-card" aria-labelledby="login-card-title">
          <div className="login-card-heading">
            <span className="login-card-kicker">SIGN IN</span>
            <h2 id="login-card-title">Welcome back.</h2>
            <p>Use Google to create or return to a case.</p>
          </div>
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
          <p className="login-note">You can review and approve every proposed response before using it.</p>
        </section>
      </div>
    </main>
  );
}

function getStatusMessage(authenticated?: string, error?: string): string {
  if (authenticated === "1") return "You are signed in with Google.";
  if (error === "oauth_failed") return "Google sign-in could not be completed. Please try again.";
  return "";
}
