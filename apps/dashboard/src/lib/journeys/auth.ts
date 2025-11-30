import { createSynapseStore, executeJourney } from '../synapse/core';
import { authService, TokenManager } from '../../services/auth';
import { LoginCredentials, User, AuthTokens } from '../../types/auth';

export interface AuthJourneyData {
    user: User | null;
    tokens: AuthTokens | null;
    isAuthenticated: boolean;
}

export const useAuthSynapse = createSynapseStore<AuthJourneyData>({
    user: null,
    tokens: null,
    isAuthenticated: false,
});

export const authJourney = {
    login: async (credentials: LoginCredentials) => {
        return executeJourney(
            (async () => {
                const { user, tokens } = await authService.login(credentials);
                return { user, tokens, isAuthenticated: true };
            })(),
            useAuthSynapse.getState(),
            `Welcome back!`
        );
    },

    logout: async () => {
        return executeJourney(
            (async () => {
                await authService.logout();
                return { user: null, tokens: null, isAuthenticated: false };
            })(),
            useAuthSynapse.getState(),
            'Logged out successfully'
        );
    },

    checkSession: async () => {
        return executeJourney(
            (async () => {
                if (authService.isAuthenticated()) {
                    const user = await authService.getCurrentUser();
                    const tokens = TokenManager.getInstance().getTokens();
                    return { user, tokens, isAuthenticated: true };
                }
                return { user: null, tokens: null, isAuthenticated: false };
            })(),
            useAuthSynapse.getState()
        );
    },

    updateProfile: async (updates: Partial<User>) => {
        const currentState = useAuthSynapse.getState().data;
        if (!currentState?.isAuthenticated) {
            throw new Error("Not authenticated");
        }

        return executeJourney(
            (async () => {
                const updatedUser = await authService.updateProfile(updates);
                return { ...currentState, user: updatedUser };
            })(),
            useAuthSynapse.getState(),
            'Profile updated successfully'
        );
    }
};
