// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - Proof of Impact (PoI) Dashboard                    ║
// ║  Comprehensive dashboard for impact attestation management              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Shield, Activity } from 'lucide-react';
import { poiApi } from '../../services/poi';
import type {
  PoiSummaryResponse,
  PoiRecord,
  PoiStatus,
} from '../../types/poi';

// Styled components with Genesis Node theme (navy/gold)
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

const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse">
      {children}
    </table>
  </div>
);

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="text-left py-3 px-4 border-b border-amber-500/20 text-slate-300 text-sm font-mono uppercase tracking-wider">
    {children}
  </th>
);

const Td: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({
  children,
  className = '',
  title
}) => (
  <td className={`py-3 px-4 border-b border-slate-700/50 text-slate-200 ${className}`} title={title}>
    {children}
  </td>
);

const StatusBadge: React.FC<{ status: PoiStatus }> = ({ status }) => {
  const styles = {
    verified: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
    revoked: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status.toUpperCase()}
    </span>
  );
};

export const PoIDashboard: React.FC = () => {
  const [summary, setSummary] = useState<PoiSummaryResponse | null>(null);
  const [attestations, setAttestations] = useState<PoiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<PoiStatus | 'all'>('all');

  // Load data on component mount
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Load both summary and attestations in parallel
        const [summaryData, attestationData] = await Promise.all([
          poiApi.getPoiSummary() as Promise<PoiSummaryResponse>,
          poiApi.getPoiAttestations({ limit: 50 }) as Promise<PoiRecord[]>,
        ]);

        if (cancelled) { return; }

        setSummary(summaryData);
        setAttestations(attestationData);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load PoI data');
        }
      } finally {
        if (!cancelled) { setLoading(false); }
      }
    }

    void loadData();
    return () => { cancelled = true; };
  }, []);

  // Compute filtered attestations
  const filteredAttestations = useMemo(() => {
    return attestations.filter((attestation) => {
      if (domainFilter && attestation.impactDomain !== domainFilter) { return false; }
      if (statusFilter !== 'all' && attestation.status !== statusFilter) { return false; }
      return true;
    });
  }, [attestations, domainFilter, statusFilter]);

  // Extract unique domains for filter dropdown
  const distinctDomains = useMemo(() => {
    return Array.from(new Set(attestations.map((a) => a.impactDomain)));
  }, [attestations]);

  // Calculate verification success rate
  const verificationRate = useMemo(() => {
    if (!summary) { return '—'; }
    if (summary.totalAttestations === 0) { return '—'; }
    const rate = (summary.verifiedAttestations / summary.totalAttestations) * 100;
    return `${rate.toFixed(1)}%`;
  }, [summary]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-amber-500 font-mono text-sm">Loading Genesis PoI Data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-serif text-slate-200">PoI Dashboard Error</h2>
          <p className="text-slate-400 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Activity className="w-16 h-16 text-slate-500 mx-auto" />
          <h2 className="text-xl font-serif text-slate-200">No PoI Data Available</h2>
          <p className="text-slate-400">Genesis Node hasn&apos;t received any impact attestations yet.</p>
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
      {/* Header */}
      <div className="border-b border-amber-500/20 pb-6">
        <h1 className="text-4xl font-serif text-amber-100 tracking-tight">
          Proof of <span className="text-amber-500">Impact</span>
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Genesis Node Impact Attestation Dashboard
        </p>
      </div>

      {/* Top Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Attestations"
          value={summary.totalAttestations.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
        />
        <MetricCard
          label="Verified Attestations"
          value={summary.verifiedAttestations.toLocaleString()}
          icon={<Shield className="w-5 h-5" />}
        />
        <MetricCard
          label="Average Score"
          value={summary.avgScore.toFixed(3)}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          label="Verification Rate"
          value={verificationRate}
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Domain Impact Table */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <h2 className="text-2xl font-serif text-amber-100 mb-4">Impact by Domain</h2>
          {summary.byDomain.length === 0 ? (
            <div className="bg-slate-800/50 rounded-lg p-8 text-center">
              <Shield className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No verified attestations yet</p>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Domain</Th>
                  <Th>Count</Th>
                  <Th>Avg Score</Th>
                </tr>
              </thead>
              <tbody>
                {summary.byDomain.map((domain) => (
                  <tr key={domain.impactDomain}>
                    <Td className="font-medium">
                      {domain.impactDomain}
                    </Td>
                    <Td>{domain.count}</Td>
                    <Td>{domain.avgScore.toFixed(3)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </motion.div>

        {/* Recent Attestations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
            <h2 className="text-2xl font-serif text-amber-100">Recent Attestations</h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Domain:</span>
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="bg-slate-700 border border-amber-500/30 rounded-lg px-3 py-1 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="">All</option>
                  {distinctDomains.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PoiStatus | 'all')}
                  className="bg-slate-700 border border-amber-500/30 rounded-lg px-3 py-1 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="revoked">Revoked</option>
                </select>
              </label>
            </div>
          </div>

          {filteredAttestations.length === 0 ? (
            <div className="bg-slate-800/50 rounded-lg p-8 text-center">
              <Activity className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No attestations match current filters</p>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Created</Th>
                  <Th>Contributor</Th>
                  <Th>Domain</Th>
                  <Th>Score</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {filteredAttestations.map((attestation) => (
                  <tr key={attestation.id} className="hover:bg-slate-800/30 transition-colors">
                    <Td className="font-mono text-sm">
                      {new Date(attestation.createdAt).toLocaleString()}
                    </Td>
                    <Td className="font-mono text-sm max-w-[200px] truncate" title={attestation.contributorId}>
                      {attestation.contributorId}
                    </Td>
                    <Td>{attestation.impactDomain}</Td>
                    <Td className="font-medium">
                      {attestation.normalizedScore.toFixed(3)}
                    </Td>
                    <Td>
                      <StatusBadge status={attestation.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PoIDashboard;
