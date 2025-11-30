/**
 * BIZRA Genesis Node - Metrics API Route
 * Consciousness & System Metrics for the Seed Network
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

// Mock metrics matching the Ihsan Quality Framework
const mockMetrics = {
  consciousness: {
    level: 85,
    quantumCoherence: 97.8,
    resonanceHz: 432,
    omegaState: 0.847
  },
  impact: {
    score: 8947,
    seedTokens: 2847.32,
    bloomTokens: 456.78,
    networkContribution: 12847
  },
  agents: {
    total: 72,
    active: 72,
    patCount: 7,
    satCount: 6
  },
  system: {
    uptime: 99.97,
    tps: 127439,
    settlementSpeed: 0.05,
    peers: 23
  },
  seed: {
    intrinsicPotential: 'Infinite',
    networkAmplification: 3.47,
    catalyticFactor: 0.92,
    emergenceIndex: 0.847
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/metrics`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      res.status(200).json(data);
    } else {
      res.status(200).json({ success: true, data: mockMetrics, fallback: true });
    }
  } catch {
    res.status(200).json({ success: true, data: mockMetrics, fallback: true });
  }
}
