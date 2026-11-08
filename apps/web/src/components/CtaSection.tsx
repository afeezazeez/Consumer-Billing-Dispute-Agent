import { StartCaseLink } from "./StartCaseLink";

interface CtaSectionProps {
  initialHref?: string;
}

export function CtaSection({ initialHref = "/login" }: CtaSectionProps) {
  return (
    <section className="modern-cta-section" aria-labelledby="cta-title">
      <div className="modern-cta-container">
        <h2 className="modern-cta-heading" id="cta-title">
          Bring the bill. Leave with a plan.
        </h2>
        <p className="modern-cta-desc">
          Start a case in a few minutes. No provider login needed.
        </p>
        <StartCaseLink className="modern-btn-primary" initialHref={initialHref}>
          Start a case
        </StartCaseLink>
      </div>
    </section>
  );
}
