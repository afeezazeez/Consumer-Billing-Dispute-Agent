interface DashboardEmptyStateProps {
  onNewCase: () => void;
}

export function DashboardEmptyState({ onNewCase }: DashboardEmptyStateProps) {
  return (
    <section className="dashboard-empty-state">
      <span className="empty-state-mark" aria-hidden="true">＋</span>
      <p className="dashboard-eyebrow">YOUR CASE WORKSPACE</p>
      <h1>Start with a billing charge.</h1>
      <p>Your cases and their details will stay organized here.</p>
      <button className="button" onClick={onNewCase} type="button">Start a case <span aria-hidden="true">→</span></button>
    </section>
  );
}
