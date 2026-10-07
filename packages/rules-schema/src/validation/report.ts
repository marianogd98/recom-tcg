import type { ValidationResult } from "./validate-repository.ts";

/** Human-readable summary for the terminal and the CI log. */
export function formatReport({ problems, filesChecked, rulesChecked }: ValidationResult): string {
  if (problems.length === 0) return `✓ ${filesChecked} YAML files valid · ${rulesChecked} rules`;
  const lines = problems.map(({ file, message }) => `  • ${file}: ${message}`);
  return [`✗ ${problems.length} problem(s) found:`, "", ...lines].join("\n");
}
