/**
 * MetaReflectionLayer
 * Prompts that require self-analysis and error detection.
 */
export function metaReflect(promptDraft) {
  return `${promptDraft}\n\n[Meta] Identify weaknesses, enumerate risks, propose fixes, and output a confidence score (0–1).`;
}
