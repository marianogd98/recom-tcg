import type { Color } from "@recom-tcg/engine";
import { IdentityBadge } from "../IdentityBadge/IdentityBadge";
import "./IdentityPreview.css";

interface IdentityPreviewProps {
  identities: readonly (readonly Color[])[];
}

/**
 * Temporary M0 section: proves the web app can import the engine from the
 * monorepo. It disappears when the real search screen arrives in M3.
 */
export function IdentityPreview({ identities }: IdentityPreviewProps) {
  return (
    <section className="identity-preview card" aria-labelledby="identity-preview-title">
      <h2 id="identity-preview-title" className="identity-preview__title">
        Engine wiring check
      </h2>
      <ul className="identity-preview__list">
        {identities.map((identity) => (
          <li key={identity.join("")}>
            <IdentityBadge identity={identity} />
          </li>
        ))}
      </ul>
    </section>
  );
}
