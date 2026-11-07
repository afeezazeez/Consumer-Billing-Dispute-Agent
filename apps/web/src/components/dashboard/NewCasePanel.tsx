import { NewCaseForm } from "./NewCaseForm";

interface NewCasePanelProps {
  isSubmitting: boolean;
  error: string;
  onCreateCase: (message: string) => Promise<void>;
}

export function NewCasePanel(props: NewCasePanelProps) {
  return (
    <section className="new-case-panel" aria-labelledby="new-case-heading">
      <p className="dashboard-eyebrow">A NEW BILLING CASE</p>
      <h1 id="new-case-heading">What charge are you questioning?</h1>
      <p className="new-case-intro">Start with what you noticed. You can add records and details as we build out the review.</p>
      <NewCaseForm {...props} />
    </section>
  );
}
