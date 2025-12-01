/**
 * BIZRA Genesis Node - Security Layer
 * 
 * Elite Practitioner Implementation featuring:
 * - Zero-trust authentication
 * - Device fingerprinting
 * - Session management
 * - CSRF protection
 * - Input sanitization
 * - Rate limiting (client-side)
 * - Encryption utilities
 * - Security headers configuration
 * 
 * @module BIZRASecurity
 * @version 2.0.0
 */

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface DeviceFingerprint {
  id: string;
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  cookiesEnabled: boolean;
  localStorage: boolean;
  canvas: string;
  webGL: string;
  fonts: string[];
  plugins: string[];
  timestamp: number;
}

export interface SecurityToken {
  token: string;
  type: 'access' | 'refresh' | 'csrf';
  expiresAt: number;
  fingerprint?: string;
}

export interface Session {
  id: string;
  userId: string;
  deviceFingerprint: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
  isValid: boolean;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
}

export interface SecurityConfig {
  csrfEnabled: boolean;
  fingerprintingEnabled: boolean;
  sessionDurationMs: number;
  rateLimitConfig: RateLimitConfig;
  trustedOrigins: string[];
}

export interface CSPDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'frame-ancestors': string[];
  'form-action': string[];
  'base-uri': string[];
  'object-src': string[];
}

// =============================================================================
// DEVICE FINGERPRINTING
// =============================================================================

class DeviceFingerprintCollector {
  async collect(): Promise<DeviceFingerprint> {
    const fingerprint: DeviceFingerprint = {
      id: '',
      userAgent: this.getUserAgent(),
      language: this.getLanguage(),
      platform: this.getPlatform(),
      screenResolution: this.getScreenResolution(),
      timezone: this.getTimezone(),
      cookiesEnabled: this.getCookiesEnabled(),
      localStorage: this.getLocalStorageEnabled(),
      canvas: await this.getCanvasFingerprint(),
      webGL: this.getWebGLFingerprint(),
      fonts: await this.getAvailableFonts(),
      plugins: this.getPlugins(),
      timestamp: Date.now(),
    };

    fingerprint.id = await this.generateFingerprintId(fingerprint);
    return fingerprint;
  }

  private getUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent : '';
  }

  private getLanguage(): string {
    return typeof navigator !== 'undefined' ? navigator.language : '';
  }

  private getPlatform(): string {
    return typeof navigator !== 'undefined' ? navigator.platform : '';
  }

  private getScreenResolution(): string {
    if (typeof screen === 'undefined') {return '';}
    return `${screen.width}x${screen.height}x${screen.colorDepth}`;
  }

  private getTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  private getCookiesEnabled(): boolean {
    return typeof navigator !== 'undefined' ? navigator.cookieEnabled : false;
  }

  private getLocalStorageEnabled(): boolean {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  }

  private async getCanvasFingerprint(): Promise<string> {
    if (typeof document === 'undefined') {return '';}

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {return '';}

      // Draw various elements
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('BIZRA Genesis', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Node Fingerprint', 4, 17);

      return canvas.toDataURL();
    } catch {
      return '';
    }
  }

  private getWebGLFingerprint(): string {
    if (typeof document === 'undefined') {return '';}

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {return '';}

      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) {return '';}

      const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

      return `${vendor}~${renderer}`;
    } catch {
      return '';
    }
  }

  private async getAvailableFonts(): Promise<string[]> {
    const testFonts = [
      'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia',
      'Impact', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Webdings',
      'Wingdings', 'Helvetica', 'Monaco', 'Roboto', 'Open Sans'
    ];

    if (typeof document === 'undefined') {return [];}

    const available: string[] = [];
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';

    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.left = '-9999px';
    span.style.fontSize = testSize;
    span.innerText = testString;
    document.body.appendChild(span);

    const baseWidths: Record<string, number> = {};
    baseFonts.forEach((baseFont) => {
      span.style.fontFamily = baseFont;
      baseWidths[baseFont] = span.offsetWidth;
    });

    testFonts.forEach((font) => {
      let detected = false;
      baseFonts.forEach((baseFont) => {
        span.style.fontFamily = `'${font}', ${baseFont}`;
        if (span.offsetWidth !== baseWidths[baseFont]) {
          detected = true;
        }
      });
      if (detected) {available.push(font);}
    });

    document.body.removeChild(span);
    return available;
  }

  private getPlugins(): string[] {
    if (typeof navigator === 'undefined' || !navigator.plugins) {return [];}

    const plugins: string[] = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    return plugins;
  }

  private async generateFingerprintId(fingerprint: Omit<DeviceFingerprint, 'id'>): Promise<string> {
    const data = JSON.stringify(fingerprint);
    
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// =============================================================================
// TOKEN MANAGER
// =============================================================================

class TokenManager {
  private tokens = new Map<string, SecurityToken>();
  private readonly storageKey = 'bizra_tokens';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {return;}

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const tokens = JSON.parse(stored);
        Object.entries(tokens).forEach(([key, token]) => {
          this.tokens.set(key, token as SecurityToken);
        });
      }
    } catch {
      // Storage may be unavailable
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') {return;}

    try {
      const tokens: Record<string, SecurityToken> = {};
      this.tokens.forEach((token, key) => {
        tokens[key] = token;
      });
      localStorage.setItem(this.storageKey, JSON.stringify(tokens));
    } catch {
      // Storage may be unavailable
    }
  }

  setToken(type: SecurityToken['type'], token: string, expiresIn: number, fingerprint?: string): void {
    const securityToken: SecurityToken = {
      token,
      type,
      expiresAt: Date.now() + expiresIn,
      fingerprint,
    };

    this.tokens.set(type, securityToken);
    this.saveToStorage();
  }

  getToken(type: SecurityToken['type']): string | null {
    const token = this.tokens.get(type);
    
    if (!token) {return null;}
    
    // Check expiration
    if (Date.now() >= token.expiresAt) {
      this.removeToken(type);
      return null;
    }

    return token.token;
  }

  removeToken(type: SecurityToken['type']): void {
    this.tokens.delete(type);
    this.saveToStorage();
  }

  clearAll(): void {
    this.tokens.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  isTokenValid(type: SecurityToken['type']): boolean {
    const token = this.tokens.get(type);
    return token !== undefined && Date.now() < token.expiresAt;
  }

  getTokenExpiration(type: SecurityToken['type']): number | null {
    const token = this.tokens.get(type);
    return token?.expiresAt || null;
  }
}

