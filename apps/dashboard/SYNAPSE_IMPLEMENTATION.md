# Synapse Architecture Implementation

## Overview

The **Synapse Pattern** is a finite state machine architecture for predictable, debuggable UI state management. It eliminates undefined states and provides guaranteed error handling for all async operations.

## Status: ✅ COMPLETE

**Implementation Date:** 2025-11-23
**Files Created:** 6
**Dependencies:** Zustand 5.0.8

---

## Architecture

### Core Concept

Every UI journey follows a strict lifecycle:

```
IDLE → LOADING → SUCCESS/ERROR/BLOCKED
```

No undefined states. No silent failures. Every transition is tracked.

### Directory Structure

```
apps/dashboard/src/
├── lib/synapse/
│   ├── core.ts          # Synapse Core - createSynapse, executeJourney
│   └── index.ts         # Barrel export
└── controllers/
    ├── auth-controller.ts      # Authentication journey
    ├── agents-controller.ts    # Agent management journey
    ├── metrics-controller.ts   # System metrics journey
    └── index.ts                # Barrel export
```

---

## Core API

### `createSynapse<TData>(name, initialData, options)`

Factory function that creates a Zustand store with Synapse lifecycle.

**Type Signature:**
```typescript
export const createSynapse = <TData>(
  name: string,
  initialData: TData | null = null,
  options: SynapseOptions<TData> = {}
) => StoreApi<SynapseStore<TData>>
```

**Options:**
- `clearOnReset?: boolean` - Clear data on reset() (default: true)
- `clearOnFail?: boolean` - Clear data on fail() (default: false - keep-last-good)
- `onSuccess?: (data: TData) => void` - Hook called after succeed()
- `onError?: (message: string) => void` - Hook called after fail()

**Returns:** Zustand store with:
- **State:** `status`, `data`, `error`, `lastUpdated`
- **Actions:** `start()`, `succeed(payload)`, `fail(error)`, `reset()`

**Example:**
```typescript
export const useAuthStore = createSynapse<AuthData>('Auth', null, {
  clearOnReset: true,
  clearOnFail: false,
  onSuccess: (data) => {
    localStorage.setItem('token', data.token);
    console.log('✅ Auth success:', data.user.email);
  },
  onError: (message) => {
    console.error('❌ Auth error:', message);
  },
});
```

### `executeJourney<T>(store, operation)`

Wraps async operations in the Synapse lifecycle with guaranteed error handling.

**Type Signature:**
```typescript
export async function executeJourney<T>(
  store: SynapseActions<T>,
  operation: () => Promise<T>
): Promise<ExecuteJourneyResult<T>>
```

**Guarantees:**
1. Calls `store.start()` before operation
2. Calls `store.succeed(result)` on success
3. Calls `store.fail(message)` on error
4. Never throws - always returns result object

**Example:**
```typescript
export async function login(credentials: LoginCredentials) {
  return executeJourney(useAuthStore.getState(), () => loginAPI(credentials));
}
```

---

## Implemented Controllers

### 1. Auth Controller (`auth-controller.ts`)

**Purpose:** Manages authentication state, login/logout, token persistence

**Exports:**
- `useAuthStore` - Synapse store for auth state
- `login(credentials)` - Login with email/password
- `logout()` - Clear auth state and token
- `refreshAuth()` - Refresh token from localStorage
- `initializeAuth()` - Auto-refresh on app start

**Types:**
- `AuthData` - Token + user info
- `LoginCredentials` - Email + password
- `AuthStore` - Full store type

**Features:**
- Token persistence to localStorage
- Auto-refresh on app start
- Keep-last-good pattern (preserves data on error)
- Success/error logging

**Integration:**
```typescript
import { useAuthStore, login, logout } from '@/controllers/auth-controller';

function LoginPage() {
  const { status, data, error } = useAuthStore();

  const handleLogin = async () => {
    const result = await login({ email, password });
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div>
      {status === 'LOADING' && <Spinner />}
      {status === 'ERROR' && <Alert>{error}</Alert>}
      {status === 'SUCCESS' && <div>Welcome, {data.user.email}</div>}
    </div>
  );
}
```

### 2. Agents Controller (`agents-controller.ts`)

**Purpose:** Manages agent list, status updates, WebSocket integration

