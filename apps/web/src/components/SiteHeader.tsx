import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="modern-site-header">
      <Link className="modern-brand" href="/" aria-label="Billing Case Agent home">
        Billing Case Agent
      </Link>
      <nav className="modern-nav" aria-label="Main navigation">
        <a className="modern-nav-link" href="#how-it-works">How it works</a>
        <a className="modern-nav-link" href="#your-control">Your control</a>
        <Link className="modern-btn-primary modern-btn-header" href="/login">
          Start a case
        </Link>
      </nav>
    </header>
  );
}
