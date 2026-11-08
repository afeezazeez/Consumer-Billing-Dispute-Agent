import Link from "next/link";
import { StartCaseLink } from "./StartCaseLink";

interface SiteHeaderProps {
  initialHref?: string;
}

export function SiteHeader({ initialHref = "/login" }: SiteHeaderProps) {
  return (
    <header className="modern-site-header">
      <Link className="modern-brand" href="/" aria-label="Billing Case Agent home">
        Billing Case Agent
      </Link>
      <nav className="modern-nav" aria-label="Main navigation">
        <a className="modern-nav-link" href="#how-it-works">How it works</a>
        <a className="modern-nav-link" href="#your-control">Your control</a>
        <StartCaseLink className="modern-btn-primary modern-btn-header" initialHref={initialHref}>
          Start a case
        </StartCaseLink>
      </nav>
    </header>
  );
}
