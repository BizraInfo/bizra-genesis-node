import { createSynapseStore, executeJourney } from '../synapse/core';
import { TmpMetrics } from '../../types/tmp';

export const useTmpSynapse = createSynapseStore<TmpMetrics | null>(null);

export const tmpJourney = {
    fetchMetrics: async () => {
        return executeJourney(
            new Promise<TmpMetrics>((resolve) => setTimeout(() => resolve({
                consciousness: 0.85,
                safetyScore: 0.99,
                activeNodes: 42,
                systemHealth: 'optimal'
            }), 1000)),
            useTmpSynapse.getState()
        );
    }
};
