export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Billing Case Agent home">
        <span>Billing Case Agent</span>
      </a>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#your-control">Your control</a>
        <a className="button button-small" href="/login">Log in</a>
      </nav>
    </header>
  );
}
