import Link from "next/link";

export function CtaSection() {
  return (
    <section className="modern-cta-section" aria-labelledby="cta-title">
      <div className="modern-cta-container">
        <h2 className="modern-cta-heading" id="cta-title">
          Bring the bill. Leave with a plan.
        </h2>
        <p className="modern-cta-desc">
          Start a case in a few minutes. No provider login needed.
        </p>
        <Link className="modern-btn-primary" href="/login">
          Start a case
        </Link>
      </div>
    </section>
  );
}

