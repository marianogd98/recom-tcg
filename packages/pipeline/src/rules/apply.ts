import type { RoleTag, ThemeTag } from "@recom-tcg/engine";
import type { CompiledRule } from "./compile.ts";
import { matchRule } from "./match.ts";
import type { RuleInput } from "./rule-input.ts";
import { TagAccumulator } from "./tag-accumulator.ts";

/** Runs every rule on one card and returns its merged tags. */
export function tagCard(card: RuleInput, rules: CompiledRule[]): { themes: ThemeTag[]; roles: RoleTag[] } {
  const tags = new TagAccumulator();

  for (const rule of rules) {
    const match = matchRule(card, rule);
    if (!match) continue;
    const { def } = rule;

    if (def.role) {
      tags.addRole(def.role, def.weight, def.id);
    } else if (def.theme && def.provides) {
      tags.addTheme(themeId(def.theme, match.captured), def.provides, def.weight, def.id);
    }
  }
  return tags.result();
}

/** Parameterized themes carry their captured value: tribal + "Elf" → "tribal:elf". */
function themeId(theme: string, captured?: string): string {
  return captured ? `${theme}:${captured.toLowerCase()}` : theme;
}
