import type { RoleTag, ThemeTag } from "@recom-tcg/engine";
import type { CompiledRule } from "./load.ts";

/** What a rule looks at: one face of a card, already normalized. */
export interface RuleInput {
  /** Normalized Oracle text, one string per face (gramática §3.2). */
  faces: string[];
  typeLine: string;
  keywords: string[];
  producesMana: boolean;
}

/**
 * Applies every rule to a card and merges the result (gramática §3.7):
 * same theme + same direction keeps the MAX weight, never the sum.
 */
export function tagCard(input: RuleInput, rules: CompiledRule[]): { themes: ThemeTag[]; roles: RoleTag[] } {
  const themes = new Map<string, ThemeTag>();
  const roles = new Map<string, RoleTag>();

  for (const rule of rules) {
    const hit = matchRule(input, rule);
    if (!hit.matched) continue;
    const { def } = rule;

    if (def.role) {
      upsert(roles, def.role, { role: def.role, weight: def.weight, ruleIds: [def.id] });
      continue;
    }
    if (def.theme && def.provides) {
      const theme = hit.captured ? `${def.theme}:${hit.captured.toLowerCase()}` : def.theme;
      const key = `${theme}|${def.provides}`;
      upsert(themes, key, { theme, provides: def.provides, weight: def.weight, ruleIds: [def.id] });
    }
  }
  return { themes: [...themes.values()], roles: [...roles.values()] };
}

function upsert<T extends { weight: number; ruleIds: string[] }>(map: Map<string, T>, key: string, tag: T): void {
  const prev = map.get(key);
  if (!prev) {
    map.set(key, tag);
    return;
  }
  prev.weight = Math.max(prev.weight, tag.weight);
  prev.ruleIds = [...new Set([...prev.ruleIds, ...tag.ruleIds])];
}

/** A face matches when every present operator holds. Faces are evaluated separately. */
export function matchRule(input: RuleInput, rule: CompiledRule): { matched: boolean; captured?: string } {
  const { def } = rule;
  if (def.match.produces_mana !== undefined && def.match.produces_mana !== input.producesMana) return { matched: false };
  if (rule.typeAny.length && !rule.typeAny.some((re) => re.test(input.typeLine))) return { matched: false };
  if (rule.typeNone.some((re) => re.test(input.typeLine))) return { matched: false };
  if (rule.keywordsAny.length && !rule.keywordsAny.some((re) => input.keywords.some((k) => re.test(k)))) {
    return { matched: false };
  }

  const usesText = rule.textAny.length + rule.textAll.length + rule.textNone.length > 0;
  if (!usesText) return { matched: true };

  for (const face of input.faces) {
    if (rule.textNone.some((re) => re.test(face))) continue;
    if (!rule.textAll.every((re) => re.test(face))) continue;
    if (!rule.textAny.length) return { matched: true };
    for (const re of rule.textAny) {
      const m = re.exec(face);
      if (!m) continue;
      const captured = def.capture ? m.groups?.[def.capture] : undefined;
      return captured ? { matched: true, captured } : { matched: true };
    }
  }
  return { matched: false };
}
