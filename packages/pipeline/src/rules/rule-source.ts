import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readYaml, type RuleDefinition, type RuleFile, type Vocabulary } from "@recom-tcg/rules-schema";

/**
 * Where rules come from. loadRules() depends on this interface, not on the
 * file system (Dependency Inversion): production reads YAML files, tests can
 * pass a plain object, and a future source (say, rules fetched for a preview
 * of a pull request) only needs to implement these two methods.
 */
export interface RuleSource {
  macros(): Record<string, string>;
  definitions(): RuleDefinition[];
}

/** Reads rules/vocabulary.yaml and every file under rules/themes and rules/roles. */
export class YamlRuleSource implements RuleSource {
  private static readonly RULE_FOLDERS = ["themes", "roles"];

  constructor(private readonly rulesDir: string) {}

  macros(): Record<string, string> {
    return readYaml<Vocabulary>(join(this.rulesDir, "vocabulary.yaml")).macros;
  }

  definitions(): RuleDefinition[] {
    return YamlRuleSource.RULE_FOLDERS.flatMap((folder) => this.readFolder(join(this.rulesDir, folder)));
  }

  private readFolder(dir: string): RuleDefinition[] {
    return readdirSync(dir)
      .filter((file) => /\.ya?ml$/.test(file))
      .sort()
      .flatMap((file) => readYaml<RuleFile>(join(dir, file)).rules ?? []);
  }
}