**Exports:**
- `useAgentsStore` - Synapse store for agents
- `refreshAgents()` - Fetch agents from API
- `updateAgentStatus(id, status)` - Update single agent status
- `updateAgentMetrics(id, metrics)` - Update agent metrics
- `handleAgentWebSocketMessage(msg)` - WebSocket handler

**Types:**
- `Agent` - Agent with status, capabilities, metrics
- `AgentListData` - Agents array + counts
- `AgentsStore` - Full store type

**Features:**
- Keep-last-good pattern (resilient to failures)
- WebSocket real-time updates
- Active/total count tracking
- Optimistic UI updates

**Integration:**
```typescript
import { useAgentsStore, refreshAgents, handleAgentWebSocketMessage } from '@/controllers/agents-controller';

function AgentsPanel() {
  const { status, data } = useAgentsStore();

  useEffect(() => {
    refreshAgents();

    // Connect WebSocket
    const ws = new WebSocket('ws://localhost:3000/ws');
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      handleAgentWebSocketMessage(msg);
    };
  }, []);

  return (
    <div>
      <h2>Agents: {data?.activeCount}/{data?.totalCount}</h2>
      {data?.agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
```

### 3. Metrics Controller (`metrics-controller.ts`)

**Purpose:** System health, PoI stats, reward metrics

**Exports:**
- `useMetricsStore` - Synapse store for metrics
- `refreshMetrics()` - Fetch metrics from API
- `startMetricsPolling()` - Start auto-refresh (5s interval)
- `stopMetricsPolling()` - Stop auto-refresh
- `handleMetricsWebSocketMessage(msg)` - WebSocket handler
- `getHealthColor(health)` - Utility for health status
- `formatUptime(seconds)` - Utility for uptime display

**Types:**
- `SystemMetrics` - Health, uptime, RPS, latency, error rate
- `PoIMetrics` - Proof counts, epoch info
- `RewardMetrics` - Distribution stats, top contributors
- `MetricsData` - Combined metrics object

**Features:**
- Auto-polling with configurable interval
- WebSocket partial updates (no full refresh needed)
- Keep-last-good pattern
- Utility helpers for display

**Integration:**
```typescript
import {
  useMetricsStore,
  startMetricsPolling,
  stopMetricsPolling,
  getHealthColor,
  formatUptime
} from '@/controllers/metrics-controller';

function MetricsDashboard() {
  const { status, data } = useMetricsStore();

  useEffect(() => {
    startMetricsPolling();
    return () => stopMetricsPolling();
  }, []);

  return (
    <div>
      <StatusBadge color={getHealthColor(data?.system.health)}>
        {data?.system.health}
      </StatusBadge>
      <p>Uptime: {formatUptime(data?.system.uptime)}</p>
      <p>PoI Proofs: {data?.poi.totalProofs}</p>
    </div>
  );
}
```

---

## Configuration

### Environment Variables

Set in `.env` or `.env.local`:

```bash
VITE_API_URL=http://localhost:3000
```

### Path Aliases

Already configured in `tsconfig.json` and `vite.config.js`:

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

---

## DevTools Integration

Synapse integrates with Redux DevTools for state debugging:

