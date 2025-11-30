/**
 * BIZRA Genesis Node - Agents API Route
 * PAT (Personal Agent Team) & SAT (System Agent Team) Management
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

// Mock agents data matching the Seed Architecture
const mockAgents = {
  personal: [
    { id: 'pat-1', name: 'Strategic Planner', status: 'active', performance: 94, role: 'visionary', seedPotential: 0.94 },
    { id: 'pat-2', name: 'Research Assistant', status: 'active', performance: 97, role: 'synthesizer', seedPotential: 0.97 },
    { id: 'pat-3', name: 'Creative Designer', status: 'active', performance: 89, role: 'catalyst', seedPotential: 0.89 },
    { id: 'pat-4', name: 'Data Analyst', status: 'active', performance: 92, role: 'executor', seedPotential: 0.92 },
    { id: 'pat-5', name: 'Security Guardian', status: 'active', performance: 98, role: 'executor', seedPotential: 0.98 },
    { id: 'pat-6', name: 'Learning Optimizer', status: 'active', performance: 91, role: 'catalyst', seedPotential: 0.91 },
    { id: 'pat-7', name: 'Task Coordinator', status: 'active', performance: 95, role: 'synthesizer', seedPotential: 0.95 }
  ],
  system: [
    { id: 'sat-1', name: 'Infrastructure Manager', status: 'active', performance: 96, role: 'executor', seedPotential: 0.96 },
    { id: 'sat-2', name: 'Performance Monitor', status: 'active', performance: 98, role: 'synthesizer', seedPotential: 0.98 },
    { id: 'sat-3', name: 'Security Auditor', status: 'active', performance: 94, role: 'executor', seedPotential: 0.94 },
    { id: 'sat-4', name: 'Backup Coordinator', status: 'active', performance: 97, role: 'executor', seedPotential: 0.97 },
    { id: 'sat-5', name: 'Update Manager', status: 'active', performance: 93, role: 'catalyst', seedPotential: 0.93 },
    { id: 'sat-6', name: 'Resource Allocator', status: 'active', performance: 95, role: 'visionary', seedPotential: 0.95 }
  ],
  total: 72,
  active: 72,
  networkSynergy: 0.847,
  collectivePotential: 'Infinite'
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/agents`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      res.status(200).json(data);
    } else {
      res.status(200).json({ success: true, data: mockAgents, fallback: true });
    }
  } catch {
    res.status(200).json({ success: true, data: mockAgents, fallback: true });
  }
}
