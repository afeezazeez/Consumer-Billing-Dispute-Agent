const steps = [
  { number: "01", title: "Add your records", body: "Describe the charge and attach the bill, receipts, or messages that matter." },
  { number: "02", title: "Check the picture", body: "Review sourced details, missing information, and questions the records cannot answer yet." },
  { number: "03", title: "Choose your next step", body: "Edit and approve a suggested response. You decide if and when to send it." },
];

export function HowItWorks() {
  return (
    <section className="process-section" id="how-it-works" aria-labelledby="how-title">
      <div className="process-inner">
        <div className="process-intro">
          <div><p className="eyebrow">A clear process</p><h2 id="how-title">From a confusing charge to a considered next step.</h2></div>
          <p className="process-aside">The agent works from the records you provide and shows where each conclusion comes from.</p>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span><h3>{step.title}</h3><p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