// =============================================================================
// RATE LIMITER
// =============================================================================

class RateLimiter {
  private requests = new Map<string, number[]>();
  private blocked = new Map<string, number>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();

    // Check if blocked
    const blockedUntil = this.blocked.get(key);
    if (blockedUntil && now < blockedUntil) {
      return false;
    } else if (blockedUntil) {
      this.blocked.delete(key);
    }

    // Get request history
    let history = this.requests.get(key) || [];
    
    // Filter to window
    history = history.filter(time => now - time < this.config.windowMs);
    
    // Check limit
    if (history.length >= this.config.maxRequests) {
      this.blocked.set(key, now + this.config.blockDurationMs);
      return false;
    }

    // Record request
    history.push(now);
    this.requests.set(key, history);

    return true;
  }

  getRemainingRequests(key: string): number {
    const history = this.requests.get(key) || [];
    const now = Date.now();
    const recentHistory = history.filter(time => now - time < this.config.windowMs);
    return Math.max(0, this.config.maxRequests - recentHistory.length);
  }

  getBlockedUntil(key: string): number | null {
    return this.blocked.get(key) || null;
  }

  reset(key: string): void {
    this.requests.delete(key);
    this.blocked.delete(key);
  }

  resetAll(): void {
    this.requests.clear();
    this.blocked.clear();
  }
}

// =============================================================================
// INPUT SANITIZER
// =============================================================================

