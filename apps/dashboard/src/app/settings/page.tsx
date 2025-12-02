'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  User,
  Bot,
  Cpu,
  Shield,
  Download,
  Settings,
  Check,
  Loader2,
  Brain,
  BookOpen,
  Palette,
  BarChart2,
  MessageCircle,
  Target,
  Save,
  Upload,
  AlertTriangle,
  Zap,
  Database,
  Lock,
  Eye,
  RefreshCw,
  Globe
} from 'lucide-react';
import { BizraNavbar, GlassCard, SacredGeometryBackground } from '@/components/brand';
import { useI18n, LANGUAGES, type LanguageCode } from '@/lib/i18n';

// Settings categories with brand icons
const CATEGORIES = [
  { id: 'profile', name: 'Profile', icon: User, description: 'Identity & preferences' },
  { id: 'language', name: 'Language', icon: Globe, description: 'Display language & RTL' },
  { id: 'pat', name: 'PAT Agents', icon: Bot, description: 'Configure your AI team' },
  { id: 'resources', name: 'Resources', icon: Cpu, description: 'Hardware allocation' },
  { id: 'security', name: 'Security', icon: Shield, description: 'Privacy & encryption' },
  { id: 'backup', name: 'Backup', icon: Download, description: 'Export & restore' },
  { id: 'advanced', name: 'Advanced', icon: Settings, description: 'Developer options' },
];

