/**
 * TensionResolver
 * Constructs prompts that require navigating contradictions.
 */
export function buildContradictionPrompt(requirementsA, requirementsB) {
  return [
    "[Constraint Clash]",
    `A: ${JSON.stringify(requirementsA)}`,
    `B: ${JSON.stringify(requirementsB)}`,
    "Task: propose 3 Pareto points; select one; justify tradeoffs; list test oracles."
  ].join("\n");
}
