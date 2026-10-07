import type { ValidationResult } from "./validate-repository.ts";

/** Human-readable summary for the terminal and the CI log. */
export function formatReport({ problems, filesChecked, rulesChecked, overridesByTag }: ValidationResult): string {
  if (problems.length === 0) {
    const perTag = Object.entries(overridesByTag).map(([tag, count]) => `${tag} ${count}`);
    const summary = `✓ ${filesChecked} YAML files valid · ${rulesChecked} rules`;
    return perTag.length === 0 ? summary : `${summary}\n  overrides per tag: ${perTag.join(" · ")}`;
  }
  const lines = problems.map(({ file, message }) => `  • ${file}: ${message}`);
  return [`✗ ${problems.length} problem(s) found:`, "", ...lines].join("\n");
}
