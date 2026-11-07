export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Billing Case Agent home">
        <span className="brand-mark" aria-hidden="true">B</span>
        <span>Billing Case Agent</span>
      </a>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#your-control">Your control</a>
        <a className="button button-small" href="#sample-case">Explore a sample</a>
      </nav>
    </header>
  );
}
