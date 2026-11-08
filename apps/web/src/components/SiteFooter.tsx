import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="modern-footer">
      <div className="modern-footer-container">
        <Link className="modern-footer-brand" href="/">
          Billing Case Agent
        </Link>
        <p className="modern-footer-tagline">
          Evidence organized. Next steps for you to decide.
        </p>
      </div>
    </footer>
  );
}
