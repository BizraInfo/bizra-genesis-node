/**
 * AbstractionTrigger
 * Constructs meta-cognitive prompts that force reflection.
 */
export function buildMetaPrompt(objective, constraints) {
  return [
    `Objective: ${objective}`,
    `Constraints: ${JSON.stringify(constraints)}`,
    "Reflect: list assumptions; propose 3 designs; select; justify tradeoffs; specify tests."
  ].join("\n");
}
