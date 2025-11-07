/**
 * SynapticOrchestrator
 * Coordinates the 4-tier prompt construction and integrates compiler enforcement.
 */
import { mapAttentionHeads } from "../tier1-deep-attention/CircuitMapper.js";
import { generateLowP } from "../tier1-deep-attention/LowProbabilityPromptGenerator.js";
import { toPromptDirectives } from "../tier2-symbolic-neural/SymbolicNeuralBridge.js";
import { buildMetaPrompt } from "../tier3-abstraction/AbstractionTrigger.js";
import { buildContradictionPrompt } from "../tier4-tension/TensionResolver.js";

export async function runSynapticPipeline(ctx) {
  // ctx: {objective, constraints, attentionStats, tokensTopP, symbolicConstraints}
  const mapping = mapAttentionHeads(ctx.objective, ctx.attentionStats || {});
  const rarePrompt = generateLowP(ctx.basePrompt || ctx.objective, ctx.tokensTopP || []);
  const sym = toPromptDirectives(ctx.symbolicConstraints || {});
  const meta = buildMetaPrompt(ctx.objective, ctx.constraints || {});
  const clash = buildContradictionPrompt({rigor:true}, {creativity:true});
  const compiled = [rarePrompt, sym, meta, clash].join("\n\n");
  return { mapping, compiledPrompt: compiled };
}
