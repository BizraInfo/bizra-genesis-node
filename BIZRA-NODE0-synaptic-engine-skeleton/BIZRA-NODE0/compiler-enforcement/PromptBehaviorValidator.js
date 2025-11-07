/**
 * PromptBehaviorValidator
 * Pre-validates prompts against Ihsān standards and ground truth.
 * Hook points: .claude/helpers/احسان-enforcement-hook.js
 */
export function validateBehavior({prompt, groundTruthCheck}) {
  const errors = [];
  if (!prompt || prompt.length < 20) errors.push("Prompt too short");
  if (typeof groundTruthCheck === "function") {
    const gt = groundTruthCheck(prompt);
    if (!gt) errors.push("Ground truth check failed");
  }
  return { ok: errors.length === 0, errors };
}
