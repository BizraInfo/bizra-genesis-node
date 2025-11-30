import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, Zap, Brain } from 'lucide-react';
import { useAgentsSynapse } from '../../lib/journeys/agents';

export const AgentMetrics: React.FC = () => {
    const { data: agents } = useAgentsSynapse();

    const activeAgents = (agents || []).filter(a => a.status === 'working').length || 0;
    const totalAgents = (agents || []).length || 0;
    const avgPerformance = (agents || []).reduce((acc, curr) => acc + curr.performance, 0) / (totalAgents || 1);

    const stats = [
        {
            label: "Active Agents",
            value: `${activeAgents}/${totalAgents}`,
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            label: "System Efficiency",
            value: `${(avgPerformance * 100).toFixed(1)}%`,
            icon: Zap,
            color: "text-yellow-500",
            bg: "bg-yellow-500/10",
            border: "border-yellow-500/20"
        },
        {
            label: "Neural Load",
            value: "42%",
            icon: Brain,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20"
        },
        {
            label: "Task Throughput",
            value: "1,204/hr",
            icon: Activity,
            color: "text-green-500",
            bg: "bg-green-500/10",
            border: "border-green-500/20"
        }
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative overflow-hidden rounded-xl border p-4 ${stat.bg} ${stat.border}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                            <h4 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{stat.value}</h4>
                        </div>
                        <div className={`rounded-full p-2 ${stat.bg} ${stat.color}`}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
