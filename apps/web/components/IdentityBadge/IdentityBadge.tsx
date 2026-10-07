import { IDENTITY_NAMES, identityKey, type Color } from "@recom-tcg/engine";
import { ManaPips } from "../ManaPips/ManaPips";
import "./IdentityBadge.css";

interface IdentityBadgeProps {
  identity: readonly Color[];
}

/** Pips plus the identity's name ("golgari"), which is what screen readers announce. */
export function IdentityBadge({ identity }: IdentityBadgeProps) {
  const name = IDENTITY_NAMES[identityKey(identity)] ?? identityKey(identity);
  return (
    <span className="identity-badge">
      <ManaPips identity={identity} />
      <span className="identity-badge__name">{name}</span>
    </span>
  );
}
