// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ BIZRA SAT-LAB v0.1 - OUTBOX PAGE                                         ║
// ║ Internal marketing team content approval dashboard                        ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { useEffect, useState } from 'react';
import { SatOutboxItem as SatOutboxItemType, SatRecommendation } from '../../../types/sat';
import { SacredDashboard } from '../../sacred/SacredDashboard';
import {
  fetchSatOutbox,
  approveOutboxItem,
  rejectOutboxItem,
  markPublished,
  fetchSatRecommendations,
  SAT_ERRORS
} from '../../../lib/api/sat';

export const SatOutboxPage: React.FC = () => {
  const [outbox, setOutbox] = useState<SatOutboxItemType[]>([]);
  const [recommendations, setRecommendations] = useState<SatRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load SAT content on mount
  useEffect(() => {
    loadSatData();
  }, []);

  const loadSatData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [outboxData, recsData] = await Promise.all([
        fetchSatOutbox(),
        fetchSatRecommendations()
      ]);

      setOutbox(outboxData);
      setRecommendations(recsData);
    } catch (err) {
      setError(SAT_ERRORS.OUTBOX_LOAD_ERROR);
      console.error('SAT data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveOutboxItem(id);
      setOutbox(items =>
        items.map(item =>
          item.id === id ? { ...item, status: 'approved' } : item
        )
      );
    } catch (err) {
      alert(SAT_ERRORS.APPROVAL_ERROR);
      console.error('Approval error:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectOutboxItem(id);
      setOutbox(items =>
        items.map(item =>
          item.id === id ? { ...item, status: 'rejected' } : item
        )
      );
    } catch (err) {
      alert(SAT_ERRORS.APPROVAL_ERROR);
      console.error('Rejection error:', err);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await markPublished(id);
      setOutbox(items =>
        items.map(item =>
          item.id === id ? { ...item, status: 'published' } : item
        )
      );
    } catch (err) {
      alert(SAT_ERRORS.PUBLISH_ERROR);
      console.error('Publish error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-gold-400 animate-pulse">
          Connecting with SAT-LAB consciousness field...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-rose-400 text-center">
          <div className="text-xl mb-4">SAT Connection Lost</div>
          <div className="text-sm">{error}</div>
          <button
            onClick={loadSatData}
            className="mt-4 px-4 py-2 bg-gold-600 hover:bg-gold-500 rounded-lg transition-colors"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <SacredDashboard mode="technical">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif font-bold text-gold-400">
            SAT-LAB v0.1: BIZRA Internal Enterprise
          </h1>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto">
            Your sacred marketing consciousness team. SAT serves BIZRA LAB first as its #1 customer.
            Content below created by AI agents, approved by divine intelligence.
          </p>
          <div className="text-sm text-gold-300 opacity-75">
            Status: {outbox.length} items in outbox • {recommendations.length} strategic recommendations
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Content Outbox */}
          <div className="xl:col-span-8 space-y-4">
            <h2 className="text-xl font-serif text-gold-300 border-b border-gold-900/40 pb-2">
              Content Outbox - Human Approval Required
            </h2>

            {outbox.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-lg mb-2">SAT Outbox Empty</div>
                <div className="text-sm">No content awaiting approval.</div>
              </div>
            ) : (
              <div className="space-y-4">
                {outbox.map((item) => (
                  <SatOutboxItemComponent
                    key={item.id}
                    item={item}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onPublish={handlePublish}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recommendations Panel */}
          <div className="xl:col-span-4 space-y-4">
            <h3 className="text-lg font-serif text-gold-300 border-b border-gold-900/40 pb-2">
              SAT Strategic Insights
            </h3>

            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-sm">No strategic insights available.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <SatRecommendationCard key={rec.id} recommendation={rec} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SacredDashboard>
  );
};

// Individual content item component
interface SatOutboxItemProps {
  item: SatOutboxItemType;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPublish: (id: string) => void;
}

const SatOutboxItemComponent: React.FC<SatOutboxItemProps> = ({
  item,
  onApprove,
  onReject,
  onPublish
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-amber-400 border-amber-500/20';
      case 'approved': return 'text-emerald-400 border-emerald-500/20';
      case 'published': return 'text-blue-400 border-blue-500/20';
      case 'rejected': return 'text-rose-400 border-rose-500/20';
      default: return 'text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className={`border rounded-lg p-4 space-y-3 bg-slate-950/50 ${getStatusColor(item.status)}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-gold-400 font-semibold tracking-wide">
            {item.agent_type} → {item.channel_type}
          </div>
          <h3 className="text-lg font-serif text-slate-50 mt-1">
            {item.content_title || '(No title)'}
          </h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium bg-slate-800 ${getStatusColor(item.status).split(' ')[0]}`}>
          {item.status.toUpperCase()}
        </div>
      </div>

      {/* Content Preview */}
      <div className="bg-slate-900/70 rounded p-3 max-h-48 overflow-y-auto">
        <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono">
          {item.content_body}
        </pre>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        {item.status === 'draft' && (
          <>
            <button
              onClick={() => onApprove(item.id)}
              className="px-3 py-2 text-sm rounded-lg border border-emerald-500 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onReject(item.id)}
              className="px-3 py-2 text-sm rounded-lg border border-rose-500 text-rose-300 hover:bg-rose-500/10 transition-colors"
            >
              Reject
            </button>
          </>
        )}

        {item.status === 'approved' && (
          <button
            onClick={() => onPublish(item.id)}
            className="px-3 py-2 text-sm rounded-lg border border-blue-500 text-blue-300 hover:bg-blue-500/10 transition-colors"
          >
            Mark Published
          </button>
        )}

        {(item.status === 'published' || item.status === 'rejected') && (
          <div className="px-3 py-2 text-sm text-slate-400">
            {item.status === 'published' ? 'Published' : 'Rejected'}
          </div>
        )}
      </div>
    </div>
  );
};

// Recommendation card component
interface SatRecommendationCardProps {
  recommendation: SatRecommendation;
}

const SatRecommendationCard: React.FC<SatRecommendationCardProps> = ({ recommendation }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-400 border-rose-500/20';
      case 'medium': return 'text-amber-400 border-amber-500/20';
      case 'low': return 'text-green-400 border-green-500/20';
      default: return 'text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className={`border rounded-lg p-3 space-y-2 bg-slate-950/50 ${getPriorityColor(recommendation.priority)}`}>
      <div className="flex justify-between items-start">
        <div className="text-xs uppercase font-semibold">
          {recommendation.category || 'general'}
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium bg-slate-800 ${getPriorityColor(recommendation.priority).split(' ')[0].replace('text-', 'text-').replace('-400', '-300')}`}>
          {recommendation.priority}
        </div>
      </div>

      <p className="text-sm text-slate-100 leading-relaxed">
        {recommendation.recommendation}
      </p>

      {recommendation.rationale && (
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          {recommendation.rationale}
        </p>
      )}
    </div>
  );
};
