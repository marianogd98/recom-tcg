import "./SiteFooter.css";

/** Shared by every page through the root layout. Carries the required attributions. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner mono">
        <span>Open source · Card data from Scryfall</span>
        <span>Unofficial Fan Content · Not approved/endorsed by Wizards of the Coast</span>
      </div>
    </footer>
  );
}
