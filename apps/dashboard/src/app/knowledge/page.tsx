'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Folder,
  Code,
  BookOpen,
  Brain,
  Sparkles,
  Filter,
  Clock,
  TrendingUp,
  Database,
  Network,
  Loader2,
  ChevronRight,
  Hash
} from 'lucide-react';
import { BizraNavbar, GlassCard, SacredGeometryBackground, BizraLogoAnimated } from '@/components/brand';

interface SearchResult {
  node_id: string;
  path: string;
  score: number;
  concepts: string[];
  domain: string;
  preview: string;
}

interface KnowledgeNode {
  id: string;
  path: string;
  name: string;
  domain: string;
  extension: string;
  concepts: string[];
  size_bytes: number;
  modified_at: string;
}

const DOMAINS = [
  { id: 'all', name: 'All Domains', icon: Database, color: 'text-white' },
  { id: 'core_bizra', name: 'BIZRA Core', icon: Sparkles, color: 'text-bizra-gold' },
  { id: 'consciousness', name: 'Consciousness', icon: Brain, color: 'text-purple-400' },
  { id: 'sape', name: 'SAPE', icon: Network, color: 'text-cyan-400' },
  { id: 'research', name: 'Research', icon: BookOpen, color: 'text-green-400' },
  { id: 'infrastructure', name: 'Infrastructure', icon: Code, color: 'text-orange-400' },
  { id: 'agents', name: 'Agents', icon: Brain, color: 'text-pink-400' },
];

