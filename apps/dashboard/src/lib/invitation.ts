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
  },
  {
    code: 'MAHMOUD-GENESIS-2024',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'genesis',
    maxUses: 100,
    currentUses: 0,
    isActive: true,
  },
  {
    code: 'SOVEREIGNTY-NOW',
    createdAt: new Date().toISOString(),
    tier: 'genesis',
    maxUses: 50,
    currentUses: 0,
    isActive: true,
  },
  {
    code: 'NODE0-PIONEER',
    createdAt: new Date().toISOString(),
    tier: 'genesis',
    maxUses: 100,
    currentUses: 0,
    isActive: true,
  },
  {
    code: 'AI-FREEDOM-2025',
    createdAt: new Date().toISOString(),
    tier: 'early',
    maxUses: 200,
    currentUses: 0,
    isActive: true,
  },
  {
    code: 'BIZRA-BETA-ACCESS',
    createdAt: new Date().toISOString(),
    tier: 'early',
    maxUses: 100,
    currentUses: 0,
    isActive: true,
  },
  // === FRIEND INVITATION CODES (December 2025) ===
  {
    code: 'BIZRA-FRIEND-VIP',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'genesis',
    maxUses: 10,
    currentUses: 0,
    isActive: true,
  },
  {
    code: 'SOVEREIGN-MIND-2025',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'genesis',
    maxUses: 5,
    currentUses: 0,
    isActive: true,
  },
  {
    code: 'WELCOME-TO-BIZRA',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'early',
    maxUses: 20,
    currentUses: 0,
    isActive: true,
  },
  {
    code: 'JOIN-THE-REVOLUTION',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'early',
    maxUses: 15,
    currentUses: 0,
    isActive: true,
  },
  {
    code: 'AI-SOVEREIGN-NOW',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'early',
    maxUses: 10,
    currentUses: 0,
    isActive: true,
  },
  {
    code: 'GENESIS-DECEMBER',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'genesis',
    maxUses: 5,
    currentUses: 0,
    isActive: true,
  },
  {
    code: 'BIZRA-EXCLUSIVE',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'genesis',
    maxUses: 3,
    currentUses: 0,
    isActive: true,
  },
  {
    code: 'OWN-YOUR-AI',
    createdAt: new Date().toISOString(),
    invitedBy: 'Mahmoud',
    tier: 'early',
    maxUses: 25,
    currentUses: 0,
    isActive: true,
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
  }));
  
  return {
    success: true,
    userNumber,
    tier: codes[codeIndex].tier,
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
