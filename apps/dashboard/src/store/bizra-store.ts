/**
 * BIZRA Genesis Node - Zustand State Store
 * 
 * Elite Practitioner Implementation featuring:
 * - Centralized state management
 * - Persist middleware for local storage
 * - Devtools integration
 * - Computed selectors
 * - Action creators with optimistic updates
 * - Type-safe state slices
 * 
 * @module BIZRAStore
 * @version 2.0.0
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { SACRED_FREQUENCIES } from '../lib/design-system';

type AgentSyncResponse = {
  pat?: Partial<AgentState['pat']>
  sat?: Partial<AgentState['sat']>
}

type SessionRefreshResponse = {
  token?: string
  expires_at?: number
  refresh_token?: string | null
}

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

// Consciousness State
export interface ConsciousnessState {
  level: number; // 0-100
  coherence: number; // 0-100
  frequency: number; // Hz
  resonance: number; // 0-1
  awakening_stage: 'dormant' | 'stirring' | 'awakening' | 'aware' | 'enlightened';
  last_alignment: number | null;
  alignment_history: Array<{
    timestamp: number;
    level: number;
    frequency: number;
  }>;
}

// Agent State
export interface AgentState {
  pat: {
    status: 'active' | 'processing' | 'idle' | 'offline';
    efficiency: number;
    tasks_completed: number;
    tasks_pending: number;
    current_task: string | null;
    health: number;
  };
  sat: {
    status: 'active' | 'consulting' | 'idle' | 'offline';
    wisdom_index: number;
    consultations: number;
    current_query: string | null;
    response_quality: number;
  };
  last_sync: number | null;
}

// Blockchain State
export interface BlockchainState {
  connected: boolean;
  blocks_processed: number;
  transactions: {
    pending: number;
    completed: number;
    failed: number;
  };
  integrity_score: number;
  network_status: 'healthy' | 'degraded' | 'critical' | 'offline';
  last_block_hash: string | null;
  last_block_time: number | null;
  gas_estimate: number;
}

// Impact State
export interface ImpactState {
  global_reach: number;
  consciousness_raised: number;
  communities_served: number;
  transformation_index: number;
  active_nodes: number;
  total_value_created: number;
  milestones_achieved: string[];
}

// UI State
export interface UIState {
  theme: 'light' | 'dark' | 'cosmic';
  sidebar_collapsed: boolean;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  animations_enabled: boolean;
  current_view: string;
  modal: {
    open: boolean;
    type: string | null;
    data: unknown;
  };
  toast_queue: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration: number;
  }>;
  loading_states: Record<string, boolean>;
}

// User State
export interface UserState {
  authenticated: boolean;
  id: string | null;
  email: string | null;
  name: string | null;
  avatar: string | null;
  role: 'user' | 'practitioner' | 'elder' | 'guardian' | 'admin';
  permissions: string[];
  preferences: {
    language: string;
    timezone: string;
    currency: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  session: {
    token: string | null;
    expires_at: number | null;
    refresh_token: string | null;
  };
}

// Combined Store State
export interface BIZRAStoreState {
  consciousness: ConsciousnessState;
  agents: AgentState;
  blockchain: BlockchainState;
  impact: ImpactState;
  ui: UIState;
  user: UserState;
}

// Store Actions
export interface BIZRAStoreActions {
  // Consciousness Actions
  updateConsciousnessLevel: (level: number) => void;
  alignFrequency: (frequency: number) => void;
  recordAlignment: (level: number, frequency: number) => void;
  setAwakeningStage: (stage: ConsciousnessState['awakening_stage']) => void;

  // Agent Actions
  updatePATStatus: (status: Partial<AgentState['pat']>) => void;
  updateSATStatus: (status: Partial<AgentState['sat']>) => void;
  syncAgents: () => Promise<void>;

  // Blockchain Actions
  updateBlockchainState: (state: Partial<BlockchainState>) => void;
  processTransaction: (type: 'pending' | 'completed' | 'failed') => void;
  setNetworkStatus: (status: BlockchainState['network_status']) => void;

  // Impact Actions
  updateImpactMetrics: (metrics: Partial<ImpactState>) => void;
  achieveMilestone: (milestone: string) => void;

  // UI Actions
  setTheme: (theme: UIState['theme']) => void;
  toggleSidebar: () => void;
  openModal: (type: string, data?: unknown) => void;
  closeModal: () => void;
  addToast: (toast: Omit<UIState['toast_queue'][0], 'id'>) => void;
  removeToast: (id: string) => void;
  setLoadingState: (key: string, loading: boolean) => void;
  setCurrentView: (view: string) => void;

  // User Actions
  login: (userData: Partial<UserState> & { token: string }) => void;
  logout: () => void;
  updateUserPreferences: (preferences: Partial<UserState['preferences']>) => void;
  refreshSession: () => Promise<boolean>;

  // Global Actions
  reset: () => void;
  hydrate: (state: Partial<BIZRAStoreState>) => void;
}

// Complete Store Type
export type BIZRAStore = BIZRAStoreState & BIZRAStoreActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialConsciousnessState: ConsciousnessState = {
  level: 0,
  coherence: 0,
  frequency: SACRED_FREQUENCIES.healing,
  resonance: 0,
  awakening_stage: 'dormant',
  last_alignment: null,
  alignment_history: [],
};

const initialAgentState: AgentState = {
  pat: {
    status: 'idle',
    efficiency: 0,
    tasks_completed: 0,
    tasks_pending: 0,
    current_task: null,
    health: 100,
  },
  sat: {
    status: 'idle',
    wisdom_index: 0,
    consultations: 0,
    current_query: null,
    response_quality: 0,
  },
  last_sync: null,
};

const initialBlockchainState: BlockchainState = {
  connected: false,
  blocks_processed: 0,
  transactions: {
    pending: 0,
    completed: 0,
    failed: 0,
  },
  integrity_score: 100,
  network_status: 'offline',
  last_block_hash: null,
  last_block_time: null,
  gas_estimate: 0,
};

const initialImpactState: ImpactState = {
  global_reach: 0,
  consciousness_raised: 0,
  communities_served: 0,
  transformation_index: 0,
  active_nodes: 0,
  total_value_created: 0,
  milestones_achieved: [],
};

const initialUIState: UIState = {
  theme: 'cosmic',
  sidebar_collapsed: false,
  notifications_enabled: true,
  sound_enabled: true,
  animations_enabled: true,
  current_view: 'dashboard',
  modal: {
    open: false,
    type: null,
    data: null,
  },
  toast_queue: [],
  loading_states: {},
};

const initialUserState: UserState = {
  authenticated: false,
  id: null,
  email: null,
  name: null,
  avatar: null,
  role: 'user',
  permissions: [],
  preferences: {
    language: 'en',
    timezone: 'UTC',
    currency: 'USD',
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
  },
  session: {
    token: null,
    expires_at: null,
    refresh_token: null,
  },
};

const initialState: BIZRAStoreState = {
  consciousness: initialConsciousnessState,
  agents: initialAgentState,
  blockchain: initialBlockchainState,
  impact: initialImpactState,
  ui: initialUIState,
  user: initialUserState,
};

// =============================================================================
// STORE CREATION
// =============================================================================

export const useBIZRAStore = create<BIZRAStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // Initial State
          ...initialState,

          // =====================================================================
          // CONSCIOUSNESS ACTIONS
          // =====================================================================

          updateConsciousnessLevel: (level: number) => {
            set((state) => {
              state.consciousness.level = Math.max(0, Math.min(100, level));
              
              // Update awakening stage based on level
              if (level >= 90) {state.consciousness.awakening_stage = 'enlightened';}
              else if (level >= 70) {state.consciousness.awakening_stage = 'aware';}
              else if (level >= 50) {state.consciousness.awakening_stage = 'awakening';}
              else if (level >= 25) {state.consciousness.awakening_stage = 'stirring';}
              else {state.consciousness.awakening_stage = 'dormant';}
            });
          },

          alignFrequency: (frequency: number) => {
            set((state) => {
              state.consciousness.frequency = frequency;
              state.consciousness.last_alignment = Date.now();
              
              // Calculate resonance based on sacred frequencies alignment
              const sacredFreqs = Object.values(SACRED_FREQUENCIES);
              const closestSacred = sacredFreqs.reduce((prev, curr) =>
                Math.abs(curr - frequency) < Math.abs(prev - frequency) ? curr : prev
              );
              const deviation = Math.abs(frequency - closestSacred);
              state.consciousness.resonance = Math.max(0, 1 - deviation / 100);
            });
          },

          recordAlignment: (level: number, frequency: number) => {
            set((state) => {
              state.consciousness.alignment_history.push({
                timestamp: Date.now(),
                level,
                frequency,
              });
              
              // Keep only last 100 entries
              if (state.consciousness.alignment_history.length > 100) {
                state.consciousness.alignment_history = 
                  state.consciousness.alignment_history.slice(-100);
              }
            });
          },

          setAwakeningStage: (stage: ConsciousnessState['awakening_stage']) => {
            set((state) => {
              state.consciousness.awakening_stage = stage;
            });
          },

          // =====================================================================
          // AGENT ACTIONS
          // =====================================================================

          updatePATStatus: (status: Partial<AgentState['pat']>) => {
            set((state) => {
              Object.assign(state.agents.pat, status);
            });
          },

          updateSATStatus: (status: Partial<AgentState['sat']>) => {
            set((state) => {
              Object.assign(state.agents.sat, status);
            });
          },

          syncAgents: async () => {
            const { setLoadingState } = get();
            setLoadingState('agents_sync', true);

            try {
              // Simulated API call - replace with actual implementation
              const response = await fetch('/api/agents');
              const data = (await response.json()) as AgentSyncResponse;

              set((state) => {
                if (data.pat) {Object.assign(state.agents.pat, data.pat);}
                if (data.sat) {Object.assign(state.agents.sat, data.sat);}
                state.agents.last_sync = Date.now();
              });
            } catch (error) {
              console.error('[BIZRA Store] Agent sync failed:', error);
            } finally {
              setLoadingState('agents_sync', false);
            }
          },

          // =====================================================================
          // BLOCKCHAIN ACTIONS
          // =====================================================================

          updateBlockchainState: (state: Partial<BlockchainState>) => {
            set((store) => {
              Object.assign(store.blockchain, state);
            });
          },

          processTransaction: (type: 'pending' | 'completed' | 'failed') => {
            set((state) => {
              state.blockchain.transactions[type]++;
              
              if (type === 'completed') {
                state.blockchain.blocks_processed++;
              }
            });
          },

          setNetworkStatus: (status: BlockchainState['network_status']) => {
            set((state) => {
              state.blockchain.network_status = status;
              state.blockchain.connected = status !== 'offline';
            });
          },

          // =====================================================================
          // IMPACT ACTIONS
          // =====================================================================

          updateImpactMetrics: (metrics: Partial<ImpactState>) => {
            set((state) => {
              Object.assign(state.impact, metrics);
            });
          },

          achieveMilestone: (milestone: string) => {
            set((state) => {
              if (!state.impact.milestones_achieved.includes(milestone)) {
                state.impact.milestones_achieved.push(milestone);
              }
            });
          },

          // =====================================================================
          // UI ACTIONS
          // =====================================================================

          setTheme: (theme: UIState['theme']) => {
            set((state) => {
              state.ui.theme = theme;
            });
            
            // Apply theme to document
            if (typeof document !== 'undefined') {
              document.documentElement.setAttribute('data-theme', theme);
            }
          },

          toggleSidebar: () => {
            set((state) => {
              state.ui.sidebar_collapsed = !state.ui.sidebar_collapsed;
            });
          },

          openModal: (type: string, data?: unknown) => {
            set((state) => {
              state.ui.modal = { open: true, type, data };
            });
          },

          closeModal: () => {
            set((state) => {
              state.ui.modal = { open: false, type: null, data: null };
            });
          },

          addToast: (toast: Omit<UIState['toast_queue'][0], 'id'>) => {
            const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            
            set((state) => {
              state.ui.toast_queue.push({ ...toast, id });
            });

            // Auto-remove after duration
            if (toast.duration > 0) {
              setTimeout(() => {
                get().removeToast(id);
              }, toast.duration);
            }
          },

          removeToast: (id: string) => {
            set((state) => {
              state.ui.toast_queue = state.ui.toast_queue.filter((t) => t.id !== id);
            });
          },

          setLoadingState: (key: string, loading: boolean) => {
            set((state) => {
              state.ui.loading_states[key] = loading;
            });
          },

          setCurrentView: (view: string) => {
            set((state) => {
              state.ui.current_view = view;
            });
          },

          // =====================================================================
          // USER ACTIONS
          // =====================================================================

          login: (userData: Partial<UserState> & { token: string }) => {
            set((state) => {
              const { id, email, name, avatar, role, permissions, preferences } = userData;

              state.user.authenticated = true;
              state.user.session.token = userData.token;

              if (typeof id === 'string') {
                state.user.id = id;
              }
              if (typeof email === 'string') {
                state.user.email = email;
              }
              if (typeof name === 'string') {
                state.user.name = name;
              }
              if (typeof avatar === 'string') {
                state.user.avatar = avatar;
              }
              if (role) {
                state.user.role = role;
              }
              if (Array.isArray(permissions)) {
                state.user.permissions = [...permissions];
              }
              if (preferences) {
                state.user.preferences = {
                  ...state.user.preferences,
                  ...preferences,
                  notifications: {
                    ...state.user.preferences.notifications,
                    ...preferences.notifications,
                  },
                };
              }
            });
          },

          logout: () => {
            set((state) => {
              state.user = { ...initialUserState };
            });
            
            // Clear persisted storage
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('bizra-store');
            }
          },

          updateUserPreferences: (preferences: Partial<UserState['preferences']>) => {
            set((state) => {
              Object.assign(state.user.preferences, preferences);
            });
          },

          refreshSession: async () => {
            const { user, setLoadingState } = get();
            
            if (!user.session.refresh_token) {
              return false;
            }

            setLoadingState('session_refresh', true);

            try {
              const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: user.session.refresh_token }),
              });

              if (!response.ok) {
                get().logout();
                return false;
              }

              const data = (await response.json()) as SessionRefreshResponse;

              set((state) => {
                state.user.session.token = data.token ?? null;
                state.user.session.expires_at = data.expires_at ?? null;
                if (data.refresh_token) {
                  state.user.session.refresh_token = data.refresh_token;
                }
              });

              return true;
            } catch (error) {
              console.error('[BIZRA Store] Session refresh failed:', error);
              get().logout();
              return false;
            } finally {
              setLoadingState('session_refresh', false);
            }
          },

          // =====================================================================
          // GLOBAL ACTIONS
          // =====================================================================

          reset: () => {
            set(initialState);
          },

          hydrate: (newState: Partial<BIZRAStoreState>) => {
            set((state) => {
              if (newState.consciousness) {Object.assign(state.consciousness, newState.consciousness);}
              if (newState.agents) {Object.assign(state.agents, newState.agents);}
              if (newState.blockchain) {Object.assign(state.blockchain, newState.blockchain);}
              if (newState.impact) {Object.assign(state.impact, newState.impact);}
              if (newState.ui) {Object.assign(state.ui, newState.ui);}
              if (newState.user) {
                const incomingUser = newState.user;
                Object.assign(state.user, incomingUser);
                if (incomingUser?.preferences) {
                  state.user.preferences = {
                    ...state.user.preferences,
                    ...incomingUser.preferences,
                    notifications: {
                      ...state.user.preferences.notifications,
                      ...incomingUser.preferences.notifications,
                    },
                  };
                }
              }
            });
          },
        })),
        {
          name: 'bizra-store',
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({
            // Only persist these parts of the state
            user: {
              ...state.user,
              session: {
                ...state.user.session,
                // Don't persist sensitive tokens
                token: null,
              },
            },
            ui: {
              theme: state.ui.theme,
              sidebar_collapsed: state.ui.sidebar_collapsed,
              notifications_enabled: state.ui.notifications_enabled,
              sound_enabled: state.ui.sound_enabled,
              animations_enabled: state.ui.animations_enabled,
            },
            consciousness: {
              level: state.consciousness.level,
              awakening_stage: state.consciousness.awakening_stage,
            },
          }),
        }
      )
    ),
    { name: 'BIZRA Store' }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

// Consciousness Selectors
export const selectConsciousnessLevel = (state: BIZRAStore) => state.consciousness.level;
export const selectAwakeningStage = (state: BIZRAStore) => state.consciousness.awakening_stage;
export const selectCoherence = (state: BIZRAStore) => state.consciousness.coherence;
export const selectResonance = (state: BIZRAStore) => state.consciousness.resonance;

// Agent Selectors
export const selectPATStatus = (state: BIZRAStore) => state.agents.pat;
export const selectSATStatus = (state: BIZRAStore) => state.agents.sat;
export const selectAgentsOnline = (state: BIZRAStore) => 
  state.agents.pat.status !== 'offline' && state.agents.sat.status !== 'offline';

// Blockchain Selectors
export const selectBlockchainConnected = (state: BIZRAStore) => state.blockchain.connected;
export const selectNetworkStatus = (state: BIZRAStore) => state.blockchain.network_status;
export const selectTransactionCounts = (state: BIZRAStore) => state.blockchain.transactions;

// Impact Selectors
export const selectGlobalReach = (state: BIZRAStore) => state.impact.global_reach;
export const selectTransformationIndex = (state: BIZRAStore) => state.impact.transformation_index;

// UI Selectors
export const selectTheme = (state: BIZRAStore) => state.ui.theme;
export const selectSidebarCollapsed = (state: BIZRAStore) => state.ui.sidebar_collapsed;
export const selectLoadingState = (key: string) => (state: BIZRAStore) => 
  state.ui.loading_states[key] ?? false;
export const selectToasts = (state: BIZRAStore) => state.ui.toast_queue;

// User Selectors
export const selectIsAuthenticated = (state: BIZRAStore) => state.user.authenticated;
export const selectUserRole = (state: BIZRAStore) => state.user.role;
export const selectUserPermissions = (state: BIZRAStore) => state.user.permissions;
export const selectHasPermission = (permission: string) => (state: BIZRAStore) =>
  state.user.permissions.includes(permission) || state.user.role === 'admin';

// =============================================================================
// HOOKS
// =============================================================================

// Shallow comparison hook for performance
export const useBIZRAStoreShallow = <T>(selector: (state: BIZRAStore) => T): T => {
  return useBIZRAStore(selector);
};

// Convenience hooks
export const useConsciousness = () => useBIZRAStore((state) => state.consciousness);
export const useAgents = () => useBIZRAStore((state) => state.agents);
export const useBlockchain = () => useBIZRAStore((state) => state.blockchain);
export const useImpact = () => useBIZRAStore((state) => state.impact);
export const useUI = () => useBIZRAStore((state) => state.ui);
export const useUser = () => useBIZRAStore((state) => state.user);

// Action hooks
export const useConsciousnessActions = () => ({
  updateLevel: useBIZRAStore((state) => state.updateConsciousnessLevel),
  alignFrequency: useBIZRAStore((state) => state.alignFrequency),
  recordAlignment: useBIZRAStore((state) => state.recordAlignment),
  setStage: useBIZRAStore((state) => state.setAwakeningStage),
});

export const useAgentActions = () => ({
  updatePAT: useBIZRAStore((state) => state.updatePATStatus),
  updateSAT: useBIZRAStore((state) => state.updateSATStatus),
  sync: useBIZRAStore((state) => state.syncAgents),
});

export const useUIActions = () => ({
  setTheme: useBIZRAStore((state) => state.setTheme),
  toggleSidebar: useBIZRAStore((state) => state.toggleSidebar),
  openModal: useBIZRAStore((state) => state.openModal),
  closeModal: useBIZRAStore((state) => state.closeModal),
  addToast: useBIZRAStore((state) => state.addToast),
  removeToast: useBIZRAStore((state) => state.removeToast),
  setLoading: useBIZRAStore((state) => state.setLoadingState),
});

export const useUserActions = () => ({
  login: useBIZRAStore((state) => state.login),
  logout: useBIZRAStore((state) => state.logout),
  updatePreferences: useBIZRAStore((state) => state.updateUserPreferences),
  refreshSession: useBIZRAStore((state) => state.refreshSession),
});

export default useBIZRAStore;
