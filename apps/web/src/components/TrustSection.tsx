const commitments = [
  { icon: "↗", title: "Sources stay attached", body: "See which record supports each important detail." },
  { icon: "?", title: "Gaps stay visible", body: "The agent flags what the records do not answer." },
  { icon: "✓", title: "You make the call", body: "Review and approve a draft before using it." },
];

export function TrustSection() {
  return (
    <section className="trust-section" id="your-control" aria-labelledby="trust-title">
      <div className="trust-intro">
        <p className="eyebrow">Your case. Your decision.</p>
        <h2 id="trust-title">The agent organizes the work. You stay in charge.</h2>
      </div>
      <div className="commitment-list">
        {commitments.map((item) => (
          <article className="commitment" key={item.title}>
            <span className="commitment-icon" aria-hidden="true">{item.icon}</span>
            <div><h3>{item.title}</h3><p>{item.body}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}
