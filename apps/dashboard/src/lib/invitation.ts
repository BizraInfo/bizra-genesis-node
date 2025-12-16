/**
 * BIZRA Invitation System
 * 
 * Phase 1: First 1000 users require invitation codes (invite-only)
 * Phase 2: Public access for all
 * 
 * Invitation codes are generated and validated here.
 * In production, this would connect to a backend service.
 */

export interface InvitationCode {
  code: string;
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
  invitedBy?: string;
  tier: 'genesis' | 'early' | 'standard';
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  welcomeMessage?: string;
  specialTitle?: string;
  privileges?: string[];
}

// Special titles for early pioneers
export const PIONEER_TITLES: Record<number, string> = {
  1: 'The First Sovereign',
  2: 'The Second Dawn',
  3: 'The Third Pillar',
  4: 'The Fourth Architect',
  5: 'The Fifth Element',
  6: 'The Sixth Sense',
  7: 'The Seventh Star',
  8: 'The Eighth Wonder',
  9: 'The Ninth Gate',
  10: 'The Tenth Dimension',
};

// Get special title for pioneer number
export function getPioneerTitle(number: number): string {
  if (PIONEER_TITLES[number]) {
    return PIONEER_TITLES[number];
  }
  if (number <= 50) {
    return 'Founding Architect';
  }
  if (number <= 100) {
    return 'Genesis Pioneer';
  }
  if (number <= 500) {
    return 'Early Visionary';
  }
  return 'Sovereign Member';
}

// Get founder's personal message based on user number
export function getFounderMessage(number: number, tier: 'genesis' | 'early' | 'standard'): string {
  if (number <= 10) {
    return `You are one of the first 10 souls to join BIZRA. This is historic. Your name will be forever etched in our Genesis Block. Thank you for believing in sovereignty before it was proven. — Mahmoud`;
  }
  if (number <= 50) {
    return `Welcome, Founding Architect #${number}. You're among the first 50 visionaries who saw what others couldn't. Together, we will build something extraordinary. — Mahmoud`;
  }
  if (number <= 100) {
    return `Pioneer #${number}, you made it before the first hundred. You're not just a user—you're a co-creator of this revolution. I'm honored to have you here. — Mahmoud`;
  }
  if (tier === 'genesis') {
    return `Welcome to the Genesis circle. Your belief in AI sovereignty is what makes this possible. Let's change the world together. — Mahmoud`;
  }
  if (tier === 'early') {
    return `As an early adopter, you're helping shape the future of personal AI. Thank you for joining this journey. — Mahmoud`;
  }
  return `Welcome to BIZRA. Your sovereignty begins now. — Mahmoud`;
}

// Get special perks based on pioneer number
export function getPioneerPerks(number: number): string[] {
  const basePerks = ['Lifetime sovereignty guarantee', 'Priority support'];
  
  if (number <= 10) {
    return [
      '🏆 Name in Genesis Block (forever)',
      '⭐ Founding Council voting rights',
      '🎁 Lifetime premium features FREE',
      '🔮 Direct line to founder',
      '💎 10,000 SEED tokens at launch',
      ...basePerks
    ];
  }
  if (number <= 50) {
    return [
      '🏆 Founding Architect badge',
      '⭐ Early governance participation',
      '🎁 Premium features for 5 years FREE',
      '💎 5,000 SEED tokens at launch',
      ...basePerks
    ];
  }
  if (number <= 100) {
    return [
      '🏆 Genesis Pioneer badge',
      '🎁 Premium features for 3 years FREE',
      '💎 2,500 SEED tokens at launch',
      ...basePerks
    ];
  }
  if (number <= 500) {
    return [
      '🏆 Early Visionary badge',
      '🎁 Premium features for 1 year FREE',
      '💎 1,000 SEED tokens at launch',
      ...basePerks
    ];
  }
  return [
    '🏆 Sovereign Member badge',
    '💎 500 SEED tokens at launch',
    ...basePerks
  ];
}

export interface InvitationStats {
  totalCodes: number;
  usedCodes: number;
  availableCodes: number;
  totalUsers: number;
  maxPhase1Users: number;
  isPublicPhase: boolean;
}

// System configuration
const MAX_PHASE1_USERS = 1000;
const STORAGE_KEY = 'bizra_invitation';
const CODES_STORAGE_KEY = 'bizra_invitation_codes';
const USERS_COUNT_KEY = 'bizra_users_count';

