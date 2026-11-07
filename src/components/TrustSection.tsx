const commitments = [
  { icon: "⌕", title: "See the basis", body: "Important details should connect back to the bill, message, or guidance they came from." },
  { icon: "↗", title: "Stay in control", body: "A suggested response is a draft for you to review. Nothing is sent automatically." },
  { icon: "?", title: "Know what’s missing", body: "When the records leave a question unanswered, the agent should say so and help you clarify it." },
];

export function TrustSection() {
  return (
    <section className="trust-section" id="your-control" aria-labelledby="trust-title">
      <div className="trust-intro"><p className="eyebrow">Built around your judgment</p><h2 id="trust-title">Helpful support should make the evidence clearer—not take the decision away from you.</h2></div>
      <div className="commitment-list">
        {commitments.map((item) => (
          <article className="commitment" key={item.title}><span className="commitment-icon" aria-hidden="true">{item.icon}</span><div><h3>{item.title}</h3><p>{item.body}</p></div></article>
        ))}
      </div>
    </section>
  );
}
