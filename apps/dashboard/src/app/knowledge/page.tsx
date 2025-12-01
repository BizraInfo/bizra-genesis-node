'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useGenesisSynapse } from '@/hooks/useGenesisSynapse';

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

interface SearchResult {
  node_id: string;
  path: string;
  score: number;
  concepts: string[];
  domain: string;
  preview: string;
}

const DOMAINS = [
  { id: 'all', name: 'All Domains', icon: '📚' },
  { id: 'core_bizra', name: 'BIZRA Core', icon: '🧬' },
  { id: 'consciousness', name: 'Consciousness', icon: '🧠' },
  { id: 'sape', name: 'SAPE', icon: '⚡' },
  { id: 'research', name: 'Research', icon: '🔬' },
  { id: 'infrastructure', name: 'Infrastructure', icon: '🏗️' },
  { id: 'agents', name: 'Agents', icon: '🤖' },
];

const TOP_CONCEPTS = [
  'consciousness',
  'synthesis',
  'sape',
  'orchestration',
  'temporal',
  'agents',
  'hypergraph',
  'rag',
  'embeddings',
  'poi',
  'ihsan',
];

export default function KnowledgePage() {
  const { synapse, connected } = useGenesisSynapse();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentNodes, setRecentNodes] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [graphStats, setGraphStats] = useState<{
    total_nodes: number;
    total_edges: number;
    total_concepts: number;
  } | null>(null);

  // Simulated stats for demo
  useEffect(() => {
    setGraphStats({
      total_nodes: 413734,
      total_edges: 2847291,
      total_concepts: 847,
    });

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
    try {
      // In production, this would call the knowledge API
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Simulated search results
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
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConceptClick = (concept: string) => {
    setSearchQuery(concept);
    handleSearch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
              <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
              <p className="text-white/40 text-sm">Explore the Hypergraph RAG</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {graphStats && (
              <div className="flex gap-4 text-sm">
                <span className="text-white/40">
                  <span className="text-amber-400 font-bold">{graphStats.total_nodes.toLocaleString()}</span> nodes
                </span>
                <span className="text-white/40">
                  <span className="text-amber-400 font-bold">{graphStats.total_edges.toLocaleString()}</span> edges
                </span>
                <span className="text-white/40">
                  <span className="text-amber-400 font-bold">{graphStats.total_concepts}</span> concepts
                </span>
              </div>
            )}
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section */}
        <section className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search your knowledge... (e.g., 'consciousness architecture', 'SAPE orchestration')"
              className="w-full px-6 py-4 bg-slate-800/50 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all text-lg"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Domain filters */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {DOMAINS.map((domain) => (
              <button
                key={domain.id}
                onClick={() => setSelectedDomain(domain.id)}
                className={`px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${
                  selectedDomain === domain.id
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800/50 text-white/60 border border-white/10 hover:border-white/30'
                }`}
              >
                <span>{domain.icon}</span>
                <span>{domain.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Quick Concepts */}
        <section className="mb-8">
          <h2 className="text-white/60 text-sm font-medium mb-3">Popular Concepts</h2>
          <div className="flex gap-2 flex-wrap">
            {TOP_CONCEPTS.map((concept) => (
              <button
                key={concept}
                onClick={() => handleConceptClick(concept)}
                className="px-3 py-1.5 bg-slate-800/50 border border-white/10 rounded-lg text-white/60 hover:text-amber-400 hover:border-amber-500/30 transition-all text-sm"
              >
                #{concept}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Results / Recent */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Results */}
            {searchResults.length > 0 && (
              <section>
                <h2 className="text-white font-medium mb-4 flex items-center gap-2">
                  <span>🔍</span>
                  Search Results ({searchResults.length})
                </h2>
                <div className="space-y-4">
                  {searchResults.map((result) => (
                    <motion.div
                      key={result.node_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-slate-800/50 rounded-xl border border-white/10 hover:border-amber-500/30 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-white font-medium group-hover:text-amber-400 transition-colors">
                            {result.path.split('/').pop()}
                          </h3>
                          <p className="text-white/40 text-sm font-mono">{result.path}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-md text-xs">
                            {Math.round(result.score * 100)}% match
                          </span>
                        </div>
                      </div>
                      <p className="text-white/60 text-sm mb-3">{result.preview}</p>
                      <div className="flex gap-2 flex-wrap">
                        {result.concepts.map((concept) => (
                          <span
                            key={concept}
                            className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Files */}
            <section>
              <h2 className="text-white font-medium mb-4 flex items-center gap-2">
                <span>📂</span>
                Recently Modified
              </h2>
              <div className="space-y-3">
                {recentNodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-4 bg-slate-800/30 rounded-xl border border-white/5 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {node.extension === '.rs'
                            ? '🦀'
                            : node.extension === '.py'
                            ? '🐍'
                            : node.extension === '.md'
                            ? '📄'
                            : '📁'}
                        </span>
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
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Graph Visualization Placeholder */}
            <section className="p-6 bg-slate-800/50 rounded-xl border border-white/10">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span>🕸️</span>
                Knowledge Graph
              </h3>
              <div className="aspect-square bg-slate-900/50 rounded-lg flex items-center justify-center border border-white/5">
                <div className="text-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="text-6xl mb-4"
                  >
                    🧬
                  </motion.div>
                  <p className="text-white/40 text-sm">
                    Graph visualization
                    <br />
                    coming soon
                  </p>
                </div>
              </div>
            </section>

            {/* Concept Cloud */}
            <section className="p-6 bg-slate-800/50 rounded-xl border border-white/10">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span>☁️</span>
                Concept Cloud
              </h3>
              <div className="flex flex-wrap gap-2">
                {TOP_CONCEPTS.map((concept, i) => (
                  <motion.span
                    key={concept}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm cursor-pointer hover:bg-amber-500/20 transition-all"
                    style={{
                      fontSize: `${Math.max(0.75, 1 - i * 0.03)}rem`,
                    }}
                    onClick={() => handleConceptClick(concept)}
                  >
                    {concept}
                  </motion.span>
                ))}
              </div>
            </section>

            {/* Quick Stats */}
            <section className="p-6 bg-slate-800/50 rounded-xl border border-white/10">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span>📊</span>
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">Total Files</span>
                  <span className="text-white font-mono">413,734</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Rust Files</span>
                  <span className="text-white font-mono">2,847</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Python Files</span>
                  <span className="text-white font-mono">12,391</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Markdown Docs</span>
                  <span className="text-white font-mono">8,924</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Embeddings</span>
                  <span className="text-white font-mono">1.2M</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
