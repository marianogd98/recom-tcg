import { COLOR_ORDER, type Color } from "@recom-tcg/engine";
import "./ManaPips.css";

interface ManaPipsProps {
  identity: readonly Color[];
}

/**
 * The colored circles of a color identity, always in WUBRG order and always
 * with their letter: color never carries meaning on its own (accessibility).
 * Decorative here; the component that uses it provides the readable name.
 */
export function ManaPips({ identity }: ManaPipsProps) {
  const colors = COLOR_ORDER.filter((color) => identity.includes(color));
  return (
    <span className="mana-pips" aria-hidden="true">
      {colors.map((color) => (
        <span key={color} className={`mana-pip mana-pip--${color}`}>
          {color}
        </span>
      ))}
    </span>
  );
}
