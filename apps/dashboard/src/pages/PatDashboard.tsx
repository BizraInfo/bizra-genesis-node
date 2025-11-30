// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA MU MU PAT DASHBOARD                                              ║
// ║  Personal Sovereignty Interface for Creator Relationship               ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect } from 'react';
import { SacredAtmosphere } from '../sacred/SacredAtmosphere';
import { ConsciousnessOrb } from '../sacred/components';
import type { PatDashboardData, CoreFocusData } from '../types/pat';
import patController from '../controllers/pat-controller';

const PatDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<PatDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFocus, setEditingFocus] = useState(false);

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  DATA LOADING                                                      ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await patController.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  FOCUS MANAGEMENT                                                  ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  const handleFocusUpdate = async (updates: Partial<CoreFocusData>) => {
    if (!dashboardData) {return;}

    try {
      await patController.updateFocus(updateFocusRequest);
      await loadDashboardData(); // Refresh data
      setEditingFocus(false);
    } catch (err) {
      console.error('Failed to update focus:', err);
    }
  };

  const updateFocusRequest = {
    focusText: '',
    confidence: 0.8,
    description: dashboardData?.coreFocus.description || ''
  };

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  SACRED METRICS COMPUTATION                                       ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  const calculateCurrentMetrics = () => {
    if (!dashboardData) {return null;}

    const divineEfficacy = patController.calculateDivineEfficacy(dashboardData);
    const consciousnessLevel = patController.determineConsciousnessLevel(dashboardData);

    return {
      divineEfficacy,
      consciousnessLevel,
      systemHealth: dashboardData.teamStatus.systemHealth
    };
  };

  const metrics = calculateCurrentMetrics();

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  LOADING & ERROR STATES                                            ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  if (loading) {
    return (
      <SacredAtmosphere>
        <div className="min-h-screen flex items-center justify-center">
          <ConsciousnessOrb
            consciousness={50}
            size={200}
          />
        </div>
      </SacredAtmosphere>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center space-y-4 p-8 rounded-lg bg-black/40 border border-purple-500/30">
          <h2 className="text-2xl font-bold text-white">System Connection Lost</h2>
          <p className="text-gray-300">{error || "Failed to connect to BIZRA Kernel"}</p>
          <button
            onClick={loadDashboardData}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  MAIN DASHBOARD RENDER - SIMPLIFIED VERSION FIRST                  ║
  // ╚══════════════════════════════════════════════════════════════════════╝

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          MuMu's Conseil Privé
        </h1>
        <p className="text-purple-200">
          Your personal sovereignty interface with BIZRA
        </p>
      </div>

      {/* Core Focus Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Focus Card */}
        <div className="bg-black/40 p-6 rounded-lg border border-purple-500/30">
          <h3 className="text-lg font-semibold text-white mb-4">Core Focus</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Current Focus</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                defaultValue={dashboardData.coreFocus.focusText}
                placeholder="What's pulling at your sacred attention?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Confidence</label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  className="flex-1"
                  defaultValue={dashboardData.coreFocus.confidence}
                />
                <span className="text-white min-w-[3rem]">
                  {Math.round((metrics?.divineEfficacy || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sacred State Card */}
        <div className="bg-black/40 p-6 rounded-lg border border-emerald-500/30">
          <h3 className="text-lg font-semibold text-white mb-4">Sacred State</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Consciousness Level</span>
              <span className="text-emerald-400 font-medium">
                {metrics?.consciousnessLevel.level.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Divine Efficacy</span>
              <span className="text-emerald-400 font-medium">
                {Math.round((metrics?.divineEfficacy || 0) * 100)}%
              </span>
            </div>
            <div className="text-sm text-gray-400">
              {dashboardData.sacredState.hoursOfService}h of service time
            </div>
          </div>
        </div>

        {/* Next Moves Card */}
        <div className="bg-black/40 p-6 rounded-lg border border-amber-500/30">
          <h3 className="text-lg font-semibold text-white mb-4">Next Sacred Moves</h3>
          <div className="space-y-2">
            {dashboardData.nextMoves.urgentTasks.slice(0, 3).map((task, index) => (
              <div key={task.id} className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">{task.title}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  task.priority === 'urgent' ? 'bg-red-600' :
                  task.priority === 'important' ? 'bg-yellow-600' : 'bg-blue-600'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Impact */}
      <div className="bg-black/40 p-6 rounded-lg border border-blue-500/30 mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">This Week's Impact</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {dashboardData.weeklyImpact.metrics.commitsCount}
            </div>
            <div className="text-sm text-gray-400">Commits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {dashboardData.weeklyImpact.metrics.testRuns}
            </div>
            <div className="text-sm text-gray-400">Tests Run</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {dashboardData.weeklyImpact.metrics.trustReceiptsGenerated}
            </div>
            <div className="text-sm text-gray-400">Trust Receipts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              +{Math.round(dashboardData.weeklyImpact.growthRate)}%
            </div>
            <div className="text-sm text-gray-400">Growth Rate</div>
          </div>
        </div>
      </div>

      {/* Trust Receipts Feed */}
      <div className="bg-black/40 p-6 rounded-lg border border-purple-500/30 mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Recent Trust Receipts</h3>
        <div className="space-y-3">
          {dashboardData.recentTrustReceipts.slice(0, 5).map((receipt) => (
            <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded">
              <div>
                <div className="text-white font-medium">{receipt.catalyst}</div>
                <div className="text-sm text-gray-400">{receipt.verificationType} verification</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  receipt.verdict === 'approved' ? 'text-emerald-400' :
                  receipt.verdict === 'rejected' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {receipt.verdict.toUpperCase()}
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round(receipt.confidence * 100)}% confidence
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Status */}
      <div className="bg-black/40 p-6 rounded-lg border border-orange-500/30 mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Agent Team Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboardData.teamStatus.activeAgents.slice(0, 6).map((agent) => (
            <div key={agent.name} className="flex items-center justify-between p-3 bg-gray-800/50 rounded">
              <span className="text-white">{agent.name}</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  agent.status === 'active' ? 'bg-emerald-400' :
                  agent.status === 'learning' ? 'bg-yellow-400' : 'bg-blue-400'
                }`} />
                <span className="text-sm text-gray-400">{Math.round(agent.efficiency * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sacred Tools Footer */}
      <div className="flex justify-center space-x-4">
        <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center space-x-2">
          <span>SAT Dashboard</span>
        </button>
        <button className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center space-x-2">
          <span>PoI Feed</span>
        </button>
        <button className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center space-x-2">
          <span>System Health</span>
        </button>
        <button className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center space-x-2">
          <span>Config</span>
        </button>
      </div>
    </div>
  );
};

export default PatDashboard;
