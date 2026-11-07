export function HeroSection() {
  return (
    <section className="hero-section" id="top" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-dot" /> Billing dispute help, backed by your records</p>
        <h1 id="hero-title">Make sense of a charge. <em>Know what to ask next.</em></h1>
        <p className="hero-description">Add the bill and related messages. The agent organizes the facts, shows what’s still unclear, and prepares a response for you to review.</p>
        <div className="hero-actions">
          <a className="button" href="/login">Start a case <span aria-hidden="true">↗</span></a>
          <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
        </div>
        <p className="hero-note">No provider login. Drafts are yours to approve.</p>
      </div>
      <div className="workflow-visual" role="img" aria-label="Bills and messages are organized into sourced facts, open questions, and a response draft for review">
        <div className="workflow-visual-top"><span>FROM YOUR RECORDS</span><span className="visual-live"><i /> CASE WORKSPACE</span></div>
        <div className="workflow-source-list">
          <div className="workflow-source"><span className="source-glyph glyph-bill">▤</span><span><strong>Bills & statements</strong><small>Charges, dates, line items</small></span><span className="source-arrow">↘</span></div>
          <div className="workflow-source"><span className="source-glyph glyph-message">▱</span><span><strong>Messages & receipts</strong><small>What was promised or paid</small></span><span className="source-arrow">↘</span></div>
          <div className="workflow-source"><span className="source-glyph glyph-guidance">⌕</span><span><strong>Relevant guidance</strong><small>Sources linked to findings</small></span><span className="source-arrow">↘</span></div>
        </div>
        <div className="workflow-bridge"><span /> <small>ORGANIZED INTO</small> <span /></div>
        <div className="workflow-output">
          <div className="output-heading"><span>YOUR CASE SUMMARY</span><span className="output-spark" aria-hidden="true">✳</span></div>
          <div className="output-items">
            <div><span className="output-check">01</span><span><strong>What the records show</strong><small>Facts linked to their source</small></span></div>
            <div><span className="output-question">02</span><span><strong>What needs checking</strong><small>Questions before conclusions</small></span></div>
            <div><span className="output-draft">03</span><span><strong>A draft for you</strong><small>Edit it before you use it</small></span></div>
          </div>
          <div className="output-footer"><span /> Review every draft before using it</div>
        </div>
      </div>
    </section>
  );
}
