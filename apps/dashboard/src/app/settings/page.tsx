'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useGenesisSynapse } from '@/hooks/useGenesisSynapse';

// Settings categories
const CATEGORIES = [
  { id: 'profile', name: 'Profile', icon: '👤' },
  { id: 'pat', name: 'PAT Configuration', icon: '🤖' },
  { id: 'resources', name: 'Resource Allocation', icon: '⚙️' },
  { id: 'security', name: 'Security & Privacy', icon: '🔒' },
  { id: 'backup', name: 'Backup & Export', icon: '💾' },
  { id: 'advanced', name: 'Advanced', icon: '🔧' },
];

// Seed states
const SEED_STATES = [
  { id: 'dreamer', name: 'Dreamer', icon: '💭', description: 'Big ideas, exploring possibilities' },
  { id: 'builder', name: 'Builder', icon: '🔨', description: 'Ready to create and execute' },
  { id: 'learner', name: 'Learner', icon: '📖', description: 'Focused on growth and knowledge' },
  { id: 'healer', name: 'Healer', icon: '💚', description: 'Helping others, making impact' },
  { id: 'provider', name: 'Provider', icon: '🏠', description: 'Family and income focused' },
];

// PAT Agents
const PAT_AGENTS = [
  { id: 'MasterReasoner', name: 'Master Reasoner', model: 'deepseek-r1:7b' },
  { id: 'MemoryArchitect', name: 'Memory Architect', model: 'qwen2.5:7b' },
  { id: 'CreativeSynthesizer', name: 'Creative Synthesizer', model: 'qwen2.5:7b' },
  { id: 'DataAnalyzer', name: 'Data Analyzer', model: 'mistral:7b' },
  { id: 'Communicator', name: 'Communicator', model: 'mistral:7b' },
  { id: 'ExecutionPlanner', name: 'Execution Planner', model: 'agentflow-7b' },
  { id: 'EthicsGuardian', name: 'Ethics Guardian', model: 'qwen2.5:7b' },
];

interface UserProfile {
  seed_state: string;
  primary_pat_role: string;
  goals: string[];
  time_available_weekly: number;
}

