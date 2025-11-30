import { createSynapseStore, executeJourney, SynapseStatus } from '../synapse/core';
import { Agent } from '../../types/agents';
import { SynapseSocket, SocketStatus } from '../synapse/socket';

// Mock Data Generator
const generateMockAgents = (): Agent[] => [
    { id: '1', name: 'SAPE Engine', role: 'Reasoning Core', status: 'working', performance: 0.98, currentTask: 'Optimizing neural pathways' },
    { id: '2', name: 'Vector Store', role: 'Memory Systems', status: 'idle', performance: 1.0, currentTask: 'Indexing knowledge kernels' },
    { id: '3', name: 'Nexus Bridge', role: 'API Gateway', status: 'working', performance: 0.92, currentTask: 'Routing secure traffic' },
    { id: '4', name: 'Sentinel', role: 'Security Monitor', status: 'working', performance: 0.99, currentTask: 'Scanning for anomalies' },
    { id: '5', name: 'Chronos', role: 'Scheduler', status: 'idle', performance: 1.0, currentTask: 'Awaiting next cycle' },
    { id: '6', name: 'Prism', role: 'UI Renderer', status: 'working', performance: 0.88, currentTask: 'Composing dashboard frames' },
];

export const useAgentsSynapse = createSynapseStore<Agent[]>(null);

export const agentsJourney = {
    fetchAgents: async () => {
        // Initial fetch can still be an API call or just waiting for the first WS message
        // For now, we'll keep the mock initial load to ensure data exists immediately
        await executeJourney(
            new Promise<Agent[]>((resolve) => setTimeout(() => resolve(generateMockAgents()), 1000)),
            useAgentsSynapse.getState()
        );

        // Connect to the socket
        agentsJourney.connect();
    },

    connect: () => {
        const socket = SynapseSocket.getInstance();
        socket.connect();

        // Subscribe to updates
        socket.subscribe('agents:update', (updatedAgents: Agent[]) => {
            const currentState = useAgentsSynapse.getState();
            currentState.setSuccess(updatedAgents);
        });

        // Handle connection status to fallback to simulation
        socket.onStatusChange((status) => {
            if (status === SocketStatus.CONNECTED) {
                console.log('AgentsJourney: Switched to Real-time Mode');
            } else if (status === SocketStatus.DISCONNECTED || status === SocketStatus.ERROR) {
                console.log('AgentsJourney: Switched to Simulation Mode');
            }
        });
    },

    toggleAgentStatus: async (id: string) => {
        const currentState = useAgentsSynapse.getState();
        const agents = currentState.data;
        if (!agents) {return;}

        // Optimistic update
        const updatedAgents = agents.map(agent =>
            agent.id === id
                ? { ...agent, status: agent.status === 'working' ? 'idle' : 'working' } as Agent
                : agent
        );

        currentState.setSuccess(updatedAgents);

        // Send to backend via Socket
        const socket = SynapseSocket.getInstance();
        if (socket.getStatus() === SocketStatus.CONNECTED) {
            socket.send('agents:toggle', { id });
        } else {
            // Fallback simulation latency
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    },

    // Simulation: Randomly fluctuate performance metrics 
    // Only runs if socket is NOT connected
    simulateMetrics: () => {
        const socket = SynapseSocket.getInstance();
        if (socket.getStatus() === SocketStatus.CONNECTED) {return;}

        const currentState = useAgentsSynapse.getState();
        if (currentState.status !== SynapseStatus.SUCCESS || !currentState.data) {return;}

        const updatedAgents = currentState.data.map(agent => ({
            ...agent,
            performance: Math.max(0.7, Math.min(1.0, agent.performance + (Math.random() * 0.1 - 0.05)))
        }));

        currentState.setSuccess(updatedAgents);
    }
};
