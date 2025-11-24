// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - Custom Hooks Index                             ║
// ║  Centralized export for all custom React hooks                        ║
// ╚═══════════════════════════════════════════════════════════════════════╝

export { useLocalStorage } from './useLocalStorage'
export { useDebounce, useDebouncedCallback } from './useDebounce'
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsSmallScreen,
  useIsLargeScreen,
  usePrefersDarkMode,
  usePrefersReducedMotion,
  usePrefersHighContrast,
  useIsLandscape,
  useIsPortrait,
  useBreakpoint
} from './useMediaQuery'
export {
  useAgentStream,
  useConsensusStream,
  useMetricStream,
  useNotificationStream
} from './useWebSocketStreams'
export type {
  AgentStatusEvent,
  ConsensusUpdateEvent,
  MetricUpdateEvent,
  NotificationEvent
} from './useWebSocketStreams'
