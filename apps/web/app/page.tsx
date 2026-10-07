import type { Color } from "@recom-tcg/engine";
import { Hero } from "../components/Hero/Hero";
import { IdentityPreview } from "../components/IdentityPreview/IdentityPreview";
import { StepList } from "../components/StepList/StepList";
import { HOW_IT_WORKS } from "../content/how-it-works";

/** Golgari, Abzan and Izzet: enough to see two- and three-color badges. */
const PREVIEW_IDENTITIES: readonly Color[][] = [["B", "G"], ["W", "B", "G"], ["U", "R"]];

/**
 * Home page (M0 placeholder). A page only composes components and passes
 * them data; it holds no markup details or styles of its own. The real
 * screens arrive in M3, following the v1 sketches.
 */
export default function HomePage() {
  return (
    <main className="container page">
      <Hero />
      <StepList steps={HOW_IT_WORKS} />
      <IdentityPreview identities={PREVIEW_IDENTITIES} />
    </main>
  );
}