// Seed states with brand styling
const SEED_STATES = [
  { id: 'dreamer', name: 'Dreamer', icon: '💭', description: 'Big ideas, exploring possibilities', color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30' },
  { id: 'builder', name: 'Builder', icon: '🔨', description: 'Ready to create and execute', color: 'from-orange-500/20 to-amber-500/20 border-orange-500/30' },
  { id: 'learner', name: 'Learner', icon: '📖', description: 'Focused on growth and knowledge', color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30' },
  { id: 'healer', name: 'Healer', icon: '💚', description: 'Helping others, making impact', color: 'from-green-500/20 to-emerald-500/20 border-green-500/30' },
  { id: 'provider', name: 'Provider', icon: '🏠', description: 'Family and income focused', color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30' },
];

// PAT Agents with proper styling
const PAT_AGENTS = [
  { id: 'MasterReasoner', name: 'Master Reasoner', model: 'deepseek-r1:7b', icon: Brain, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'MemoryArchitect', name: 'Memory Architect', model: 'qwen2.5:7b', icon: BookOpen, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { id: 'CreativeSynthesizer', name: 'Creative Synthesizer', model: 'qwen2.5:7b', icon: Palette, color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
  { id: 'DataAnalyzer', name: 'Data Analyzer', model: 'mistral:7b', icon: BarChart2, color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  { id: 'Communicator', name: 'Communicator', model: 'mistral:7b', icon: MessageCircle, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { id: 'ExecutionPlanner', name: 'Execution Planner', model: 'agentflow-7b', icon: Target, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  { id: 'EthicsGuardian', name: 'Ethics Guardian', model: 'qwen2.5:7b', icon: Shield, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { locale, setLocale, isRTL, t } = useI18n();
  const [activeCategory, setActiveCategory] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Form state
  const [seedState, setSeedState] = useState('builder');
  const [primaryAgent, setPrimaryAgent] = useState('MasterReasoner');
  const [weeklyTime, setWeeklyTime] = useState(600);
  const [displayName, setDisplayName] = useState('Sovereign Architect');
  const [ihsanScore, setIhsanScore] = useState(75);

  const saveSettings = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async (type: string) => {
    setExportStatus(`Preparing ${type} export...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setExportStatus(`${type} export complete! Check downloads.`);
    setTimeout(() => setExportStatus(null), 3000);
  };

  return (
    <div className="min-h-screen bg-bizra-navy relative overflow-hidden">
      {/* Sacred Geometry Background */}
      <SacredGeometryBackground intensity="subtle" />
      
      {/* Navigation */}
      <BizraNavbar />
      
      <main className="pt-20 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gradient-sovereign mb-2">
              Node Settings
            </h1>
            <p className="text-white/60">
              Configure your sovereign AI experience
            </p>
          </motion.div>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-64 shrink-0"
            >
              <GlassCard className="p-2">
                <nav className="space-y-1">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        activeCategory === category.id
                          ? 'bg-bizra-gold/20 text-bizra-gold border border-bizra-gold/30'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <category.icon className="w-5 h-5" />
                      <div className="text-left">
                        <span className="font-medium block">{category.name}</span>
                        <span className="text-xs opacity-60">{category.description}</span>
                      </div>
                    </button>
                  ))}
                </nav>
              </GlassCard>
            </motion.aside>

            {/* Main Content */}
            <motion.main
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <GlassCard className="p-6 md:p-8">
                    {/* Profile Settings */}
                    {activeCategory === 'profile' && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 rounded-xl bg-bizra-gold/20 flex items-center justify-center">
                            <User className="w-6 h-6 text-bizra-gold" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
                            <p className="text-white/60">Manage your sovereign identity</p>
                          </div>
                        </div>

                        {/* Display Name */}
                        <div>
                          <label className="block text-white/80 font-medium mb-2">Display Name</label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-bizra-gold focus:outline-none focus:ring-1 focus:ring-bizra-gold/50 text-white transition-all"
                            placeholder="Your sovereign name"
                          />
                        </div>

                        {/* Ihsan Score */}
                        <div>
                          <label className="block text-white/80 font-medium mb-2">
                            Ihsan Score: <span className="text-bizra-gold">{ihsanScore}</span>
                          </label>
                          <p className="text-xs text-white/40 mb-3">
                            إحسان - Your ethical excellence rating
                          </p>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={ihsanScore}
                            onChange={(e) => setIhsanScore(parseInt(e.target.value))}
                            className="w-full accent-bizra-gold"
                          />
                          <div className="flex justify-between text-xs text-white/30 mt-1">
                            <span>0</span>
                            <span>50</span>
                            <span>100</span>
                          </div>
                        </div>

                        {/* Seed State */}
                        <div>
                          <label className="block text-white/80 font-medium mb-4">
                            Current Seed State
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {SEED_STATES.map((state) => (
                              <button
                                key={state.id}
                                onClick={() => setSeedState(state.id)}
                                className={`p-4 rounded-xl border transition-all text-left relative ${
                                  seedState === state.id
                                    ? `bg-gradient-to-br ${state.color} border-bizra-gold`
                                    : 'border-white/10 hover:border-white/30 bg-white/5'
                                }`}
                              >
                                <span className="text-2xl mb-2 block">{state.icon}</span>
                                <span className="font-medium text-white block">{state.name}</span>
                                <span className="text-xs text-white/40">{state.description}</span>
                                {seedState === state.id && (
                                  <Check className="w-4 h-4 text-bizra-gold absolute top-2 right-2" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Weekly Time */}
                        <div>
                          <label className="block text-white/80 font-medium mb-2">
                            Weekly Time Available: <span className="text-bizra-gold">{Math.floor(weeklyTime / 60)}h {weeklyTime % 60}m</span>
                          </label>
                          <input
                            type="range"
                            min="60"
                            max="2400"
                            step="30"
                            value={weeklyTime}
                            onChange={(e) => setWeeklyTime(parseInt(e.target.value))}
                            className="w-full accent-bizra-gold"
                          />
                          <div className="flex justify-between text-xs text-white/30 mt-1">
                            <span>1 hour</span>
                            <span>20 hours</span>
                            <span>40 hours</span>
                          </div>
                        </div>

                        {/* Save Button */}
                        <button
                          onClick={saveSettings}
                          disabled={saving}
                          className="btn-sovereign flex items-center justify-center gap-2 w-full md:w-auto"
                        >
                          {saving ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                          ) : saved ? (
                            <><Check className="w-5 h-5" /> Saved!</>
                          ) : (
                            <><Save className="w-5 h-5" /> Save Changes</>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Language Settings */}
                    {activeCategory === 'language' && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 rounded-xl bg-bizra-gold/20 flex items-center justify-center">
                            <Globe className="w-6 h-6 text-bizra-gold" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-white">Language Settings</h2>
                            <p className="text-white/60">Choose your display language</p>
                          </div>
                        </div>

                        {/* Current Language */}
                        <div>
                          <label className="block text-white/80 font-medium mb-2">
                            Current Language
                          </label>
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-bizra-gold/10 border border-bizra-gold/30">
                            <span className="text-3xl">{LANGUAGES[locale].flag}</span>
                            <div>
                              <span className="text-bizra-gold font-medium block">{LANGUAGES[locale].nativeName}</span>
                              <span className="text-white/40 text-sm">{LANGUAGES[locale].name}</span>
                            </div>
                            {isRTL && (
                              <span className="ml-auto px-2 py-1 rounded bg-white/10 text-xs text-white/60">
                                RTL
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Language Selection */}
                        <div>
                          <label className="block text-white/80 font-medium mb-4">
                            Select Language
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {(Object.entries(LANGUAGES) as [LanguageCode, typeof LANGUAGES[LanguageCode]][]).map(([code, lang]) => (
                              <button
                                key={code}
                                onClick={() => setLocale(code)}
                                className={`p-4 rounded-xl border transition-all text-left relative ${
                                  locale === code
                                    ? 'border-bizra-gold bg-bizra-gold/10'
                                    : 'border-white/10 hover:border-white/30 bg-white/5'
                                }`}
                              >
                                <span className="text-3xl mb-2 block">{lang.flag}</span>
                                <span className="font-medium text-white block">{lang.nativeName}</span>
                                <span className="text-xs text-white/40">{lang.name}</span>
                                {lang.dir === 'rtl' && (
                                  <span className="absolute top-2 right-8 px-1.5 py-0.5 rounded bg-white/10 text-xs text-white/40">
                                    RTL
                                  </span>
                                )}
                                {locale === code && (
                                  <Check className="w-4 h-4 text-bizra-gold absolute top-2 right-2" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* RTL Info */}
                        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                          <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-bizra-gold" />
                            About Language Support
                          </h3>
                          <p className="text-white/60 text-sm">
                            BIZRA supports multiple languages with full RTL (right-to-left) support for Arabic.
                            Language changes take effect immediately across the entire application.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* PAT Configuration */}
                    {activeCategory === 'pat' && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Bot className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-white">PAT Configuration</h2>
                            <p className="text-white/60">Configure your Personal Agent Team</p>
                          </div>
                        </div>

                        {/* Primary Agent Selection */}
                        <div>
                          <label className="block text-white/80 font-medium mb-4">
                            Primary Agent
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {PAT_AGENTS.map((agent) => (
                              <button
                                key={agent.id}
                                onClick={() => setPrimaryAgent(agent.id)}
                                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                                  primaryAgent === agent.id
                                    ? 'border-bizra-gold bg-bizra-gold/10'
                                    : 'border-white/10 hover:border-white/30 bg-white/5'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${agent.color}`}>
                                  <agent.icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-white font-medium">{agent.name}</span>
                                    {primaryAgent === agent.id && (
                                      <Check className="w-4 h-4 text-bizra-gold" />
                                    )}
                                  </div>
                                  <span className="text-white/40 text-sm font-mono">{agent.model}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={saveSettings}
                          disabled={saving}
                          className="btn-sovereign flex items-center justify-center gap-2"
                        >
                          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                          {saving ? 'Updating...' : 'Update Primary Agent'}
                        </button>
                      </div>
                    )}

                    {/* Resources */}
                    {activeCategory === 'resources' && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <Cpu className="w-6 h-6 text-green-400" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-white">Resource Allocation</h2>
                            <p className="text-white/60">Hardware configuration for your Node</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <Zap className="w-6 h-6 text-yellow-400 mb-2" />
                            <h3 className="text-white font-medium">GPU VRAM</h3>
                            <p className="text-2xl text-bizra-gold font-bold">8 GB</p>
                            <p className="text-white/40 text-sm">Allocated</p>
                          </div>
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <Cpu className="w-6 h-6 text-blue-400 mb-2" />
                            <h3 className="text-white font-medium">CPU Threads</h3>
                            <p className="text-2xl text-bizra-gold font-bold">8 / 16</p>
                            <p className="text-white/40 text-sm">In use</p>
                          </div>
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <Database className="w-6 h-6 text-purple-400 mb-2" />
                            <h3 className="text-white font-medium">RAM Usage</h3>
                            <p className="text-2xl text-bizra-gold font-bold">12 GB</p>
                            <p className="text-white/40 text-sm">Of 32 GB</p>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-bizra-gold/10 border border-bizra-gold/30">
                          <p className="text-bizra-gold text-sm">
                            💡 Configure detailed resource settings on the <button onClick={() => router.push('/resources')} className="underline">Resources page</button>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Security */}
                    {activeCategory === 'security' && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-green-400" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-white">Security & Privacy</h2>
                            <p className="text-white/60">Your data sovereignty controls</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {[
                            { name: 'Local-Only Mode', desc: 'All data stays on your machine', enabled: true, icon: Lock },
                            { name: 'Encryption at Rest', desc: 'AES-256 encryption for sensitive data', enabled: true, icon: Shield },
                            { name: 'Zero Cloud Dependencies', desc: 'No external API calls', enabled: true, icon: Eye },
                          ].map((feature) => (
                            <div key={feature.name} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
                              <div className="flex items-center gap-3">
                                <feature.icon className="w-5 h-5 text-green-400" />
                                <div>
                                  <h3 className="text-white font-medium">{feature.name}</h3>
                                  <p className="text-white/40 text-sm">{feature.desc}</p>
                                </div>
                              </div>
                              <div className="w-12 h-6 bg-green-500/30 rounded-full flex items-center justify-end px-1">
                                <div className="w-4 h-4 bg-green-500 rounded-full" />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="p-4 bg-bizra-gold/10 border border-bizra-gold/30 rounded-xl">
                          <h3 className="text-bizra-gold font-medium mb-2 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Sovereignty Guaranteed
                          </h3>
                          <p className="text-white/60 text-sm">
                            Node0 is designed for complete user sovereignty. Your data never leaves your machine
                            unless you explicitly export it. All AI inference happens locally via Ollama.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Backup & Export */}
                    {activeCategory === 'backup' && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Download className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-white">Backup & Export</h2>
                            <p className="text-white/60">Export your data and create backups</p>
                          </div>
                        </div>

                        <div className="grid gap-4">
                          <div className="p-6 rounded-xl border border-white/10 bg-white/5">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-white font-medium mb-1">Full Data Export</h3>
                                <p className="text-white/60 text-sm">
                                  Profile, PoI ledger, knowledge base, and settings
                                </p>
                              </div>
                              <button
                                onClick={() => handleExport('Full')}
                                className="btn-glass flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Export ZIP
                              </button>
                            </div>
                          </div>

                          <div className="p-6 rounded-xl border border-white/10 bg-white/5">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-white font-medium mb-1">PoI Ledger Export</h3>
                                <p className="text-white/60 text-sm">
                                  Your Proof-of-Impact history as CSV
                                </p>
                              </div>
                              <button
                                onClick={() => handleExport('PoI')}
                                className="btn-glass flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Export CSV
                              </button>
                            </div>
                          </div>

                          <div className="p-6 rounded-xl border border-dashed border-white/20 bg-white/5 text-center">
                            <Upload className="w-8 h-8 text-white/40 mx-auto mb-2" />
                            <h3 className="text-white font-medium mb-1">Import Backup</h3>
                            <p className="text-white/60 text-sm mb-4">
                              Restore from a previous export
                            </p>
                            <button className="btn-glass">Select File</button>
                          </div>
                        </div>

                        {exportStatus && (
                          <div className="p-4 bg-bizra-gold/20 rounded-xl text-bizra-gold text-sm">
                            {exportStatus}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Advanced */}
                    {activeCategory === 'advanced' && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <Settings className="w-6 h-6 text-orange-400" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-white">Advanced Settings</h2>
                            <p className="text-white/60">Developer and power user options</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                            <h3 className="text-white font-medium mb-3">API Endpoints</h3>
                            <div className="font-mono text-sm text-white/60 space-y-2">
                              <div className="flex justify-between">
                                <span>REST API</span>
                                <span className="text-bizra-gold">http://localhost:8080</span>
                              </div>
                              <div className="flex justify-between">
                                <span>WebSocket</span>
                                <span className="text-bizra-gold">ws://localhost:3002/telemetry</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Ollama</span>
                                <span className="text-bizra-gold">http://localhost:11434</span>
                              </div>
                              <div className="flex justify-between">
                                <span>LM Studio</span>
                                <span className="text-bizra-gold">http://localhost:1234</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                            <h3 className="text-white font-medium mb-2">Knowledge Graph</h3>
                            <p className="text-white/40 text-sm mb-3">
                              Hypergraph RAG status and controls
                            </p>
                            <button className="btn-glass flex items-center gap-2">
                              <RefreshCw className="w-4 h-4" />
                              Rebuild Knowledge Graph
                            </button>
                          </div>

                          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10">
                            <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5" />
                              Danger Zone
                            </h3>
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
                  </GlassCard>
                </motion.div>
              </AnimatePresence>
            </motion.main>
          </div>
        </div>
      </main>
    </div>
  );
}
