import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="login-page">
      <Link className="brand login-brand" href="/" aria-label="Billing Case Agent home">
        <span className="brand-mark" aria-hidden="true">B</span>
        <span>Billing Case Agent</span>
      </Link>
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">Your cases stay private</p>
        <h1 id="login-title">Sign in to get started</h1>
        <p className="login-description">
          Use your Google account to create and return to your billing cases.
          Your billing provider account is never connected.
        </p>
        <button className="google-sign-in-button" type="button" disabled>
          Continue with Google
        </button>
        <p className="login-status" role="status">
          Google sign-in is being set up. You can explore how the agent works while we finish it.
        </p>
        <Link className="login-back-link" href="/">Back to the homepage</Link>
      </section>
    </main>
  );
}
