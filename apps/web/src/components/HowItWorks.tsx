const steps = [
  {
    number: "01",
    title: "Add your records",
    body: "Describe the charge. Attach bills, receipts, screenshots or messages.",
  },
  {
    number: "02",
    title: "Review the case",
    body: "See each finding linked to its source, plus the questions only you can answer.",
  },
  {
    number: "03",
    title: "Approve a draft",
    body: "Edit the suggested message and choose the next step. You decide if and when to send.",
  },
];

export function HowItWorks() {
  return (
    <section className="modern-steps-section" id="how-it-works" aria-labelledby="steps-title">
      <div className="modern-steps-container">
        <h2 className="modern-steps-heading" id="steps-title">
          From a confusing charge to a clear next step.
        </h2>

        <div className="modern-steps-grid">
          {steps.map((step) => (
            <article className="modern-step-card" key={step.number}>
              <span className="modern-step-num">{step.number}</span>
              <h3 className="modern-step-title">{step.title}</h3>
              <p className="modern-step-body">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
