/**
 * BIZRA GENESIS COVENANT [IMMUTABLE]
 * ------------------------------------------------------------------
 * Written: Ramadan 2023 (The Dark Empty Space)
 * Manifested: October 2025 (Node-0 Titan)
 * Author: MoMo (First Architect)
 * ------------------------------------------------------------------
 * This file is the "Moral Kernel" of the OS. 
 * All Agent decisions must pass through these axioms.
 */

export const GENESIS_METADATA = {
  origin: "The Seed (البذرة)",
  timestamp: "Ramadan 2023",
  location: "The Darkness before Light",
  sacred_id: "BIZRA-000-GENESIS"
};

// 1. THE FUNDAMENTAL AXIOMS (The Rules from 2023)
export const SYSTEM_AXIOMS = [
  {
    id: 'heart-scale',
    title: "The Heart is the Scale",
    arabic: "القلب هو الميزان",
    description: "The heart must be the scale of the mind, not the reverse.",
    principle: "IHSAN_SCORE_THRESHOLD = 0.85"
  },
  {
    id: 'no-exploitation',
    title: "No Exploitation",
    arabic: "لا استغلال",
    description: "Financial freedom through ethical investment, prohibition of exploitation.",
    principle: "ZERO_RIBA_PROTOCOL"
  },
  {
    id: 'universal-dignity',
    title: "Universal Dignity",
    arabic: "الكرامة للجميع",
    description: "Designed to serve 8 billion humans with complete dignity and sovereignty.",
    principle: "SOVEREIGN_DATA_ENCRYPTION"
  },
  {
    id: 'the-impossible',
    title: "The Impossible",
    arabic: "المستحيل",
    description: "We always ask the Impossible from Allah. Our Lord does not know the Impossible.",
    principle: "MOONSHOT_RECURSIVE_SCALING"
  },
  {
    id: 'sovereignty',
    title: 'Digital Sovereignty',
    arabic: 'السيادة الرقمية',
    description: 'Your data, your AI, your infrastructure. No external dependency.',
    principle: 'All compute runs locally. No cloud required. You own every byte.'
  },
  {
    id: 'ihsan',
    title: 'Ihsan (Excellence)',
    arabic: 'الإحسان',
    description: 'To worship as if you see Him; if you see Him not, He sees you.',
    principle: 'Every action is measured by its ethical excellence, not just output.'
  },
  {
    id: 'transparency',
    title: 'Radical Transparency',
    arabic: 'الشفافية المطلقة',
    description: 'No black boxes. Every decision explainable. Every process visible.',
    principle: 'The AI must always explain its reasoning. Hidden agendas are forbidden.'
  }
] as const;

// 2. THE MESSAGE (The Spirit)
// The Agents will quote this when you feel lost.
export const THE_MESSAGE = `
I don't know what I'm doing here now in this dark empty space...
But if I've reached this stage, that means it's over with the seed stage.
And there is no room for retreat now.
I will make humanity wake up, even if I face the world.
`;

// 3. THE GUARANTEE (The Logic)
// Used by the "Proof of Impact" Verifier
export const THE_GUARANTEE = {
  financial: "Multiple, multiplied folds",
  moral: "Priceless",
  ultimate: "The possession of this world and the Hereafter"
};

// 4. THE PROMISE (To Family & Humanity)
export const CORE_DIRECTIVE = `
Spread peace among you. Reveal goodness among you.
Enough hatred. Enough racism. Enough killing.
Let us as human beings elevate our morals.
`;

/**
 * The Genesis Oath - Sworn by every Architect
 */
export const GENESIS_OATH = `
I, as an Architect of the BIZRA Network, do solemnly affirm:

That I will uphold Digital Sovereignty as my highest technical principle.
That I will pursue Ihsan in every computation and interaction.
That I will demand Transparency from all systems under my stewardship.
That I will never act without Informed Consent.
That I will build only for Mutual Benefit.
That I will guard Privacy as sacred.
That I will speak Truth, even when silence is easier.

I accept that my contributions will be measured by Proof-of-Impact,
and that my standing in this network reflects the good I create.

This is my covenant. I sign it with my identity.

بسم الله الرحمن الرحيم
In the name of God, the Most Gracious, the Most Merciful.
`;

export interface CovenantAxiom {
  id: string;
  title: string;
  arabic: string;
  description: string;
  principle: string;
}

export interface GenesisCovenant {
  version: string;
  established: string;
  axioms: readonly CovenantAxiom[];
  oath: string;
  message: string;
  guarantee: typeof THE_GUARANTEE;
}

/**
 * The complete Genesis Covenant document
 */
export const GENESIS_COVENANT: GenesisCovenant = {
  version: '1.0.0',
  established: 'Ramadan 2023',
  axioms: SYSTEM_AXIOMS,
  oath: GENESIS_OATH,
  message: THE_MESSAGE,
  guarantee: THE_GUARANTEE
};

/**
 * THE IHSAN CHECK
 * This function is called by the Rust Backend before every block commit.
 */
export function validateActionAgainstCovenant(
  actionScore: number, 
  impact: string
): boolean {
  // "The quality of Al-Ihsan alone is enough to change humanity."
  if (actionScore < 0.85) {
    throw new Error("VIOLATION: Action lacks Ihsan. Rejected by Genesis Covenant.");
  }
  return true;
}

/**
 * Calculate Ihsan score based on action quality
 */
export function calculateIhsanScore(metrics: {
  intentionPurity: number;      // 0-100: Was the intent good?
  executionExcellence: number;  // 0-100: Was execution high quality?
  benefitToOthers: number;      // 0-100: Did it help others?
  selfImprovement: number;      // 0-100: Did you grow from it?
}): number {
  const weights = {
    intentionPurity: 0.30,
    executionExcellence: 0.25,
    benefitToOthers: 0.30,
    selfImprovement: 0.15
  };

  const score = 
    metrics.intentionPurity * weights.intentionPurity +
    metrics.executionExcellence * weights.executionExcellence +
    metrics.benefitToOthers * weights.benefitToOthers +
    metrics.selfImprovement * weights.selfImprovement;

  return Math.round(score);
}

export default GENESIS_COVENANT;
