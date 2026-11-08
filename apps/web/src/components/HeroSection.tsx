import { StartCaseLink } from "./StartCaseLink";

interface HeroSectionProps {
  initialHref?: string;
}

export function HeroSection({ initialHref = "/login" }: HeroSectionProps) {
  return (
    <section className="modern-hero-section" id="top" aria-labelledby="hero-title">
      <div className="modern-hero-grid">
        {/* Left Column: Headline and Actions */}
        <div className="modern-hero-copy">
          <p className="modern-eyebrow">BILLING DISPUTES, EVIDENCE FIRST</p>
          <h1 className="modern-hero-title" id="hero-title">
            Every claim in your dispute, backed by a record.
          </h1>
          <p className="modern-hero-desc">
            Upload the bill and related messages. The agent separates what is documented
            from what you remember, flags the gaps, and drafts a message you approve.
          </p>
          <div className="modern-hero-actions">
            <StartCaseLink className="modern-btn-primary" initialHref={initialHref}>
              Start a case
            </StartCaseLink>
            <a className="modern-text-link" href="#how-it-works">
              See how it works
            </a>
          </div>
          <p className="modern-hero-note">
            No provider login. Nothing is sent unless you send it.
          </p>
        </div>

        {/* Right Column: Case Card Preview */}
        <div className="modern-case-preview-card" role="region" aria-label="Example dispute breakdown">
          <header className="modern-preview-header">
            <strong className="modern-preview-title">Duplicate charge</strong>
            <span className="modern-preview-badge">Example case</span>
          </header>

          <div className="modern-preview-rows">
            {/* Row 1: Documented */}
            <div className="modern-preview-row">
              <span className="modern-tag tag-documented">DOCUMENTED</span>
              <div className="modern-preview-row-content">
                <strong>Two identical charges on the same date</strong>
                <p>Invoice, page 2, lines 3 and 4</p>
              </div>
            </div>

            {/* Row 2: You said */}
            <div className="modern-preview-row">
              <span className="modern-tag tag-you-said">YOU SAID</span>
              <div className="modern-preview-row-content">
                <strong>You cancelled by phone in March</strong>
                <p>Your account, no record attached yet</p>
              </div>
            </div>

            {/* Row 3: Inferred */}
            <div className="modern-preview-row">
              <span className="modern-tag tag-inferred">INFERRED</span>
              <div className="modern-preview-row-content">
                <strong>The second charge may be a duplicate</strong>
                <p>Based on matching amounts and dates</p>
              </div>
            </div>

            {/* Row 4: Open */}
            <div className="modern-preview-row">
              <span className="modern-tag tag-open">OPEN</span>
              <div className="modern-preview-row-content">
                <strong>Did you receive a cancellation confirmation?</strong>
                <p>Check your email, then add it to the case</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
