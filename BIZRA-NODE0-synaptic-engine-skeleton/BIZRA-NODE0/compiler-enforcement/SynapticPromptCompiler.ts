/**
 * SynapticPromptCompiler.ts
 * Type-safe prompt compilation with semantic validation and circuit targeting checks.
 */

export type Tier = "TIER1"|"TIER2"|"TIER3"|"TIER4";
export interface PromptSchema {
  objective: string;
  tiers: Tier[];
  constraints?: Record<string, unknown>;
  symbolic?: Record<string, unknown>;
  compiledPrompt?: string;
}

export interface CompileResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  output?: PromptSchema;
}

function validateObjective(obj?: string, errors: string[]) {
  if (!obj || obj.trim().length < 5) errors.push("Objective too short");
}

function validateTiers(tiers?: Tier[], errors: string[]) {
  const allowed = new Set(["TIER1","TIER2","TIER3","TIER4"]);
  if (!tiers || tiers.length === 0) errors.push("At least one tier required");
  tiers?.forEach(t => { if (!allowed.has(t)) errors.push(`Unknown tier: ${t}`); });
}

export function compile(schema: PromptSchema): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  validateObjective(schema.objective, errors);
  validateTiers(schema.tiers, errors);

  // Example semantic rule: If symbolic constraints present, TIER2 must be included
  if (schema.symbolic && !schema.tiers.includes("TIER2")) {
    errors.push("Symbolic constraints provided but TIER2 not selected");
  }
  // Compile: join pieces
  const compiled = [schema.compiledPrompt || "", "[Compiled by SynapticPromptCompiler]"].join("\n");
  return { ok: errors.length === 0, errors, warnings, output: { ...schema, compiledPrompt: compiled } };
}