// Pre-generated Genesis codes (the founder's codes)
// In production, these would be stored in a secure backend
const GENESIS_CODES: InvitationCode[] = [
  {
    code: 'BIZRA-GENESIS-001',
    createdAt: new Date().toISOString(),
    tier: 'genesis',
    maxUses: 1000,
    currentUses: 0,
    isActive: true,
    welcomeMessage: 'You have been chosen to witness the birth of digital sovereignty.',
    specialTitle: '🌟 Genesis Pioneer',
    privileges: ['Lifetime Premium', 'Founding Member Badge', '5,000 SEED Tokens', 'Priority Support Forever', 'Your name in BIZRA Hall of Fame'],
  },
  {
    code: 'MAHMOUD-GENESIS-2024',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'genesis',
    maxUses: 100,
    currentUses: 0,
    isActive: true,
    welcomeMessage: 'Personally invited by Mahmoud - Welcome to the inner circle!',
    specialTitle: '👑 Founder\'s Circle',
    privileges: ['Direct access to Mahmoud', 'Lifetime Premium', 'Founding Member Badge', '5,000 SEED Tokens', 'Co-creator privileges'],
  },
  {
    code: 'SOVEREIGNTY-NOW',
    createdAt: new Date().toISOString(),
    tier: 'genesis',
    maxUses: 50,
    currentUses: 0,
    isActive: true,
    welcomeMessage: 'True sovereignty begins today. Welcome, freedom seeker.',
    specialTitle: '🗽 Sovereignty Champion',
    privileges: ['Lifetime Premium', 'Founding Member Badge', '5,000 SEED Tokens', 'Early governance rights', 'Exclusive sovereignty features'],
  },
  {
    code: 'NODE0-PIONEER',
    createdAt: new Date().toISOString(),
    tier: 'genesis',
    maxUses: 100,
    currentUses: 0,
    isActive: true,
    welcomeMessage: 'Node Zero awaits its pioneers. You are among the first.',
    specialTitle: '🚀 Node Zero Pioneer',
    privileges: ['Lifetime Premium', 'First Node Access', '5,000 SEED Tokens', 'Pioneer hardware discount', 'Beta testing priority'],
  },
  {
    code: 'AI-FREEDOM-2025',
    createdAt: new Date().toISOString(),
    tier: 'early',
    maxUses: 200,
    currentUses: 0,
    isActive: true,
    welcomeMessage: 'Welcome to the AI freedom movement. Your journey starts now.',
    specialTitle: '🤖 AI Freedom Fighter',
    privileges: ['3 Years Premium FREE', 'Early Visionary Badge', '2,500 SEED Tokens', 'AI model priority access'],
  },
  {
    code: 'BIZRA-BETA-ACCESS',
    createdAt: new Date().toISOString(),
    tier: 'early',
    maxUses: 100,
    currentUses: 0,
    isActive: true,
    welcomeMessage: 'Exclusive beta access granted. Help us shape the future.',
    specialTitle: '🧪 Beta Tester Elite',
    privileges: ['1 Year Premium FREE', 'Early Visionary Badge', '2,000 SEED Tokens', 'Direct feedback channel'],
  },
  // === FRIEND INVITATION CODES (December 2025) ===
  // These are SPECIAL codes - give to your closest friends!
  {
    code: 'BIZRA-FRIEND-VIP',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'genesis',
    maxUses: 10,
    currentUses: 0,
    isActive: true,
    welcomeMessage: '❤️ A true friend has brought you here. Mahmoud personally welcomes you to his vision!',
    specialTitle: '💎 Mahmoud\'s VIP Friend',
    privileges: ['Lifetime Premium', 'Personal thank you from Mahmoud', '5,000 SEED Tokens', 'VIP Discord channel', 'Your name in special thanks'],
  },
  {
    code: 'SOVEREIGN-MIND-2025',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'genesis',
    maxUses: 5,
    currentUses: 0,
    isActive: true,
    welcomeMessage: '🧠 A sovereign mind recognizes another. Welcome, enlightened one.',
    specialTitle: '🧠 Sovereign Mind',
    privileges: ['Lifetime Premium', 'Philosophy discussion group', '5,000 SEED Tokens', 'Special research access', 'Ideas consultation'],
  },
  {
    code: 'WELCOME-TO-BIZRA',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'early',
    maxUses: 20,
    currentUses: 0,
    isActive: true,
    welcomeMessage: '🎉 Welcome! You\'ve been specially invited to join the BIZRA revolution!',
    specialTitle: '⭐ Special Invitee',
    privileges: ['3 Years Premium FREE', 'Special welcome gift', '2,500 SEED Tokens', 'Priority support'],
  },
  {
    code: 'JOIN-THE-REVOLUTION',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'early',
    maxUses: 15,
    currentUses: 0,
    isActive: true,
    welcomeMessage: '✊ The revolution needs visionaries like you. Welcome aboard!',
    specialTitle: '✊ Revolutionary',
    privileges: ['2 Years Premium FREE', 'Revolutionary badge', '2,000 SEED Tokens', 'Community leader training'],
  },
  {
    code: 'AI-SOVEREIGN-NOW',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'early',
    maxUses: 10,
    currentUses: 0,
    isActive: true,
    welcomeMessage: '🔓 Break free from AI dependency. Your sovereign AI awaits.',
    specialTitle: '🔓 AI Liberator',
    privileges: ['2 Years Premium FREE', 'Liberator badge', '2,000 SEED Tokens', 'Early AI features'],
  },
  {
    code: 'GENESIS-DECEMBER',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'genesis',
    maxUses: 5,
    currentUses: 0,
    isActive: true,
    welcomeMessage: '❄️ December Genesis - The coldest month births the warmest community.',
    specialTitle: '❄️ December Genesis',
    privileges: ['Lifetime Premium', 'Winter founding member', '5,000 SEED Tokens', 'Seasonal surprise gifts', 'Anniversary celebration invite'],
  },
  {
    code: 'BIZRA-EXCLUSIVE',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'genesis',
    maxUses: 3,
    currentUses: 0,
    isActive: true,
    welcomeMessage: '🏆 Only 3 people will ever use this code. You are extraordinary.',
    specialTitle: '🏆 Ultra Exclusive',
    privileges: ['Lifetime Premium', 'Direct line to founder', '10,000 SEED Tokens', 'Advisory board consideration', 'Equity discussion eligibility'],
  },
  {
    code: 'OWN-YOUR-AI',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'early',
    maxUses: 25,
    currentUses: 0,
    isActive: true,
    welcomeMessage: '🏠 Your AI, your rules, your data. Welcome to true ownership.',
    specialTitle: '🏠 AI Owner',
    privileges: ['1 Year Premium FREE', 'Owner badge', '1,500 SEED Tokens', 'Self-hosting guide'],
  },
];

