export function HeroSection() {
  return (
    <section className="hero-section" id="top" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-dot" /> A clearer way through billing disputes</p>
        <h1 id="hero-title">A charge doesn’t add up. <em>Start with the facts.</em></h1>
        <p className="hero-description">Bring together the bill, the details, and the questions. Get a clearer picture of what happened and a considered next step.</p>
        <div className="hero-actions">
          <a className="button" href="#sample-case">Explore the sample case <span aria-hidden="true">↗</span></a>
          <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
        </div>
        <p className="hero-note">No provider login required · You review every proposed response</p>
      </div>
      <div className="hero-art" role="img" aria-label="Preview of a fictional billing dispute case">
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
        <div className="floating-note note-top"><span className="note-icon note-icon-check">✓</span><span><strong>Evidence, organized</strong><small>Details linked to their source</small></span></div>
        <div className="floating-note note-bottom"><span className="note-icon note-icon-arrow">↗</span><span><strong>Your call, always</strong><small>Review before anything is sent</small></span></div>
        <div className="hero-art-label">A better way to work through it</div>
      </div>
    </section>
  );
}
