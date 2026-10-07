import type { RoleTag, ThemeTag } from "@recom-tcg/engine";
import { parseTagSelector, selectsRole, selectsTheme, type OverrideDefinition } from "@recom-tcg/rules-schema";

export interface CardTags {
  themes: ThemeTag[];
  roles: RoleTag[];
}

/** The rule id an override leaves on the tags it adds, so "ver cálculo" (RN-58) can say where a tag came from. */
export const OVERRIDE_RULE_ID = "override";

/**
 * Applies one hand-written correction to the tags the rules produced
 * (gramática YAML §3.8). Removals run first, then additions.
 *
 * An added tag replaces a tag with the same theme and direction (or the same
 * role) instead of merging with it: an override exists because a person read
 * the card and disagreed with the regex, so their weight is the one that
 * counts. Pure function: it returns new arrays and never touches its input.
 */
export function applyOverride(tags: CardTags, override: OverrideDefinition): CardTags {
  const selectors = (override.remove ?? []).map(parseTagSelector);
  let themes = tags.themes.filter((tag) => !selectors.some((selector) => selectsTheme(selector, tag.theme, tag.provides)));
  let roles = tags.roles.filter((tag) => !selectors.some((selector) => selectsRole(selector, tag.role)));

  for (const added of override.add ?? []) {
    if ("role" in added) {
      roles = [...roles.filter((tag) => tag.role !== added.role), { role: added.role, weight: added.weight, ruleIds: [OVERRIDE_RULE_ID] }];
    } else {
      const sameTag = (tag: ThemeTag) => tag.theme === added.theme && tag.provides === added.provides;
      themes = [
        ...themes.filter((tag) => !sameTag(tag)),
        { theme: added.theme, provides: added.provides, weight: added.weight, ruleIds: [OVERRIDE_RULE_ID] }
      ];
    }
  }
  return { themes, roles };
}
