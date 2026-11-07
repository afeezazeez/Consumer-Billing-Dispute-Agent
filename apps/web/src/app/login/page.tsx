import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">Your cases stay private</p>
        <h1 id="login-title">Sign in to get started</h1>
        <p className="login-description">
          Use your Google account to create and return to your billing cases.
          Your billing provider account is never connected.
        </p>
        <button className="google-sign-in-button" type="button" disabled>
          <Image
            src="/google-g-logo.png"
            alt=""
            aria-hidden="true"
            width={20}
            height={20}
          />
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
