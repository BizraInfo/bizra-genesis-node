import { createSynapseStore, executeJourney } from '../synapse/core';
import { PoiSummaryResponse } from '../../types/poi';

export const usePoiSynapse = createSynapseStore<PoiSummaryResponse | null>(null);

export const poiJourney = {
    fetchSummary: async () => {
        return executeJourney(
            new Promise<PoiSummaryResponse>((resolve) => setTimeout(() => resolve({
                totalAttestations: 1234,
                verifiedAttestations: 1200,
                avgScore: 0.92,
                byDomain: [],
                recentActivity: []
            }), 1000)),
            usePoiSynapse.getState()
        );
    }
};