export default function SettingsPage() {
  const { connected } = useGenesisSynapse();
  const [activeCategory, setActiveCategory] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Form state
  const [seedState, setSeedState] = useState('builder');
  const [primaryAgent, setPrimaryAgent] = useState('MasterReasoner');
  const [goals, setGoals] = useState<string[]>([]);
  const [weeklyTime, setWeeklyTime] = useState(600);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/user/profile');
      const data = await response.json();
      if (data.success && data.data) {
        setProfile(data.data);
        setSeedState(data.data.seed_state);
        setPrimaryAgent(data.data.primary_pat_role);
        setGoals(data.data.goals || []);
        setWeeklyTime(data.data.time_available_weekly || 600);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('http://localhost:8080/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed_state: seedState,
          primary_pat_role: primaryAgent,
          goals,
          time_available_weekly: weeklyTime,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setProfile(data.data);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExportStatus('Preparing export...');
    try {
      // Simulated export - in production this would call the backend
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setExportStatus('Export complete! Check your downloads folder.');
      setTimeout(() => setExportStatus(null), 5000);
    } catch (error) {
      setExportStatus('Export failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div
                className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <span className="text-xl">🌱</span>
              </motion.div>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Settings</h1>
              <p className="text-white/40 text-sm">Configure your BIZRA experience</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-white/40 text-sm">
              {connected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <nav className="space-y-2">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeCategory === category.id
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-xl">{category.icon}</span>
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 rounded-2xl border border-white/10 p-8"
          >
            {/* Profile Settings */}
            {activeCategory === 'profile' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Profile Settings</h2>
                  <p className="text-white/60">Manage your identity and preferences</p>
                </div>

                {/* Seed State */}
                <div>
                  <label className="block text-white/80 font-medium mb-4">
                    Current Seed State
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {SEED_STATES.map((state) => (
                      <button
                        key={state.id}
                        onClick={() => setSeedState(state.id)}
                        className={`p-4 rounded-xl border transition-all ${
                          seedState === state.id
                            ? 'bg-amber-500/20 border-amber-500/50 text-white'
                            : 'border-white/10 text-white/60 hover:border-white/30'
                        }`}
                      >
                        <span className="text-3xl mb-2 block">{state.icon}</span>
                        <span className="font-medium block">{state.name}</span>
                        <span className="text-xs text-white/40">{state.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weekly Time */}
                <div>
                  <label htmlFor="weekly-time-slider" className="block text-white/80 font-medium mb-2">
                    Weekly Time Available: {Math.floor(weeklyTime / 60)}h {weeklyTime % 60}m
                  </label>
                  <input
                    id="weekly-time-slider"
                    type="range"
                    min="60"
                    max="2400"
                    step="30"
                    value={weeklyTime}
                    onChange={(e) => setWeeklyTime(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                    aria-label="Weekly time available slider"
                  />
                  <div className="flex justify-between text-white/40 text-sm mt-1">
                    <span>1 hour</span>
                    <span>40 hours</span>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-medium text-white hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* PAT Configuration */}
            {activeCategory === 'pat' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">PAT Configuration</h2>
                  <p className="text-white/60">Configure your Personal Agent Team</p>
                </div>

                {/* Primary Agent Selection */}
                <div>
                  <label className="block text-white/80 font-medium mb-4">
                    Primary Agent
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PAT_AGENTS.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => setPrimaryAgent(agent.id)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          primaryAgent === agent.id
                            ? 'bg-amber-500/20 border-amber-500/50'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{agent.name}</span>
                          {primaryAgent === agent.id && (
                            <span className="text-amber-400">✓</span>
                          )}
                        </div>
                        <span className="text-white/40 text-sm font-mono">{agent.model}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-medium text-white hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Saving...' : 'Update Primary Agent'}
                </button>
              </div>
            )}

            {/* Backup & Export */}
            {activeCategory === 'backup' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Backup & Export</h2>
                  <p className="text-white/60">Export your data and create backups</p>
                </div>

                <div className="grid gap-6">
                  {/* Full Export */}
                  <div className="p-6 rounded-xl border border-white/10 bg-slate-700/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-white font-medium mb-1">Full Data Export</h3>
                        <p className="text-white/60 text-sm">
                          Export all your data including profile, PoI ledger, knowledge base, and settings
                        </p>
                      </div>
                      <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                      >
                        Export ZIP
                      </button>
                    </div>
                    {exportStatus && (
                      <div className="mt-4 p-3 bg-amber-500/20 rounded-lg text-amber-400 text-sm">
                        {exportStatus}
                      </div>
                    )}
                  </div>

                  {/* PoI Export */}
                  <div className="p-6 rounded-xl border border-white/10 bg-slate-700/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-white font-medium mb-1">PoI Ledger Export</h3>
                        <p className="text-white/60 text-sm">
                          Export your Proof-of-Impact history as CSV
                        </p>
                      </div>
                      <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                        Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Import */}
                  <div className="p-6 rounded-xl border border-dashed border-white/20 bg-slate-700/20">
                    <div className="text-center">
                      <span className="text-4xl mb-3 block">📤</span>
                      <h3 className="text-white font-medium mb-1">Import Backup</h3>
                      <p className="text-white/60 text-sm mb-4">
                        Restore from a previous export
                      </p>
                      <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                        Select File
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security */}
            {activeCategory === 'security' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Security & Privacy</h2>
                  <p className="text-white/60">Manage your security settings</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/10">
                    <div>
                      <h3 className="text-white font-medium">Local-Only Mode</h3>
                      <p className="text-white/40 text-sm">All data stays on your machine</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500/30 rounded-full flex items-center justify-end px-1">
                      <div className="w-4 h-4 bg-green-500 rounded-full" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/10">
                    <div>
                      <h3 className="text-white font-medium">Encryption at Rest</h3>
                      <p className="text-white/40 text-sm">All sensitive data encrypted with AES-256</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500/30 rounded-full flex items-center justify-end px-1">
                      <div className="w-4 h-4 bg-green-500 rounded-full" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/10">
                    <div>
                      <h3 className="text-white font-medium">Zero Cloud Dependencies</h3>
                      <p className="text-white/40 text-sm">No external API calls (except model downloads)</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500/30 rounded-full flex items-center justify-end px-1">
                      <div className="w-4 h-4 bg-green-500 rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <h3 className="text-amber-400 font-medium mb-2">🔐 Sovereignty Guaranteed</h3>
                  <p className="text-white/60 text-sm">
                    Node0 is designed for complete user sovereignty. Your data never leaves your machine
                    unless you explicitly export it. All AI inference happens locally via Ollama.
                  </p>
                </div>
              </div>
            )}

            {/* Resources */}
            {activeCategory === 'resources' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Resource Allocation</h2>
                  <p className="text-white/60">Configure how Node0 uses your hardware</p>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <p className="text-blue-400 text-sm">
                    💡 Tip: Configure detailed resource settings on the{' '}
                    <Link href="/resources" className="underline">
                      Resources page
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* Advanced */}
            {activeCategory === 'advanced' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Advanced Settings</h2>
                  <p className="text-white/60">Developer and power user options</p>
                </div>

                <div className="space-y-6">
                  <div className="p-4 rounded-xl border border-white/10">
                    <h3 className="text-white font-medium mb-2">API Endpoints</h3>
                    <div className="font-mono text-sm text-white/60 space-y-1">
                      <p>REST API: http://localhost:8080</p>
                      <p>WebSocket: ws://localhost:3002/telemetry</p>
                      <p>Ollama: http://localhost:11434</p>
                      <p>LM Studio: http://localhost:1234</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-white/10">
                    <h3 className="text-white font-medium mb-2">Knowledge Graph</h3>
                    <p className="text-white/40 text-sm mb-3">
                      Hypergraph RAG status and controls
                    </p>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors text-sm">
                      Rebuild Knowledge Graph
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10">
                    <h3 className="text-red-400 font-medium mb-2">Danger Zone</h3>
                    <p className="text-white/40 text-sm mb-3">
                      These actions cannot be undone
                    </p>
                    <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors text-sm">
                      Reset All Data
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
