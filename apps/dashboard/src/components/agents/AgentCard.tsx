import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Power, Cpu, Clock } from 'lucide-react';
import { Agent } from '../../types/agents';
import { cn } from '../../lib/utils';

interface AgentCardProps {
    agent: Agent;
    onToggleStatus?: (id: string) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onToggleStatus }) => {
    const isActive = agent.status === 'working';
    const isIdle = agent.status === 'idle';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className={cn(
                "relative overflow-hidden rounded-xl border p-6 transition-all duration-300",
                "bg-background/40 backdrop-blur-md",
                isActive
                    ? "border-primary/50 shadow-[0_0_30px_-10px_rgba(var(--primary-rgb),0.3)]"
                    : "border-border/50 hover:border-primary/30"
            )}
        >
            {/* Background Glow */}
            {isActive && (
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
            )}

            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border",
                        isActive ? "border-primary bg-primary/10 text-primary" : "border-muted bg-muted/10 text-muted-foreground"
                    )}>
                        <Cpu className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                            {agent.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{agent.role}</p>
                    </div>
                </div>

                <div className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border",
                    isActive ? "border-green-500/30 bg-green-500/10 text-green-500" :
                        isIdle ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500" :
                            "border-red-500/30 bg-red-500/10 text-red-500"
                )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse",
                        isActive ? "bg-green-500" : isIdle ? "bg-yellow-500" : "bg-red-500"
                    )} />
                    {agent.status.toUpperCase()}
                </div>
            </div>

            <div className="mt-6 space-y-4">
                {/* Performance Metric */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Performance Efficiency</span>
                        <span className="font-mono font-medium text-primary">{(agent.performance * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${agent.performance * 100}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={cn(
                                "h-full rounded-full bg-gradient-to-r from-primary/80 to-primary",
                                isActive && "animate-pulse"
                            )}
                        />
                    </div>
                </div>

                {/* Current Task */}
                <div className="rounded-lg bg-secondary/30 p-3 border border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Activity className="h-3 w-3" />
                        <span>Current Operation</span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                        {agent.currentTask || "Awaiting instructions..."}
                    </p>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Uptime: 4h 12m</span>
                </div>

                <button
                    onClick={() => onToggleStatus?.(agent.id)}
                    aria-label={isActive ? `Deactivate ${agent.name}` : `Activate ${agent.name}`}
                    className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        "hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/50",
                        isActive ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"
                    )}
                >
                    <Power className="h-3 w-3" />
                    {isActive ? "Deactivate" : "Activate"}
                </button>
            </div>
        </motion.div>
    );
};
