export interface Agent {
    id: string;
    name: string;
    role: string;
    status: 'idle' | 'working' | 'offline';
    currentTask?: string;
    performance: number;
}