class InputSanitizer {
  sanitizeHTML(input: string): string {
    if (typeof document === 'undefined') {
      // Server-side: basic escape
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Client-side: use DOM
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  sanitizeSQL(input: string): string {
    // Basic SQL injection prevention
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  sanitizeURL(input: string): string {
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  }

  sanitizeFilename(input: string): string {
    return input
      // eslint-disable-next-line no-control-regex -- Intentional control char removal for filename safety
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .replace(/^\.+/, '')
      .slice(0, 255);
  }

  escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  validateEmail(input: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  }

  validatePassword(input: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (input.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(input)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(input)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(input)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(input)) {
      errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  }
}

// =============================================================================
// CSRF PROTECTION
// =============================================================================

class CSRFProtection {
  private tokenKey = 'bizra_csrf_token';

  generateToken(): string {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined') {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  getToken(): string {
    if (typeof sessionStorage === 'undefined') {
      return this.generateToken();
    }

    let token = sessionStorage.getItem(this.tokenKey);
    if (!token) {
      token = this.generateToken();
      sessionStorage.setItem(this.tokenKey, token);
    }
    return token;
  }

  validateToken(token: string): boolean {
    if (typeof sessionStorage === 'undefined') {return false;}
    return token === sessionStorage.getItem(this.tokenKey);
  }

  rotateToken(): string {
    const newToken = this.generateToken();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.tokenKey, newToken);
    }
    return newToken;
  }

  getHeader(): Record<string, string> {
    return {
      'X-CSRF-Token': this.getToken(),
    };
  }
}

// =============================================================================
// ENCRYPTION UTILITIES
// =============================================================================

class EncryptionUtils {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }

  async importKey(keyString: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyString);
    return crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(data: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      this.encoder.encode(data)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return this.arrayBufferToBase64(combined.buffer);
  }

  async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    const combined = this.base64ToArrayBuffer(encryptedData);
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      data
    );

    return this.decoder.decode(decrypted);
  }

  async hash(data: string, algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(algorithm, this.encoder.encode(data));
    return this.arrayBufferToHex(hashBuffer);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}

// =============================================================================
// MAIN SECURITY SERVICE
// =============================================================================

