import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";

export type SchemaName =
  | "model"
  | "vocabulary"
  | "overrides"
  | "rule-file"
  | "format"
  | "pairing"
  | "skeleton"
  | "import-profile";

/**
 * Which schema validates which file. Supporting a new kind of YAML file is
 * one new route here plus its .schema.json; nothing else changes.
 */
const SCHEMA_ROUTES: { schema: SchemaName; path: RegExp }[] = [
  { schema: "model", path: /^model\.yaml$/ },
  { schema: "vocabulary", path: /^rules\/vocabulary\.yaml$/ },
  { schema: "overrides", path: /^rules\/overrides\.yaml$/ },
  { schema: "rule-file", path: /^rules\/(themes|roles)\/[^/]+\.ya?ml$/ },
  { schema: "format", path: /^rules\/formats\/[^/]+\/format\.ya?ml$/ },
  { schema: "pairing", path: /^rules\/formats\/[^/]+\/pairing\.ya?ml$/ },
  { schema: "skeleton", path: /^rules\/formats\/[^/]+\/skeleton\.ya?ml$/ },
  { schema: "import-profile", path: /^import-profiles\/[^/]+\.ya?ml$/ }
];

export function schemaFor(relativePath: string): SchemaName | null {
  return SCHEMA_ROUTES.find((route) => route.path.test(relativePath))?.schema ?? null;
}

type CompiledValidator = ReturnType<InstanceType<typeof Ajv>["compile"]>;

/** Loads every JSON Schema once and validates documents against them. */
export class SchemaRegistry {
  private readonly validators = new Map<string, CompiledValidator>();

  constructor(schemasDir: string) {
    const ajv = new Ajv({ allErrors: true });
    for (const file of readdirSync(schemasDir).filter((f) => f.endsWith(".schema.json"))) {
      const schema = JSON.parse(readFileSync(join(schemasDir, file), "utf8"));
      this.validators.set(file.replace(".schema.json", ""), ajv.compile(schema));
    }
  }

  /** Error messages for `data`, empty when it is valid. */
  validate(schema: SchemaName, data: unknown): string[] {
    const validator = this.validators.get(schema);
    if (!validator) return [`schema "${schema}" is missing from packages/rules-schema/schemas`];
    if (validator(data)) return [];
    return (validator.errors ?? []).map((error) => {
      // Ajv 8 calls it instancePath; older versions called it dataPath.
      const where = (error as { instancePath?: string }).instancePath ?? (error as { dataPath?: string }).dataPath ?? "";
      return `${where ? `${where}: ` : ""}${error.message}`;
    });
  }
}
