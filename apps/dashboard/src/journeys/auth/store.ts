// apps/dashboard/src/journeys/auth/store.ts
// BIZRA Synapse Auth Store - Demo implementation of Synapse pattern

import { create } from 'zustand';
import { SynapseState } from '@/lib/synapse/core';

// Simple auth interfaces
export interface AuthData {
  user?: {
    id: string;
    email: string;
    roles: string[];
  } | null;
  sessionToken?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  acceptTerms: boolean;
  firstName?: string;
}

// Store interface
interface AuthStore {
  state: SynapseState;
  data: AuthData | null;
  error: string | null;
  actions: {
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    reset: () => void;
  };
}

export const useAuthStore = create<AuthStore>((set) => ({
  state: SynapseState.IDLE,
  data: null,
  error: null,

  actions: {
    async login(email: string, password: string) {
      console.log('[SYNAPSE:AUTH] Login journey starting...');

      set({ state: SynapseState.LOADING, error: null });

      try {
        // Simulate API call - replace with real endpoint
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (email.includes('@') && password.length >= 6) {
          // Success
          const authData: AuthData = {
            user: {
              id: 'user-123',
              email: email,
              roles: ['USER']
            },
            sessionToken: 'mock-jwt-token-12345'
          };

          set({
            state: SynapseState.SUCCESS,
            data: authData,
            error: null
          });

          console.log('[SYNAPSE:AUTH] Login journey completed successfully');
        } else {
          // Failed validation
          throw new Error('Invalid email or password too short');
        }

      } catch (error) {
        set({
          state: SynapseState.ERROR,
          error: error instanceof Error ? error.message : 'Login failed',
          data: null
        });

        console.log('[SYNAPSE:AUTH] Login journey failed:', error);
      }
    },

    async register(data: RegisterData) {
      console.log('[SYNAPSE:AUTH] Register journey starting...');

      set({ state: SynapseState.LOADING, error: null });

      try {
        // Simulate API call - replace with real endpoint
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (data.email.includes('@') && data.acceptTerms) {
          // Success
          const authData: AuthData = {
            user: {
              id: 'user-456',
              email: data.email,
              roles: ['USER']
            },
            sessionToken: 'mock-jwt-token-67890'
          };

          set({
            state: SynapseState.SUCCESS,
            data: authData,
            error: null
          });

          console.log('[SYNAPSE:AUTH] Register journey completed successfully');
        } else {
          // Failed validation
          throw new Error('Invalid email or terms not accepted');
        }

      } catch (error) {
        set({
          state: SynapseState.ERROR,
          error: error instanceof Error ? error.message : 'Registration failed',
          data: null
        });

        console.log('[SYNAPSE:AUTH] Register journey failed:', error);
      }
    },

    async logout() {
      console.log('[SYNAPSE:AUTH] Logout journey starting...');

      set({ state: SynapseState.LOADING });

      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        set({
          state: SynapseState.IDLE,
          data: null,
          error: null
        });

        console.log('[SYNAPSE:AUTH] Logout journey completed successfully');

      } catch (error) {
        // Logout should succeed locally
        set({
          state: SynapseState.IDLE,
          data: null,
          error: null
        });

        console.log('[SYNAPSE:AUTH] Logout completed (API error ignored)');
      }
    },

    reset() {
      console.log('[SYNAPSE:AUTH] Auth state reset');
      set({
        state: SynapseState.IDLE,
        data: null,
        error: null
      });
    }
  }
}));

// Utility selectors
export const useAuthState = () => useAuthStore(state => state.state);
export const useAuthData = () => useAuthStore(state => state.data);
export const useAuthError = () => useAuthStore(state => state.error);
export const useAuthActions = () => useAuthStore(state => state.actions);
export const useIsAuthenticated = () => {
  const data = useAuthStore(state => state.data);
  return !!data?.user && !!data?.sessionToken;
};