// Initialize codes in storage if not present
function initializeCodes(): void {
  if (typeof window === 'undefined') return;
  
  const existingCodes = localStorage.getItem(CODES_STORAGE_KEY);
  if (!existingCodes) {
    localStorage.setItem(CODES_STORAGE_KEY, JSON.stringify(GENESIS_CODES));
  }
}

// Get all codes from storage
function getCodes(): InvitationCode[] {
  if (typeof window === 'undefined') return GENESIS_CODES;
  
  initializeCodes();
  const stored = localStorage.getItem(CODES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : GENESIS_CODES;
}

// Save codes to storage
function saveCodes(codes: InvitationCode[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CODES_STORAGE_KEY, JSON.stringify(codes));
}

// Get current user count
function getUserCount(): number {
  if (typeof window === 'undefined') return 0;
  const count = localStorage.getItem(USERS_COUNT_KEY);
  return count ? parseInt(count, 10) : 0;
}

// Increment user count
function incrementUserCount(): number {
  if (typeof window === 'undefined') return 0;
  const current = getUserCount();
  const newCount = current + 1;
  localStorage.setItem(USERS_COUNT_KEY, String(newCount));
  return newCount;
}

/**
 * Check if the system is in public phase (1000+ users)
 */
export function isPublicPhase(): boolean {
  return getUserCount() >= MAX_PHASE1_USERS;
}

/**
 * Get invitation statistics
 */
export function getInvitationStats(): InvitationStats {
  const codes = getCodes();
  const usedCodes = codes.filter(c => c.currentUses > 0).length;
  const totalUsers = getUserCount();
  
  return {
    totalCodes: codes.length,
    usedCodes,
    availableCodes: codes.filter(c => c.isActive && c.currentUses < c.maxUses).length,
    totalUsers,
    maxPhase1Users: MAX_PHASE1_USERS,
    isPublicPhase: totalUsers >= MAX_PHASE1_USERS,
  };
}

/**
 * Validate an invitation code
 */
export function validateInvitationCode(code: string): {
  valid: boolean;
  error?: string;
  tier?: InvitationCode['tier'];
  invitedBy?: string;
  welcomeMessage?: string;
  specialTitle?: string;
  privileges?: string[];
} {
  // If in public phase, all codes are valid
  if (isPublicPhase()) {
    return { valid: true, tier: 'standard' };
  }
  
  const normalizedCode = code.toUpperCase().trim();
  const codes = getCodes();
  
  const invitation = codes.find(c => c.code === normalizedCode);
  
  if (!invitation) {
    return { valid: false, error: 'invitation.errors.invalidCode' };
  }
  
  if (!invitation.isActive) {
    return { valid: false, error: 'invitation.errors.codeInactive' };
  }
  
  if (invitation.currentUses >= invitation.maxUses) {
    return { valid: false, error: 'invitation.errors.codeExhausted' };
  }
  
  return {
    valid: true,
    tier: invitation.tier,
    invitedBy: invitation.invitedBy,
    welcomeMessage: invitation.welcomeMessage,
    specialTitle: invitation.specialTitle,
    privileges: invitation.privileges,
  };
}

/**
 * Use an invitation code (mark as used)
 */
export function useInvitationCode(code: string, userName?: string): {
  success: boolean;
  userNumber?: number;
  tier?: InvitationCode['tier'];
  error?: string;
  welcomeMessage?: string;
  specialTitle?: string;
  privileges?: string[];
} {
  const validation = validateInvitationCode(code);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  // If public phase, just register the user
  if (isPublicPhase()) {
    const userNumber = incrementUserCount();
    return { success: true, userNumber, tier: 'standard' };
  }
  
  const normalizedCode = code.toUpperCase().trim();
  const codes = getCodes();
  const codeIndex = codes.findIndex(c => c.code === normalizedCode);
  
  if (codeIndex === -1) {
    return { success: false, error: 'invitation.errors.invalidCode' };
  }
  
  // Update the code
  codes[codeIndex] = {
    ...codes[codeIndex],
    currentUses: codes[codeIndex].currentUses + 1,
    usedAt: new Date().toISOString(),
    usedBy: userName,
  };
  
  saveCodes(codes);
  
  // Increment user count
  const userNumber = incrementUserCount();
  
  // Save user's invitation status
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    code: normalizedCode,
    tier: codes[codeIndex].tier,
    usedAt: new Date().toISOString(),
    userNumber,
    welcomeMessage: codes[codeIndex].welcomeMessage,
    specialTitle: codes[codeIndex].specialTitle,
    privileges: codes[codeIndex].privileges,
  }));
  
  return {
    success: true,
    userNumber,
    tier: codes[codeIndex].tier,
    welcomeMessage: codes[codeIndex].welcomeMessage,
    specialTitle: codes[codeIndex].specialTitle,
    privileges: codes[codeIndex].privileges,
  };
}

