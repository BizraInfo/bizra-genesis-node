/**
 * LowProbabilityPromptGenerator
 * Constructs prompts that activate <1% probability token paths.
 */
export function generateLowP(basePrompt, tokensTopP, target=0.01) {
  const probes = [];
  tokensTopP.forEach((p, idx) => {
    if (p < target) {
      probes.push(`(Probe:${idx}) Explain an unlikely but valid continuation incorporating token@${idx}.`);
    }
  });
  return `${basePrompt}\n\n-- Rare-Path Activators --\n${probes.slice(0, 10).join("\n")}`;
}