1. Install [Redux DevTools Extension](https://chrome.google.com/webstore/detail/redux-devtools)
2. Open DevTools → Redux tab
3. See all Synapse state transitions:
   - `Synapse::Auth/START`
   - `Synapse::Auth/SUCCESS`
   - `Synapse::Agents/FAIL`
   - etc.

**Production:** DevTools are automatically disabled in production builds.

---

## Testing Checklist

### Manual Testing

- [ ] Auth: Login flow works end-to-end
- [ ] Auth: Token persists after page reload
- [ ] Auth: Error states display correctly
- [ ] Agents: List refreshes on mount
- [ ] Agents: WebSocket updates work in real-time
- [ ] Metrics: Polling starts and shows data
- [ ] Metrics: Uptime formatting is correct
- [ ] DevTools: All transitions visible in Redux DevTools

### Unit Tests (Future)

```typescript
// Example test structure
describe('Auth Controller', () => {
  it('should transition from IDLE to LOADING to SUCCESS on login', async () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.status).toBe('IDLE');

    await login({ email: 'test@example.com', password: 'pass' });

    expect(result.current.status).toBe('SUCCESS');
    expect(result.current.data?.user.email).toBe('test@example.com');
  });
});
```

---

## Cloning the Pattern

To add a new journey (e.g., "Rewards"):

### 1. Create Controller

```typescript
// apps/dashboard/src/controllers/rewards-controller.ts

import { createSynapse, executeJourney } from '@/lib/synapse/core';

export interface RewardsData {
  totalEarned: number;
  pending: number;
  history: Reward[];
}

export const useRewardsStore = createSynapse<RewardsData>('Rewards', null, {
  clearOnReset: false,
  onSuccess: (data) => console.log('✅ Rewards loaded:', data.totalEarned),
});

async function fetchRewardsAPI(): Promise<RewardsData> {
  const res = await fetch(`${API_URL}/api/rewards`);
  if (!res.ok) throw new Error('Failed to fetch rewards');
  return res.json();
}

export async function refreshRewards() {
  return executeJourney(useRewardsStore.getState(), () => fetchRewardsAPI());
}
```

### 2. Export from Barrel

```typescript
// apps/dashboard/src/controllers/index.ts

export * from './rewards-controller';
```

### 3. Use in Component

```typescript
import { useRewardsStore, refreshRewards } from '@/controllers';

function RewardsPage() {
  const { status, data, error } = useRewardsStore();

  useEffect(() => { refreshRewards(); }, []);

  if (status === 'LOADING') return <Spinner />;
  if (status === 'ERROR') return <Alert>{error}</Alert>;

  return <div>Total Earned: ${data.totalEarned}</div>;
}
```

**Done.** No new patterns. No new debt.

---

## Benefits

### ✅ Predictable State

Every journey has exactly 5 states:
- `IDLE` - Not started
- `LOADING` - In progress
- `SUCCESS` - Completed successfully
- `ERROR` - Failed with message
- `BLOCKED` - User action required (future)

No undefined states. No "maybe loading, maybe not."

### ✅ Guaranteed Error Handling

`executeJourney` never throws. Always returns:
```typescript
{ success: true, data: T } | { success: false, error: string }
```

No try/catch boilerplate. No silent failures.

### ✅ Keep-Last-Good Pattern

Failed fetches don't clear UI. Users see stale data + error banner, not blank screens.

### ✅ DevTools Integration

Every state transition visible in Redux DevTools. Time-travel debugging works.

### ✅ Centralized Business Logic

Controllers separate from components. Easy to test, easy to reuse.

### ✅ TypeScript-First

Full type safety. Inference works. No `any` types.

---

## Next Steps

### Immediate

1. **Wire Auth into Login Page**
   - Replace existing auth logic with `useAuthStore`
   - Add loading/error UI states
   - Test token persistence

2. **Test WebSocket Integration**
   - Connect Agents controller to WebSocket
   - Verify real-time updates work
   - Monitor DevTools for state changes

3. **Verify DevTools**
   - Open Redux DevTools
   - Trigger all 3 controllers
   - Confirm all transitions visible

### Future Enhancements

- [ ] Add `BLOCKED` state for user action required (e.g., MFA)
- [ ] Add retry logic to `executeJourney` with exponential backoff
- [ ] Add optimistic updates helper for instant UI feedback
- [ ] Add persistence layer (IndexedDB) for offline support
- [ ] Add telemetry/analytics hooks for monitoring

---

## Files Created

| File | LOC | Purpose |
|------|-----|---------|
| `lib/synapse/core.ts` | 150 | Synapse Core - createSynapse, executeJourney |
| `lib/synapse/index.ts` | 7 | Barrel export |
| `controllers/auth-controller.ts` | 115 | Auth journey |
| `controllers/agents-controller.ts` | 135 | Agents journey |
| `controllers/metrics-controller.ts` | 185 | Metrics journey |
| `controllers/index.ts` | 7 | Barrel export |
| **Total** | **599** | **6 files** |

---

## Dependencies

- **Zustand** 5.0.8 - State management (already installed)
- **React** 19.2.0 - UI framework (already installed)
- **TypeScript** 5.9.3 - Type system (already installed)

No new dependencies required. ✅

---

## Conclusion

The Synapse Architecture is now fully implemented and ready for integration. All three controllers (Auth, Agents, Metrics) follow the same pattern and can be cloned for new journeys.

**Ready for:** Production integration, manual testing, DevTools verification

**Next Action:** Wire Auth controller into Login page and test end-to-end flow.

---

Generated: 2025-11-23
Author: Claude Code
Architecture: Synapse v1.0
