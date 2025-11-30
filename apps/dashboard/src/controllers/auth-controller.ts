// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  AUTH CONTROLLER - Synapse-Driven Authentication Journey                 ║
// ║  Handles login, logout, token persistence, API integration               ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { createSynapse, executeJourney } from '@/lib/synapse/core';
import type { SynapseStore } from '@/lib/synapse/core';
import { API_BASE } from '../config';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthData {
  token: string;
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = API_BASE;
const TOKEN_KEY = 'bizra_auth_token';

// ─────────────────────────────────────────────────────────────────────────────
// Synapse Store
// ─────────────────────────────────────────────────────────────────────────────

export const useAuthStore = createSynapse<AuthData>('Auth', null, {
  clearOnReset: true,
  clearOnFail: false, // Keep last-good on error (optional)
  onSuccess: (data) => {
    // Persist token to localStorage
    localStorage.setItem(TOKEN_KEY, data.token);
    console.log('✅ Auth success:', data.user.email);
  },
  onError: (message) => {
    console.error('❌ Auth error:', message);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

async function loginAPI(credentials: LoginCredentials): Promise<AuthData> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    token: data.token,
    user: {
      id: data.user.id,
      email: data.user.email,
      roles: data.user.roles || [],
    },
  };
}

async function refreshTokenAPI(token: string): Promise<AuthData> {
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  return {
    token: data.token,
    user: data.user,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function login(credentials: LoginCredentials) {
  return executeJourney(useAuthStore.getState(), () => loginAPI(credentials));
}

export async function logout() {
  localStorage.removeItem(TOKEN_KEY);
  useAuthStore.getState().reset();
}

export async function refreshAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return { success: false, error: 'No token found' } as const;
  }

  return executeJourney(useAuthStore.getState(), () => refreshTokenAPI(token));
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

export function initializeAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    refreshAuth(); // Auto-refresh on app start
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type AuthStore = SynapseStore<AuthData>;
