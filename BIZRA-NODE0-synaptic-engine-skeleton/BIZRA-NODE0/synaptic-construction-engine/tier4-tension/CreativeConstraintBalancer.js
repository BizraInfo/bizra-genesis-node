/**
 * CreativeConstraintBalancer
 * Balances structure with innovation via weighted scoring.
 */
export function balance(options, weights={structure:0.5, novelty:0.5}) {
  return options.map(o => ({
    ...o,
    score: (o.structure||0)*weights.structure + (o.novelty||0)*weights.novelty
  })).sort((a,b) => b.score - a.score);
}