const TOP_CONCEPTS = [
  'consciousness', 'synthesis', 'sape', 'orchestration', 'temporal',
  'agents', 'hypergraph', 'rag', 'embeddings', 'poi', 'ihsan',
];

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentNodes, setRecentNodes] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [graphStats, setGraphStats] = useState({
    total_nodes: 413734,
    total_edges: 2847291,
    total_concepts: 847,
  });

  useEffect(() => {
    // Simulated recent nodes
    setRecentNodes([
      {
        id: 'node-1',
        path: 'backend/src/lib/agents/pat.rs',
        name: 'pat.rs',
        domain: 'agents',
        extension: '.rs',
        concepts: ['agents', 'orchestration', 'pat'],
        size_bytes: 15420,
        modified_at: '2025-12-01T10:30:00Z',
      },
      {
        id: 'node-2',
        path: 'knowledge/scripts/query_engine.py',
        name: 'query_engine.py',
        domain: 'hypergraph',
        extension: '.py',
        concepts: ['hypergraph', 'rag', 'traversal'],
        size_bytes: 8921,
        modified_at: '2025-12-01T09:15:00Z',
      },
      {
        id: 'node-3',
        path: 'docs/ARCHITECTURE.md',
        name: 'ARCHITECTURE.md',
        domain: 'core_bizra',
        extension: '.md',
        concepts: ['consciousness', 'synthesis', 'sape'],
        size_bytes: 45280,
        modified_at: '2025-11-30T22:00:00Z',
      },
    ]);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    setSearchResults([
      {
        node_id: 'result-1',
        path: 'research/consciousness/thermal-consciousness.md',
        score: 0.94,
        concepts: ['consciousness', 'thermal', 'synthesis'],
        domain: 'consciousness',
        preview: 'The thermal consciousness model provides a mathematical framework for...',
      },
      {
        node_id: 'result-2',
        path: 'backend/src/lib/services/knowledge.rs',
        score: 0.89,
        concepts: ['hypergraph', 'knowledge', 'rag'],
        domain: 'infrastructure',
        preview: 'Rust client for Hypergraph RAG queries, enabling knowledge retrieval...',
      },
      {
        node_id: 'result-3',
        path: 'research/sape/orchestration-patterns.md',
        score: 0.85,
        concepts: ['sape', 'orchestration', 'agents'],
        domain: 'sape',
        preview: 'SAPE orchestration patterns for multi-agent coordination...',
      },
    ]);
    setLoading(false);
  };

  const handleConceptClick = (concept: string) => {
    setSearchQuery(concept);
    setTimeout(handleSearch, 100);
  };

  const getFileIcon = (ext: string) => {
    switch (ext) {
      case '.rs': return '🦀';
      case '.py': return '🐍';
      case '.md': return '📄';
      case '.ts': return '💠';
      case '.tsx': return '⚛️';
      default: return '📁';
    }
  };

  return (
    <div className="min-h-screen bg-bizra-navy relative overflow-hidden">
      {/* Sacred Geometry Background */}
      <SacredGeometryBackground intensity="subtle" />
      
      {/* Navigation */}
      <BizraNavbar />
      
      <main className="pt-20 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          {/* Header with Stats */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gradient-sovereign mb-2">
                Knowledge Base
              </h1>
              <p className="text-white/60">
                Explore the Hypergraph RAG
              </p>
            </div>
            
            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div className="glass-panel px-4 py-2 rounded-xl">
                <span className="text-bizra-gold font-bold">{graphStats.total_nodes.toLocaleString()}</span>
                <span className="text-white/40 ml-1">nodes</span>
              </div>
              <div className="glass-panel px-4 py-2 rounded-xl">
                <span className="text-bizra-gold font-bold">{graphStats.total_edges.toLocaleString()}</span>
                <span className="text-white/40 ml-1">edges</span>
              </div>
              <div className="glass-panel px-4 py-2 rounded-xl">
                <span className="text-bizra-gold font-bold">{graphStats.total_concepts}</span>
                <span className="text-white/40 ml-1">concepts</span>
              </div>
            </div>
          </motion.div>

          {/* Search Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <GlassCard className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search your knowledge... (e.g., 'consciousness architecture', 'SAPE orchestration')"
                  className="w-full pl-12 pr-32 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-bizra-gold focus:ring-1 focus:ring-bizra-gold/50 transition-all text-lg"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn-sovereign py-2 px-6"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                </button>
              </div>

              {/* Domain Filters */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {DOMAINS.map((domain) => (
                  <button
                    key={domain.id}
                    onClick={() => setSelectedDomain(domain.id)}
                    className={`px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${
                      selectedDomain === domain.id
                        ? 'bg-bizra-gold/20 text-bizra-gold border border-bizra-gold/30'
                        : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/30'
                    }`}
                  >
                    <domain.icon className={`w-4 h-4 ${selectedDomain === domain.id ? 'text-bizra-gold' : domain.color}`} />
                    <span>{domain.name}</span>
                  </button>
                ))}
              </div>
            </GlassCard>
          </motion.section>

          {/* Quick Concepts */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-white/60 text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Popular Concepts
            </h2>
            <div className="flex gap-2 flex-wrap">
              {TOP_CONCEPTS.map((concept) => (
                <button
                  key={concept}
                  onClick={() => handleConceptClick(concept)}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-bizra-gold hover:border-bizra-gold/30 transition-all text-sm flex items-center gap-1"
                >
                  <Hash className="w-3 h-3" />
                  {concept}
                </button>
              ))}
            </div>
          </motion.section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Search Results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <h2 className="text-white font-medium mb-4 flex items-center gap-2">
                      <Search className="w-5 h-5 text-bizra-gold" />
                      Search Results ({searchResults.length})
                    </h2>
                    <div className="space-y-3">
                      {searchResults.map((result, index) => (
                        <motion.div
                          key={result.node_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <GlassCard className="p-4 hover:border-bizra-gold/30 transition-all cursor-pointer group">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{getFileIcon(result.path.split('.').pop() || '')}</span>
                                <div>
                                  <h3 className="text-white font-medium group-hover:text-bizra-gold transition-colors">
                                    {result.path.split('/').pop()}
                                  </h3>
                                  <p className="text-white/40 text-sm font-mono">{result.path}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-md text-xs font-medium">
                                  {Math.round(result.score * 100)}% match
                                </span>
                                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-bizra-gold transition-colors" />
                              </div>
                            </div>
                            <p className="text-white/60 text-sm mb-3">{result.preview}</p>
                            <div className="flex gap-2 flex-wrap">
                              {result.concepts.map((concept) => (
                                <span
                                  key={concept}
                                  className="px-2 py-0.5 bg-bizra-gold/10 text-bizra-gold rounded text-xs"
                                >
                                  {concept}
                                </span>
                              ))}
                            </div>
                          </GlassCard>
                        </motion.div>
                      ))}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Recent Files */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-white/60" />
                  Recently Modified
                </h2>
                <div className="space-y-3">
                  {recentNodes.map((node) => (
                    <GlassCard
                      key={node.id}
                      className="p-4 hover:border-white/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(node.extension)}</span>
                          <div>
                            <h3 className="text-white font-medium">{node.name}</h3>
                            <p className="text-white/40 text-sm font-mono">{node.path}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-white/40 text-sm">
                            {new Date(node.modified_at).toLocaleDateString()}
                          </span>
                          <p className="text-white/30 text-xs">
                            {(node.size_bytes / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </motion.section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Graph Visualization */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <GlassCard className="p-6">
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Network className="w-5 h-5 text-bizra-gold" />
                    Knowledge Graph
                  </h3>
                  <div className="aspect-square bg-bizra-navy/50 rounded-xl flex items-center justify-center border border-white/5 relative overflow-hidden">
                    <SacredGeometryBackground intensity="medium" />
                    <div className="text-center relative z-10">
                      <BizraLogoAnimated size="lg" className="mx-auto mb-4" />
                      <p className="text-white/40 text-sm">
                        Graph visualization
                        <br />
                        coming soon
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Concept Cloud */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <GlassCard className="p-6">
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-bizra-gold" />
                    Concept Cloud
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {TOP_CONCEPTS.map((concept, i) => (
                      <motion.span
                        key={concept}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                        className="px-3 py-1.5 bg-gradient-to-r from-bizra-gold/10 to-orange-500/10 border border-bizra-gold/20 rounded-full text-bizra-gold text-sm cursor-pointer hover:bg-bizra-gold/20 transition-all"
                        style={{ fontSize: `${Math.max(0.75, 1 - i * 0.03)}rem` }}
                        onClick={() => handleConceptClick(concept)}
                      >
                        {concept}
                      </motion.span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <GlassCard className="p-6">
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-bizra-gold" />
                    Quick Stats
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Total Files', value: '413,734' },
                      { label: 'Rust Files', value: '2,847' },
                      { label: 'Python Files', value: '12,391' },
                      { label: 'Markdown Docs', value: '8,924' },
                      { label: 'Embeddings', value: '1.2M' },
                    ].map((stat) => (
                      <div key={stat.label} className="flex justify-between">
                        <span className="text-white/60">{stat.label}</span>
                        <span className="text-white font-mono">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
