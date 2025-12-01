// Environment configuration with Jest compatibility
// This file provides environment variables that work in both Vite and Jest environments

// Detect if running in test environment
const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

// Get environment variable with fallback
const getEnvVar = (key: string, fallback: string): string => {
  // In Jest/test environment, use process.env
  if (typeof process !== 'undefined' && process.env) {
    const nodeValue = process.env[key];
    if (nodeValue) {return nodeValue;}
  }
  return fallback;
};

// For Vite environment, we need to handle import.meta.env without dynamic eval
const viteEnv: Record<string, string> =
  !isTestEnv && typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env
    ? (import.meta as unknown as { env?: Record<string, string> }).env!
    : {};

// Combined getter that checks both sources
const getConfig = (key: string, fallback: string): string => {
  // First check process.env (Node.js/Jest)
  const nodeValue = getEnvVar(key, '');
  if (nodeValue) {return nodeValue;}

  // Then check Vite env
  const viteValue = viteEnv[key];
  if (viteValue) {return viteValue;}

  return fallback;
};

export const API_BASE = getConfig('VITE_API_BASE_URL', 'http://localhost:3000');
export const WS_URL = getConfig('VITE_WS_URL', 'ws://localhost:3000');
export const IS_DEV = process.env.NODE_ENV !== 'production';
export const IS_TEST = process.env.NODE_ENV === 'test';
