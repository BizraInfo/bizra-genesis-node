// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - Rewards Dashboard                                  ║
// ║  Admin interface for epoch distribution and settlement                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, Shield, Activity, AlertCircle } from 'lucide-react';
import { rewardsApi, type EpochSummary, type EpochDistributionSummary } from '../../services/rewards';

// ════════════════════════════════════════════════════════════════════════════
// STYLED COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const MetricCard: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-slate-800/80 border border-amber-500/20 rounded-lg p-4 md:p-6"
  >
    <div className="flex items-center gap-3 mb-2">
      {icon && <div className="text-amber-500">{icon}</div>}
      <div className="text-slate-400 text-sm font-mono uppercase tracking-wider">
        {label}
      </div>
    </div>
    <div className="text-2xl md:text-3xl font-serif text-amber-100">
      {value}
    </div>
  </motion.div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    active: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    closed: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    distributed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.active}`}>
      {status.toUpperCase()}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export const RewardsDashboard: React.FC = () => {
  const [epochs, setEpochs] = useState<EpochSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [lastDistribution, setLastDistribution] = useState<EpochDistributionSummary | null>(null);

  useEffect(() => {
    loadEpochs();
  }, []);

  async function loadEpochs() {
    try {
      setLoading(true);
      setError(null);
      const data = await rewardsApi.listEpochs();
      setEpochs(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load reward epochs');
    } finally {
      setLoading(false);
    }
  }

  async function handleDistributeEpoch(epochId: string) {
    if (!confirm('Confirm epoch distribution? This action is atomic and irreversible.')) {
      return;
    }

    try {
      setActionInProgress(epochId);
      setError(null);
      const result = await rewardsApi.distributeEpoch(epochId);
      setLastDistribution(result);
      await loadEpochs();
    } catch (e: any) {
      setError(e.message ?? 'Failed to distribute epoch');
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleSubmitSettlement(epochId: string) {
    if (!confirm('Submit settlement batch to ledger?')) {
      return;
    }

    try {
      setActionInProgress(epochId);
      setError(null);
      await rewardsApi.submitSettlement(epochId);
      await loadEpochs();
    } catch (e: any) {
      setError(e.message ?? 'Failed to submit settlement');
    } finally {
      setActionInProgress(null);
    }
  }

  const stats = React.useMemo(() => {
    const active = epochs.filter(e => e.status === 'active').length;
    const distributed = epochs.filter(e => e.status === 'distributed').length;
    const totalPool = epochs.reduce((sum, e) => sum + parseFloat(e.totalPool || '0'), 0);
    return { active, distributed, totalPool, totalEpochs: epochs.length };
  }, [epochs]);

  if (loading && epochs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-amber-500 font-mono text-sm">Loading Reward Epochs...</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-8"
    >
      <div className="border-b border-amber-500/20 pb-6">
        <h1 className="text-4xl font-serif text-amber-100 tracking-tight">
          Reward <span className="text-amber-500">Distribution</span>
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Genesis Economic Engine v0.1 — Epoch Management
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-red-300 font-medium">Operation Failed</div>
            <div className="text-red-200/80 text-sm mt-1">{error}</div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Epochs" value={stats.totalEpochs} icon={<Activity className="w-5 h-5" />} />
        <MetricCard label="Active Epochs" value={stats.active} icon={<Coins className="w-5 h-5" />} />
        <MetricCard label="Distributed" value={stats.distributed} icon={<Shield className="w-5 h-5" />} />
        <MetricCard label="Total Pool" value={stats.totalPool.toFixed(2)} icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      {lastDistribution && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6"
        >
          <h3 className="text-lg font-serif text-emerald-300 mb-4">✓ Last Distribution Complete</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="text-slate-400">Contributors</div><div className="text-emerald-200 font-medium">{lastDistribution.contributors}</div></div>
            <div><div className="text-slate-400">Total Score</div><div className="text-emerald-200 font-medium">{parseFloat(lastDistribution.totalScore).toFixed(3)}</div></div>
            <div><div className="text-slate-400">Distributed</div><div className="text-emerald-200 font-medium">{parseFloat(lastDistribution.totalDistributed).toFixed(2)}</div></div>
            <div><div className="text-slate-400">Pool</div><div className="text-emerald-200 font-medium">{parseFloat(lastDistribution.totalPool).toFixed(2)}</div></div>
          </div>
        </motion.div>
      )}

      <div className="bg-slate-800/50 border border-amber-500/20 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-amber-500/20">
          <h2 className="text-xl font-serif text-amber-100">Reward Epochs</h2>
        </div>

        {epochs.length === 0 ? (
          <div className="p-12 text-center">
            <Coins className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No reward epochs found</p>
            <p className="text-slate-500 text-sm mt-2">Create an epoch to begin reward distribution</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 text-sm font-mono uppercase">Period</th>
                  <th className="text-left py-3 px-4 text-slate-300 text-sm font-mono uppercase">Pool</th>
                  <th className="text-left py-3 px-4 text-slate-300 text-sm font-mono uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-slate-300 text-sm font-mono uppercase">Settlement</th>
                  <th className="text-left py-3 px-4 text-slate-300 text-sm font-mono uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {epochs.map((epoch) => (
                  <tr key={epoch.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="text-slate-200 text-sm">
                        {new Date(epoch.startTimestamp).toLocaleDateString()} →{' '}
                        {new Date(epoch.endTimestamp).toLocaleDateString()}
                      </div>
                      <div className="text-slate-500 text-xs font-mono mt-1">{epoch.id.slice(0, 8)}...</div>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">{parseFloat(epoch.totalPool).toFixed(2)}</td>
                    <td className="py-3 px-4"><StatusBadge status={epoch.status} /></td>
                    <td className="py-3 px-4 text-sm">
                      {epoch.settlementBatchId ? (
                        <span className="text-emerald-400 font-mono">{epoch.settlementBatchId.slice(0, 12)}...</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {epoch.status === 'active' && (
                        <button
                          onClick={() => handleDistributeEpoch(epoch.id)}
                          disabled={actionInProgress === epoch.id}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                        >
                          {actionInProgress === epoch.id ? 'Processing...' : 'Distribute'}
                        </button>
                      )}
                      {epoch.status === 'distributed' && !epoch.settlementBatchId && (
                        <button
                          onClick={() => handleSubmitSettlement(epoch.id)}
                          disabled={actionInProgress === epoch.id}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                        >
                          {actionInProgress === epoch.id ? 'Submitting...' : 'Submit Settlement'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RewardsDashboard;
