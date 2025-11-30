// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - useMediaQuery Hook                             ║
// ║  Responsive design hooks for breakpoint-based rendering               ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import { useState, useEffect } from 'react'

/**
 * Custom hook to track media query matches
 *
 * @param query - The media query string to match
 * @returns Boolean indicating if the query matches
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)')
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
 * const isLandscape = useMediaQuery('(orientation: landscape)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(query)

    // Update state
    setMatches(mediaQuery.matches)

    // Define listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler)
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler)
      } else {
        mediaQuery.removeListener(handler)
      }
    }
  }, [query])

  return matches
}

/**
 * Predefined breakpoint hooks for common responsive design needs
 */
export const useIsMobile = (): boolean => useMediaQuery('(max-width: 768px)')
export const useIsTablet = (): boolean => useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 1025px)')
export const useIsSmallScreen = (): boolean => useMediaQuery('(max-width: 640px)')
export const useIsLargeScreen = (): boolean => useMediaQuery('(min-width: 1440px)')

/**
 * Hook to detect dark mode preference
 */
export const usePrefersDarkMode = (): boolean => useMediaQuery('(prefers-color-scheme: dark)')

/**
 * Hook to detect reduced motion preference (accessibility)
 */
export const usePrefersReducedMotion = (): boolean => useMediaQuery('(prefers-reduced-motion: reduce)')

/**
 * Hook to detect high contrast mode preference (accessibility)
 */
export const usePrefersHighContrast = (): boolean => useMediaQuery('(prefers-contrast: high)')

/**
 * Hook to detect device orientation
 */
export const useIsLandscape = (): boolean => useMediaQuery('(orientation: landscape)')
export const useIsPortrait = (): boolean => useMediaQuery('(orientation: portrait)')

/**
 * Hook to get current breakpoint
 *
 * @returns 'mobile' | 'tablet' | 'desktop'
 *
 * @example
 * const breakpoint = useBreakpoint()
 * if (breakpoint === 'mobile') {
 *   return <MobileLayout />
 * }
 */
export function useBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  if (isMobile) {return 'mobile'}
  if (isTablet) {return 'tablet'}
  return 'desktop'
}

export default useMediaQuery
