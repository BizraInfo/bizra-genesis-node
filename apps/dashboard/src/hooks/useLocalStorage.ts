// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - useLocalStorage Hook                           ║
// ║  Type-safe localStorage with SSR support and automatic serialization  ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react'

/**
 * Custom hook for managing localStorage with React state synchronization
 *
 * @template T - The type of the stored value
 * @param key - The localStorage key
 * @param initialValue - The initial value if key doesn't exist
 * @returns [storedValue, setValue, removeValue] - State value, setter, and remover
 *
 * @example
 * const [user, setUser, removeUser] = useLocalStorage('user', { name: 'Guest' })
 * setUser({ name: 'John' })
 * removeUser()
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>, () => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value

        // Save state
        setStoredValue(valueToStore)

        // Save to local storage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))

          // Dispatch custom event to sync across tabs/windows
          window.dispatchEvent(
            new CustomEvent('local-storage', {
              detail: { key, value: valueToStore }
            })
          )
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)

        // Dispatch custom event to sync removal across tabs
        window.dispatchEvent(
          new CustomEvent('local-storage', {
            detail: { key, value: null }
          })
        )
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent

      if (customEvent.detail?.key === key) {
        setStoredValue(customEvent.detail.value ?? initialValue)
      }
    }

    // Listen for standard storage event (from other tabs)
    const handleNativeStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.warn(`Error parsing storage event value for "${key}":`, error)
        }
      }
    }

    window.addEventListener('local-storage', handleStorageChange)
    window.addEventListener('storage', handleNativeStorageChange)

    return () => {
      window.removeEventListener('local-storage', handleStorageChange)
      window.removeEventListener('storage', handleNativeStorageChange)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}

export default useLocalStorage
