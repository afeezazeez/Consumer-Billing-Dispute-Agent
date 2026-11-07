export function EvidencePreview() {
  return (
    <section className="preview-section" id="sample-case" aria-labelledby="preview-title">
      <div className="section-heading preview-heading">
        <p className="eyebrow">A look inside a case</p>
        <h2 id="preview-title">From “what is this charge?” to a clear next step.</h2>
        <p>This fictional example shows how the agent can organize evidence and surface what still needs checking.</p>
      </div>
      <article className="case-card" aria-label="Fictional mobile billing dispute case preview">
        <header className="case-card-header">
          <div><span className="sample-badge">Fictional sample</span><h3>Unexpected roaming charge</h3></div>
          <span className="case-reference">CASE PREVIEW · 01</span>
        </header>
        <div className="case-overview">
          <div><span className="field-label">Charge in question</span><strong className="charge-amount">$68.00</strong><span className="charge-caption">Roaming add-on · 14 Oct</span></div>
          <div className="status-pill"><span /> Needs one more detail</div>
        </div>
        <div className="case-grid">
          <div className="evidence-panel">
            <div className="panel-heading"><span>01</span><h4>What the records show</h4></div>
            <div className="evidence-row"><span className="file-type">PDF</span><p><strong>October statement</strong><small>Roaming add-on · $68.00</small></p><span className="source-tag">Source</span></div>
            <div className="evidence-row"><span className="file-type file-type-mail">MSG</span><p><strong>Plan confirmation</strong><small>International use included</small></p><span className="source-tag">Source</span></div>
          </div>
          <div className="next-step-panel">
            <div className="panel-heading"><span>02</span><h4>What to clarify</h4></div>
            <p className="question-mark">Was the included roaming plan active on 14 October?</p>
            <p className="step-caption">The records don’t confirm the activation date. Ask the provider to verify it before drawing a conclusion.</p>
            <a href="#how-it-works" className="case-link">See how the agent helps <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <footer className="case-card-footer"><span className="footer-spark" aria-hidden="true">✳</span><p><strong>A useful answer starts with what we can verify.</strong><br />This is an illustrative preview, not a real case or an outcome promise.</p></footer>
      </article>
    </section>
  );
}
