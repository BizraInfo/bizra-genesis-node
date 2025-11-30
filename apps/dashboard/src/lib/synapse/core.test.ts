import { createSynapseStore, executeJourney, SynapseStatus } from './core';
import { ApiError } from '../../types/api';

describe('Synapse Core', () => {
    it('should initialize with IDLE status', () => {
        const useStore = createSynapseStore<string>(null);
        const state = useStore.getState();
        expect(state.status).toBe(SynapseStatus.IDLE);
        expect(state.data).toBeNull();
        expect(state.error).toBeNull();
    });

    it('should transition to LOADING', () => {
        const useStore = createSynapseStore<string>(null);
        useStore.getState().setLoading();
        const state = useStore.getState();
        expect(state.status).toBe(SynapseStatus.LOADING);
    });

    it('should transition to SUCCESS', () => {
        const useStore = createSynapseStore<string>(null);
        useStore.getState().setSuccess('test data', 'success message');
        const state = useStore.getState();
        expect(state.status).toBe(SynapseStatus.SUCCESS);
        expect(state.data).toBe('test data');
        expect(state.message).toBe('success message');
    });

    it('should transition to ERROR', () => {
        const useStore = createSynapseStore<string>(null);
        const error: ApiError = { code: 'TEST', message: 'test error' };
        useStore.getState().setError(error);
        const state = useStore.getState();
        expect(state.status).toBe(SynapseStatus.ERROR);
        expect(state.error).toEqual(error);
    });

    it('executeJourney should handle success', async () => {
        const useStore = createSynapseStore<string>(null);
        const promise = Promise.resolve('success');
        await executeJourney(promise, useStore.getState());
        const state = useStore.getState();
        expect(state.status).toBe(SynapseStatus.SUCCESS);
        expect(state.data).toBe('success');
    });

    it('executeJourney should handle failure', async () => {
        const useStore = createSynapseStore<string>(null);
        const promise = Promise.reject(new Error('fail'));
        await executeJourney(promise, useStore.getState());
        const state = useStore.getState();
        expect(state.status).toBe(SynapseStatus.ERROR);
        expect(state.error?.message).toBe('fail');
    });
});
