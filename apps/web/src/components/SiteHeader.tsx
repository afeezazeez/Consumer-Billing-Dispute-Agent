import Link from "next/link";
import { StartCaseLink } from "./StartCaseLink";

interface SiteHeaderProps {
  initialHref?: string;
}

export function SiteHeader({ initialHref = "/login" }: SiteHeaderProps) {
  return (
    <header className="landing-header">
      <Link className="landing-brand" href="/" aria-label="Billzz home">
        Bill<span>zz</span>
      </Link>

      <div className="landing-header-right">
        <span className="landing-header-promise">
          <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4.75 8V5.75a4.25 4.25 0 0 1 8.5 0V8M4 8h10v7.25H4z" />
            <path d="M9 10.5v2" />
          </svg>
          You stay in control
        </span>
        <StartCaseLink className="landing-header-action" initialHref={initialHref}>
          Start a case
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4.5 10h11m-4.5-4.5L15.5 10 11 14.5" />
          </svg>
        </StartCaseLink>
      </div>
    </header>
  );
}
