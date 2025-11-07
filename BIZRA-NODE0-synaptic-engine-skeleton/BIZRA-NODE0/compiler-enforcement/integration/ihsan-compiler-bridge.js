/**
 * ihsan-compiler-bridge
 * Connects compiler outputs to Ihsān enforcement (pre-exec audits).
 */
export async function ihsanAudit(compiledPrompt, { ihsanAgent }) {
  const score = await ihsanAgent.score(compiledPrompt); // returns 0..100
  return { ok: score >= 95, score };
}
