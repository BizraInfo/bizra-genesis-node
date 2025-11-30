import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AgentGrid } from '../AgentGrid';
import { useAgentsSynapse, agentsJourney } from '../../../lib/journeys/agents';
import { SynapseStatus } from '../../../lib/synapse/core';

// Mock the hook and journey
jest.mock('../../../lib/journeys/agents', () => ({
    useAgentsSynapse: jest.fn(),
    agentsJourney: {
        fetchAgents: jest.fn(),
        toggleAgentStatus: jest.fn(),
        simulateMetrics: jest.fn()
    }
}));

// Mock SynapseSocket
jest.mock('../../../lib/synapse/socket', () => ({
    SynapseSocket: {
        getInstance: jest.fn(() => ({
            getStatus: jest.fn(() => 'DISCONNECTED'),
            onStatusChange: jest.fn(() => jest.fn()),
            connect: jest.fn(),
            subscribe: jest.fn()
        }))
    },
    SocketStatus: {
        CONNECTED: 'CONNECTED',
        DISCONNECTED: 'DISCONNECTED',
        CONNECTING: 'CONNECTING',
        ERROR: 'ERROR'
    }
}));

describe('AgentGrid', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('fetches agents on mount if status is IDLE', () => {
        (useAgentsSynapse as unknown as jest.Mock).mockReturnValue({
            status: SynapseStatus.IDLE,
            data: null,
            error: null
        });

        render(<AgentGrid />);
        expect(agentsJourney.fetchAgents).toHaveBeenCalled();
    });

    it('displays loading state', () => {
        (useAgentsSynapse as unknown as jest.Mock).mockReturnValue({
            status: SynapseStatus.LOADING,
            data: null,
            error: null
        });

        render(<AgentGrid />);
        const loader = document.querySelector('.animate-spin');
        expect(loader).toBeInTheDocument();
    });

    it('displays error state', () => {
        (useAgentsSynapse as unknown as jest.Mock).mockReturnValue({
            status: SynapseStatus.ERROR,
            data: null,
            error: { message: 'Failed to fetch' }
        });

        render(<AgentGrid />);
        expect(screen.getByText('Failed to load agents')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });

    it('renders agents when data is available', () => {
        (useAgentsSynapse as unknown as jest.Mock).mockReturnValue({
            status: SynapseStatus.SUCCESS,
            data: [
                { id: '1', name: 'Agent 1', role: 'Role 1', status: 'working', performance: 1 }
            ],
            error: null
        });

        render(<AgentGrid />);
        expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });
});
