import { StartCaseLink } from "./StartCaseLink";

interface HeroSectionProps {
  initialHref?: string;
}

const trustPoints = [
  "Sources stay attached",
  "Unknowns stay visible",
  "You decide what gets sent",
];

export function HeroSection({ initialHref = "/login" }: HeroSectionProps) {
  return (
    <section className="landing-hero" id="top" aria-labelledby="hero-title">
      <div className="landing-hero-grid">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">
            <span aria-hidden="true" />
            BILLING DISPUTES, EVIDENCE FIRST
          </p>
          <h1 className="landing-title" id="hero-title">
            Turn a confusing bill into a <span>clear next step.</span>
          </h1>
          <p className="landing-description">
            Add the bill and related messages. The agent shows what the records
            support, flags what is still unknown, and helps you prepare a response.
          </p>

          <div className="landing-actions">
            <StartCaseLink className="landing-primary-action" initialHref={initialHref}>
              Start a case
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4.5 10h11m-4.5-4.5L15.5 10 11 14.5" />
              </svg>
            </StartCaseLink>
          <p className="landing-action-note">No provider login · Nothing is sent unless you send it</p>
          </div>

          <div className="landing-flow" role="list" aria-label="How the case moves forward">
            <span role="listitem"><b>01</b> Add records</span>
            <i aria-hidden="true" />
            <span role="listitem"><b>02</b> See what they show</span>
            <i aria-hidden="true" />
            <span role="listitem"><b>03</b> Choose what happens next</span>
          </div>
        </div>

        <div className="landing-demo-scene">
          <div className="landing-demo-orbit landing-demo-orbit-one" aria-hidden="true" />
          <div className="landing-demo-orbit landing-demo-orbit-two" aria-hidden="true" />
          <article className="landing-case-card" aria-label="Example billing case preview">
            <header className="landing-case-header">
              <div className="landing-case-brand">
                <span className="landing-case-brand-mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M6.5 5.5h7l4 4v9h-11z" />
                    <path d="M13.5 5.5v4h4M9.5 13h5M9.5 16h3" />
                  </svg>
                </span>
                <span>CASE SNAPSHOT<small>EXAMPLE ONLY</small></span>
              </div>
              <span className="landing-example-pill">Sample case</span>
            </header>

            <div className="landing-case-intro">
              <span className="landing-case-kicker">MOBILE BILL · MARCH</span>
              <h2>Possible duplicate charge</h2>
              <p>Two matching charges appear on the same invoice.</p>
            </div>

            <div className="landing-charge-list" role="list" aria-label="Matching invoice charges">
              <div className="landing-charge-row" role="listitem">
                <span className="landing-charge-index">01</span>
                <span className="landing-charge-info"><strong>Monthly service</strong><small>Mar 12 · Invoice page 2</small></span>
                <strong className="landing-charge-amount">$48.00</strong>
              </div>
              <div className="landing-charge-row landing-charge-row-match" role="listitem">
                <span className="landing-charge-index">02</span>
                <span className="landing-charge-info"><strong>Monthly service</strong><small>Mar 12 · Invoice page 2</small></span>
                <strong className="landing-charge-amount">$48.00</strong>
              </div>
            </div>

            <div className="landing-case-insight">
              <span className="landing-insight-label">WHAT THE RECORD SHOWS</span>
              <p>Same date. Same amount. The second charge may be a duplicate.</p>
              <span className="landing-source-link">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4.25 2.25h5l2.5 2.5v9h-7.5z" />
                  <path d="M9.25 2.25v2.5h2.5M6 8h4M6 10.25h4" />
                </svg>
                Invoice · page 2
              </span>
            </div>

            <div className="landing-case-footer">
              <span className="landing-open-dot" aria-hidden="true" />
              <span><strong>One question remains</strong><small>Were both charges posted?</small></span>
              <span className="landing-review-label">YOUR CALL</span>
            </div>
          </article>
        </div>
      </div>

      <div className="landing-trust-strip" role="list" aria-label="Your control and transparency">
        {trustPoints.map((point) => (
          <div className="landing-trust-point" key={point} role="listitem">
            <span aria-hidden="true">
              <svg viewBox="0 0 18 18" fill="none">
                <path d="m4 9.25 3.25 3.25L14 5.75" />
              </svg>
            </span>
            {point}
          </div>
        ))}
        <p className="landing-disclaimer">You review every draft. Not legal advice.</p>
      </div>
    </section>
  );
}
