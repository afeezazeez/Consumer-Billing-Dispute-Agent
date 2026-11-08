const principles = [
  {
    title: "Sources stay attached",
    desc: "Every finding points to the invoice line or message it came from.",
  },
  {
    title: "Gaps stay visible",
    desc: "What the records cannot show is marked as open, not guessed.",
  },
  {
    title: "Nothing goes out without you",
    desc: "Drafts are yours to edit and approve. This is not legal advice.",
  },
];

export function TrustSection() {
  return (
    <section className="modern-trust-section" id="your-control" aria-labelledby="trust-headline">
      <div className="modern-trust-container">
        <div className="modern-trust-left">
          <h2 className="modern-trust-headline" id="trust-headline">
            The agent organizes the work. You make the call.
          </h2>
        </div>

        <div className="modern-trust-right">
          {principles.map((item) => (
            <div className="modern-trust-item" key={item.title}>
              <h3 className="modern-trust-item-title">{item.title}</h3>
              <p className="modern-trust-item-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
