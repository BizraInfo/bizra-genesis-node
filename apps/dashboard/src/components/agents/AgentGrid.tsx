import React, { useEffect } from 'react';
import { AgentCard } from './AgentCard';
import { useAgentsSynapse, agentsJourney } from '../../lib/journeys/agents';
import { SynapseStatus } from '../../lib/synapse/core';
import { SynapseSocket, SocketStatus } from '../../lib/synapse/socket';
import { Loader2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

export const AgentGrid: React.FC = () => {
    const { data: agents, status, error } = useAgentsSynapse();
    const [socketStatus, setSocketStatus] = React.useState<SocketStatus>(SocketStatus.DISCONNECTED);

    useEffect(() => {
        if (status === SynapseStatus.IDLE) {
            void agentsJourney.fetchAgents();
        }

        // Track socket status for UI indicator
        const socket = SynapseSocket.getInstance();
        setSocketStatus(socket.getStatus());

        const unsubscribe = socket.onStatusChange((newStatus) => {
            setSocketStatus(newStatus);
        });

        return () => unsubscribe();
    }, [status]);

    const handleToggleStatus = (id: string) => {
        void agentsJourney.toggleAgentStatus(id);
    };

    if (status === SynapseStatus.LOADING) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center" role="status" aria-label="Loading agents">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="sr-only">Loading agents...</span>
            </div>
        );
    }

    if (status === SynapseStatus.ERROR) {
        return (
            <div className="flex h-[400px] w-full flex-col items-center justify-center gap-4 text-destructive">
                <AlertTriangle className="h-12 w-12" />
                <p className="text-lg font-medium">Failed to load agents</p>
                <p className="text-sm text-muted-foreground">{error?.message}</p>
                <button
                    onClick={() => void agentsJourney.fetchAgents()}
                    className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end">
                <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${socketStatus === SocketStatus.CONNECTED
                    ? 'border-green-500/30 bg-green-500/10 text-green-500'
                    : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500'
                    }`}>
                    {socketStatus === SocketStatus.CONNECTED ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    <span>{socketStatus === SocketStatus.CONNECTED ? 'LIVE UPLINK' : 'SIMULATION MODE'}</span>
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {agents?.map((agent) => (
                    <AgentCard
                        key={agent.id}
                        agent={agent}
                        onToggleStatus={handleToggleStatus}
                    />
                ))}
            </div>
        </div>
    );
};
