const steps = [
  { number: "01", title: "Bring the details", body: "Share what happened and provide the bill or messages that relate to the charge." },
  { number: "02", title: "Build the picture", body: "The agent organizes the facts, points to their sources, and asks about important gaps." },
  { number: "03", title: "Choose what happens next", body: "Review a suggested next step and edit or approve a draft before you use it." },
];

export function HowItWorks() {
  return (
    <section className="how-section" id="how-it-works" aria-labelledby="how-title">
      <div className="section-heading how-heading"><p className="eyebrow">A thoughtful process</p><h2 id="how-title">Clarity first. Your decision next.</h2></div>
      <div className="steps-grid">
        {steps.map((step) => (
          <article className="step-card" key={step.number}>
            <span className="step-number">{step.number}</span><h3>{step.title}</h3><p>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
