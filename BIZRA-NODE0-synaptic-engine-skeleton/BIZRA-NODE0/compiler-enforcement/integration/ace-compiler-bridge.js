/**
 * ace-compiler-bridge
 * Hands compiled prompts to ACE orchestrator for execution planning.
 */
export async function planExecution(compiledPrompt, { orchestrator }) {
  return orchestrator.plan({ prompt: compiledPrompt, mode: "synaptic" });
}
