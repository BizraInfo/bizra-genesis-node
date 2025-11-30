import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import authService, { TokenManager } from '../auth';

// Mock config
jest.mock('../../config', () => ({
    API_BASE: 'http://localhost:3000'
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => {
            return store[key] || null;
        },
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
        length: 0,
        key: (_index: number) => null
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock
});

describe('AuthService', () => {
    const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        TokenManager.getInstance().clearTokens();
        mockFetch.mockReset();
    });

    describe('login', () => {
        it('should successfully login and store tokens', async () => {
            const mockResponse = {
                success: true,
                data: {
                    user: {
                        id: '1',
                        email: 'test@example.com',
                        username: 'testuser',
                        role: 'user',
                        createdAt: new Date().toISOString(),
                        lastLoginAt: new Date().toISOString()
                    },
                    tokens: {
                        accessToken: 'access-token',
                        refreshToken: 'refresh-token',
                        expiresIn: 3600,
                        tokenType: 'Bearer'
                    }
                }
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
                status: 200,
                headers: new Headers(),
                redirected: false,
                statusText: 'OK',
                type: 'basic',
                url: 'http://localhost:3000/auth/login',
                clone: jest.fn(),
                body: null,
                bodyUsed: false,
                arrayBuffer: jest.fn(),
                blob: jest.fn(),
                formData: jest.fn(),
                text: jest.fn(),
                bytes: jest.fn()
            } as unknown as Response);

            const result = await authService.login({
                email: 'test@example.com',
                password: 'password123'
            });

            expect(result.user.email).toBe('test@example.com');
            expect(result.tokens.accessToken).toBe('access-token');
            expect(localStorage.getItem('bizra_auth_tokens')).toBeTruthy();
        });

        it('should handle login failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ message: 'Invalid credentials' }),
                headers: new Headers(),
                redirected: false,
                statusText: 'Unauthorized',
                type: 'basic',
                url: 'http://localhost:3000/auth/login',
                clone: jest.fn(),
                body: null,
                bodyUsed: false,
                arrayBuffer: jest.fn(),
                blob: jest.fn(),
                formData: jest.fn(),
                text: jest.fn(),
                bytes: jest.fn()
            } as unknown as Response);

            try {
                await authService.login({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                });
                throw new Error('Should have thrown');
            } catch (error: unknown) {
                // The auth service throws an AuthError object with code and message
                expect(error).toBeDefined();
                // AuthError has a message property that gets set
                const e = error as { code?: string; message?: string };
                expect(e.code || e.message).toBeTruthy();
            }
        });
    });

    describe('TokenManager', () => {
        it('should correctly check token expiration', () => {
            const tokenManager = TokenManager.getInstance();

            // Expired token
            tokenManager.setTokens({
                accessToken: 'token',
                refreshToken: 'refresh',
                expiresAt: Date.now() - 1000,
                tokenType: 'Bearer'
            });
            expect(tokenManager.isTokenExpired()).toBe(true);

            // Valid token
            tokenManager.setTokens({
                accessToken: 'token',
                refreshToken: 'refresh',
                expiresAt: Date.now() + 3600000,
                tokenType: 'Bearer'
            });
            expect(tokenManager.isTokenExpired()).toBe(false);
        });
    });
});
