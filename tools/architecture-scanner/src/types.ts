export type Language = 'rust' | 'ts' | 'tsx' | 'js' | 'jsx' | 'other';

export interface FileMetrics {
  bytes: number;
  loc: number;
  mtimeMs: number;
}

export interface Evidence {
  line: number;
  snippet: string;
}

export interface ImportEdge {
  from: string;
  to: string;
  evidence: Evidence[];
}

export interface SecurityHotspot {
  type: 'hardcoded_secrets' | 'missing_validation' | 'unsafe_code' | 'test_secrets_in_prod';
  severity: 'critical' | 'high' | 'medium';
  risk: 'data_breach' | 'runtime_crash' | 'sql_injection' | 'deployment_risk';
  confidence: number; // 0-100
  evidence: Evidence;
}

export interface PerformanceHotspot {
  type: 'excessive_cloning' | 'blocking_io_in_async' | 'large_god_module' | 'unoptimized_iteration';
  severity: 'high' | 'medium' | 'low';
  impact: 'scalability_limit' | 'memory_pressure' | 'response_latency' | 'maintainability';
  confidence: number; // 0-100
  evidence: Evidence;
}

export interface Signals {
  db: Evidence[];
  http: Evidence[];
  llm: Evidence[];
  observability: Evidence[];
  unsafe: Evidence[];
  todos: Evidence[];
  security_hotspots: SecurityHotspot[];
  performance_hotspots: PerformanceHotspot[];
}

export interface FileNode {
  path: string;
  lang: Language;
  layer: string;
  metrics: FileMetrics;
  imports: string[];
  signals: Signals;
  hotspot?: {
    score: number; // 0-100
    reasons: string[];
  };
}

export interface ArchitectureMap {
  root: string;
  generatedAt: string;
  files: FileNode[];
  edges: ImportEdge[];
}
