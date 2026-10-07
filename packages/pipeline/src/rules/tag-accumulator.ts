import type { Provides, RoleTag, ThemeTag } from "@recom-tcg/engine";

/**
 * Collects the tags of one card while rules run, applying gramática §3.7:
 * the same theme in the same direction keeps the MAX weight, never the sum,
 * so a card does not become "more synergistic" by repeating an idea.
 *
 * Kept apart from rule matching so each piece has one reason to change.
 */
export class TagAccumulator {
  private readonly themes = new Map<string, ThemeTag>();
  private readonly roles = new Map<string, RoleTag>();

  addTheme(theme: string, provides: Provides, weight: number, ruleId: string): void {
    mergeInto(this.themes, `${theme}|${provides}`, { theme, provides, weight, ruleIds: [ruleId] });
  }

  addRole(role: string, weight: number, ruleId: string): void {
    mergeInto(this.roles, role, { role, weight, ruleIds: [ruleId] });
  }

  result(): { themes: ThemeTag[]; roles: RoleTag[] } {
    return { themes: [...this.themes.values()], roles: [...this.roles.values()] };
  }
}

function mergeInto<T extends { weight: number; ruleIds: string[] }>(map: Map<string, T>, key: string, tag: T): void {
  const existing = map.get(key);
  if (!existing) {
    map.set(key, tag);
    return;
  }
  existing.weight = Math.max(existing.weight, tag.weight);
  existing.ruleIds = [...new Set([...existing.ruleIds, ...tag.ruleIds])];
}
