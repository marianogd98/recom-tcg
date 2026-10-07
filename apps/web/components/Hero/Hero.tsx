import "./Hero.css";

/** The page's opening: what the tool is, in one heading and one sentence. */
export function Hero() {
  return (
    <header className="hero">
      <span className="hero__status mono">v0.1 · work in progress</span>
      <h1 className="hero__title">ReCom TCG</h1>
      <p className="hero__lead">
        Find the commanders hiding in your own card pool, and the ones that make the most of the rest of your
        collection.
      </p>
    </header>
  );
}