export class BIZRASecurity {
  private config: SecurityConfig;
  private fingerprintCollector: DeviceFingerprintCollector;
  private tokenManager: TokenManager;
  private rateLimiter: RateLimiter;
  private sanitizer: InputSanitizer;
  private csrfProtection: CSRFProtection;
  private encryption: EncryptionUtils;
  private deviceFingerprint: DeviceFingerprint | null = null;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      csrfEnabled: true,
      fingerprintingEnabled: true,
      sessionDurationMs: 24 * 60 * 60 * 1000, // 24 hours
      rateLimitConfig: {
        maxRequests: 100,
        windowMs: 60000, // 1 minute
        blockDurationMs: 300000, // 5 minutes
      },
      trustedOrigins: [],
      ...config,
    };

    this.fingerprintCollector = new DeviceFingerprintCollector();
    this.tokenManager = new TokenManager();
    this.rateLimiter = new RateLimiter(this.config.rateLimitConfig);
    this.sanitizer = new InputSanitizer();
    this.csrfProtection = new CSRFProtection();
    this.encryption = new EncryptionUtils();

    // Collect fingerprint on initialization
    if (this.config.fingerprintingEnabled) {
      this.collectFingerprint();
    }
  }

  // ===========================================================================
  // FINGERPRINTING
  // ===========================================================================

  async collectFingerprint(): Promise<DeviceFingerprint> {
    this.deviceFingerprint = await this.fingerprintCollector.collect();
    return this.deviceFingerprint;
  }

  getFingerprint(): DeviceFingerprint | null {
    return this.deviceFingerprint;
  }

  getFingerprintId(): string | null {
    return this.deviceFingerprint?.id || null;
  }

  // ===========================================================================
  // TOKEN MANAGEMENT
  // ===========================================================================

  setAccessToken(token: string, expiresIn: number): void {
    this.tokenManager.setToken('access', token, expiresIn, this.deviceFingerprint?.id);
  }

  getAccessToken(): string | null {
    return this.tokenManager.getToken('access');
  }

  setRefreshToken(token: string, expiresIn: number): void {
    this.tokenManager.setToken('refresh', token, expiresIn, this.deviceFingerprint?.id);
  }

  getRefreshToken(): string | null {
    return this.tokenManager.getToken('refresh');
  }

  isAuthenticated(): boolean {
    return this.tokenManager.isTokenValid('access');
  }

  clearTokens(): void {
    this.tokenManager.clearAll();
  }

  // ===========================================================================
  // RATE LIMITING
  // ===========================================================================

  checkRateLimit(key: string = 'default'): boolean {
    return this.rateLimiter.isAllowed(key);
  }

  getRateLimitRemaining(key: string = 'default'): number {
    return this.rateLimiter.getRemainingRequests(key);
  }

  resetRateLimit(key: string = 'default'): void {
    this.rateLimiter.reset(key);
  }

  // ===========================================================================
  // INPUT SANITIZATION
  // ===========================================================================

  sanitize(input: string, type: 'html' | 'sql' | 'url' | 'filename' = 'html'): string {
    switch (type) {
      case 'html':
        return this.sanitizer.sanitizeHTML(input);
      case 'sql':
        return this.sanitizer.sanitizeSQL(input);
      case 'url':
        return this.sanitizer.sanitizeURL(input);
      case 'filename':
        return this.sanitizer.sanitizeFilename(input);
      default:
        return this.sanitizer.sanitizeHTML(input);
    }
  }

  validateEmail(email: string): boolean {
    return this.sanitizer.validateEmail(email);
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    return this.sanitizer.validatePassword(password);
  }

  // ===========================================================================
  // CSRF PROTECTION
  // ===========================================================================

  getCSRFToken(): string {
    return this.csrfProtection.getToken();
  }

  validateCSRFToken(token: string): boolean {
    return this.csrfProtection.validateToken(token);
  }

  getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.csrfEnabled) {
      Object.assign(headers, this.csrfProtection.getHeader());
    }

    if (this.deviceFingerprint) {
      headers['X-Device-Fingerprint'] = this.deviceFingerprint.id;
    }

    const accessToken = this.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
  }

  // ===========================================================================
  // ENCRYPTION
  // ===========================================================================

  async encryptData(data: string): Promise<{ encrypted: string; key: string }> {
    const key = await this.encryption.generateKey();
    const encrypted = await this.encryption.encrypt(data, key);
    const keyString = await this.encryption.exportKey(key);
    return { encrypted, key: keyString };
  }

  async decryptData(encrypted: string, keyString: string): Promise<string> {
    const key = await this.encryption.importKey(keyString);
    return this.encryption.decrypt(encrypted, key);
  }

  async hashData(data: string): Promise<string> {
    return this.encryption.hash(data);
  }

  // ===========================================================================
  // CSP CONFIGURATION
  // ===========================================================================

  generateCSP(directives: Partial<CSPDirectives> = {}): string {
    const defaultDirectives: CSPDirectives = {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Loosen for development
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': ["'self'", 'wss:', 'https:'],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'object-src': ["'none'"],
    };

    const mergedDirectives = { ...defaultDirectives, ...directives };

    return Object.entries(mergedDirectives)
      .map(([key, values]) => `${key} ${values.join(' ')}`)
      .join('; ');
  }

  // ===========================================================================
  // ORIGIN VALIDATION
  // ===========================================================================

  isOriginTrusted(origin: string): boolean {
    if (this.config.trustedOrigins.length === 0) {return true;}
    return this.config.trustedOrigins.includes(origin);
  }

  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================

  createSession(userId: string): Session {
    const session: Session = {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId,
      deviceFingerprint: this.deviceFingerprint?.id || '',
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionDurationMs,
      lastActivity: Date.now(),
      isValid: true,
    };

    // Store session info (would typically go to backend)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('bizra_session', JSON.stringify(session));
    }

    return session;
  }

  getCurrentSession(): Session | null {
    if (typeof sessionStorage === 'undefined') {return null;}

    try {
      const stored = sessionStorage.getItem('bizra_session');
      if (!stored) {return null;}

      const session = JSON.parse(stored) as Session;

      // Validate session
      if (Date.now() >= session.expiresAt) {
        this.destroySession();
        return null;
      }

      // Update last activity
      session.lastActivity = Date.now();
      sessionStorage.setItem('bizra_session', JSON.stringify(session));

      return session;
    } catch {
      return null;
    }
  }

  destroySession(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('bizra_session');
    }
    this.clearTokens();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let securityInstance: BIZRASecurity | null = null;

export function getBIZRASecurity(): BIZRASecurity {
  if (!securityInstance) {
    securityInstance = new BIZRASecurity();
  }
  return securityInstance;
}

export function createBIZRASecurity(config?: Partial<SecurityConfig>): BIZRASecurity {
  return new BIZRASecurity(config);
}

// =============================================================================
// REACT HOOKS
// =============================================================================

export function useSecurity(): BIZRASecurity {
  return getBIZRASecurity();
}

export function useAuth(): {
  isAuthenticated: boolean;
  login: (token: string, expiresIn: number) => void;
  logout: () => void;
} {
  const security = getBIZRASecurity();

  return {
    isAuthenticated: security.isAuthenticated(),
    login: (token: string, expiresIn: number) => {
      security.setAccessToken(token, expiresIn);
    },
    logout: () => {
      security.destroySession();
    },
  };
}

export default BIZRASecurity;
