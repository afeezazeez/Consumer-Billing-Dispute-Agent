export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Billing Case Agent home">
        Billing Case Agent
      </a>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#your-control">Your control</a>
        <a className="nav-login" href="/login">Log in</a>
        <a className="button button-small" href="/login">Start a case <span aria-hidden="true">↗</span></a>
      </nav>
    </header>
  );
}
