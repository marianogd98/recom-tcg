import { COLOR_ORDER, IDENTITY_NAMES, identityKey, type Color } from "@recom-tcg/engine";

/**
 * Placeholder home for M0. It proves the wiring (Next.js static export +
 * the engine imported from the monorepo). The real screens arrive in M3,
 * following the v1 sketches: Import → Your pool → Search → Results → Commander.
 */
const STEPS = [
  { n: 1, title: "Import", text: "Paste your list or upload a CSV. Your pool never leaves your browser." },
  { n: 2, title: "Your pool", text: "See which themes your collection supports in each color identity." },
  { n: 3, title: "Search", text: "Pick the identities you want to play and what matters most to you." },
  { n: 4, title: "Results", text: "Your commanders, ranked by how well they use your pool, and why." }
];

const SAMPLE: Color[][] = [["B", "G"], ["W", "B", "G"], ["U", "R"]];

export default function Home() {
  return (
    <main className="container" style={{ padding: "56px 24px", display: "grid", gap: 32 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <span className="mono" style={{ color: "var(--accent)", fontWeight: 600, fontSize: 14 }}>v0.1 · work in progress</span>
        <h1 style={{ margin: 0, fontSize: 48 }}>ReCom TCG</h1>
        <p style={{ margin: 0, fontSize: 18, color: "var(--ink-muted)", maxWidth: 680 }}>
          Find the commanders hiding in your own card pool, and the ones that make the most of the rest of your collection.
        </p>
      </header>

      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {STEPS.map((s) => (
          <li key={s.n} className="card" style={{ display: "grid", gap: 6 }}>
            <span className="mono" style={{ color: "var(--ink-muted)" }}>{s.n}</span>
            <h2 style={{ margin: 0, fontSize: 20 }}>{s.title}</h2>
            <p style={{ margin: 0, color: "var(--ink-muted)" }}>{s.text}</p>
          </li>
        ))}
      </ol>

      <section className="card" aria-labelledby="engine-check" style={{ display: "grid", gap: 12 }}>
        <h2 id="engine-check" style={{ margin: 0, fontSize: 18 }}>Engine wiring check</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: 16 }}>
          {SAMPLE.map((identity) => {
            const key = identityKey(identity);
            return (
              <li key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "flex", gap: 3 }} aria-hidden="true">
                  {COLOR_ORDER.filter((c) => identity.includes(c)).map((c) => (
                    <span key={c} className={`pip pip-${c}`}>{c}</span>
                  ))}
                </span>
                <span style={{ textTransform: "capitalize" }}>{IDENTITY_NAMES[key]}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="mono" style={{ fontSize: 13, color: "var(--ink-muted)" }}>
        Open source · Card data from Scryfall · Not affiliated with Wizards of the Coast
      </footer>
    </main>
  );
}