/**
 * Check if current user has a valid invitation
 */
export function hasValidInvitation(): boolean {
  if (typeof window === 'undefined') return false;
  
  // If public phase, everyone is valid
  if (isPublicPhase()) return true;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  
  try {
    const invitation = JSON.parse(stored);
    return !!invitation.code && !!invitation.usedAt;
  } catch {
    return false;
  }
}

/**
 * Get current user's invitation info
 */
export function getCurrentInvitation(): {
  code?: string;
  tier?: InvitationCode['tier'];
  userNumber?: number;
  usedAt?: string;
  welcomeMessage?: string;
  specialTitle?: string;
  privileges?: string[];
} | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Generate a new invitation code (for existing users to invite others)
 */
export function generateInvitationCode(generatedBy: string): string {
  const codes = getCodes();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newCode = `BIZRA-${randomPart}`;
  
  const newInvitation: InvitationCode = {
    code: newCode,
    createdAt: new Date().toISOString(),
    invitedBy: generatedBy,
    tier: 'standard',
    maxUses: 3, // Each user can invite 3 people
    currentUses: 0,
    isActive: true,
  };
  
  codes.push(newInvitation);
  saveCodes(codes);
  
  return newCode;
}

/**
 * Get codes generated by a specific user
 */
export function getUserGeneratedCodes(userName: string): InvitationCode[] {
  const codes = getCodes();
  return codes.filter(c => c.invitedBy === userName);
}

// Export for testing/admin
export const _internal = {
  MAX_PHASE1_USERS,
  GENESIS_CODES,
  initializeCodes,
  getCodes,
  saveCodes,
  getUserCount,
  incrementUserCount,
};
