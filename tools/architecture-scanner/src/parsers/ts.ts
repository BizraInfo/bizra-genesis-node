import { Evidence, FileMetrics, FileNode, SecurityHotspot, PerformanceHotspot, Signals } from '../types';

const RE_IMPORT = /^(?:\s*import\s+[^'"\n]+from\s+|\s*import\s+\()(?:'|")([^'"\n]+)(?:'|")/;
const RE_REQUIRE = /require\(\s*['"]([^'"]+)['"]\s*\)/;
const RE_TODO = /\b(TODO|FIXME|XXX)\b/i;

// Security patterns - Frontend specific
const SECURITY_PATTERNS = [
  {
    pattern: /localStorage\.setItem\([^,]*,\s*['"`].*?(password|secret|token|apikey|api_key).*?['"`]/i,
    type: 'hardcoded_secrets' as const,
    severity: 'critical' as const,
    risk: 'data_breach' as const,
    confidence: 90,
  },
  {
    pattern: /const\s+\w*(?:api)?(?:key|token|secret|password)\w*\s*=\s*['"`](?!test|mock|example)[\w\-]{20,}/i,
    type: 'hardcoded_secrets' as const,
    severity: 'critical' as const,
    risk: 'data_breach' as const,
    confidence: 85,
  },
  {
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\{?\s*__html:/,
    type: 'unsafe_code' as const,
    severity: 'high' as const,
    risk: 'runtime_crash' as const,
    confidence: 95,
  },
  {
    pattern: /eval\(|Function\(|setTimeout\([^,]*\)|\bexec\(/,
    type: 'unsafe_code' as const,
    severity: 'high' as const,
    risk: 'runtime_crash' as const,
    confidence: 80,
  },
  {
    pattern: /window\.location\.href\s*=\s*(?!['"`]https?:|['"`]\/)/,
    type: 'unsafe_code' as const,
    severity: 'medium' as const,
    risk: 'runtime_crash' as const,
    confidence: 70,
  },
  {
    pattern: /\.innerHTML\s*=(?!\s*['"`]$)/,
    type: 'unsafe_code' as const,
    severity: 'medium' as const,
    risk: 'runtime_crash' as const,
    confidence: 75,
  },
  {
    pattern: /OPENAI_API_KEY.*?=.*?['"`]sk-[a-zA-Z0-9]{20,}['"`]/i,
    type: 'test_secrets_in_prod' as const,
    severity: 'critical' as const,
    risk: 'deployment_risk' as const,
    confidence: 100,
  },
  {
    pattern: /ANTHROPIC_API_KEY.*?=.*?['"`]sk-ant-[a-zA-Z0-9\-_]{20,}['"`]/i,
    type: 'test_secrets_in_prod' as const,
    severity: 'critical' as const,
    risk: 'deployment_risk' as const,
    confidence: 100,
  },
];

// Performance patterns - Frontend specific
const PERFORMANCE_PATTERNS = [
  {
    pattern: /useEffect\(\s*\(\)\s*=>\s*\{[^}]*\}\s*,\s*\[\s*\]\s*\)/s,
    type: 'unoptimized_iteration' as const,
    severity: 'low' as const,
    impact: 'response_latency' as const,
    confidence: 65,
  },
  {
    pattern: /\.map\([^)]*\)\.filter\([^)]*\)/,
    type: 'unoptimized_iteration' as const,
    severity: 'medium' as const,
    impact: 'response_latency' as const,
    confidence: 80,
  },
  {
    pattern: /import\s+[^'"]*\s+from\s+['"](?:lodash|moment|@mui\/icons-material)['"](?!\s*\/)/,
    type: 'excessive_cloning' as const,
    severity: 'medium' as const,
    impact: 'memory_pressure' as const,
    confidence: 85,
  },
  {
    pattern: /JSON\.parse\(JSON\.stringify\(/,
    type: 'excessive_cloning' as const,
    severity: 'high' as const,
    impact: 'memory_pressure' as const,
    confidence: 95,
  },
  {
    pattern: /useState\<[^>]*\[\][^>]*>\([^)]*\.map\(/,
    type: 'excessive_cloning' as const,
    severity: 'medium' as const,
    impact: 'scalability_limit' as const,
    confidence: 75,
  },
];

// integration signals
const RE_DB = /\b(pg|postgres|mysql|sqlite3|prisma|sqlx|@prisma\/client|PrismaClient|query\(|execute\()/i;
const RE_HTTP = /\b(axios|fetch\(|superagent|request\(|got\b|http\.get|http\.post|RequestInit|Response)/;
const RE_WEBSOCKET = /\b(WebSocket|ws\.|socket\.io|io\()/;
const RE_OBSERVABILITY = /\b(opentelemetry|otel|prom-client|winston|pino|console\.log|console\.error)/;
const RE_LLM = /\b(openai|@azure\/openai|anthropic|@anthropic|mistral|ChatCompletion|createChatCompletion|claude|gpt-)/i;
const RE_VALIDATION = /\b(zod|yup|joi|z\.|schema\.parse|validate\()/;
const RE_STATE = /\b(zustand|redux|jotai|recoil|useStore|createStore)/;

export function classifyTsLayer(p: string): string {
  const s = p.replace(/\\/g, '/');
  if (s.includes('/pages/') || s.includes('/app/')) return 'interface:web';
  if (s.includes('/api/')) return 'interface:http';
  if (s.includes('/tools/')) return 'tools';
  return 'other';
}

export function parseTs(
  absPath: string,
  content: string,
  metrics: FileMetrics
): FileNode {
  const imports: string[] = [];
  const evidence = {
    db: [] as Evidence[],
    http: [] as Evidence[],
    llm: [] as Evidence[],
    observability: [] as Evidence[],
    unsafe: [] as Evidence[],
    todos: [] as Evidence[],
    security_hotspots: [] as SecurityHotspot[],
    performance_hotspots: [] as PerformanceHotspot[],
  } as Signals;

  const lines = content.split(/\r?\n/);
  
  // Security hotspot detection
  for (const { pattern, type, severity, risk, confidence } of SECURITY_PATTERNS) {
    const matches = content.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
    for (const match of matches) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      evidence.security_hotspots.push({
        type,
        severity,
        risk,
        confidence,
        evidence: {
          line: lineNum,
          snippet: extractCodeSnippet(content, match.index!, 120),
        },
      });
    }
  }

  // Performance hotspot detection
  for (const { pattern, type, severity, impact, confidence } of PERFORMANCE_PATTERNS) {
    const matches = content.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
    for (const match of matches) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      evidence.performance_hotspots.push({
        type,
        severity,
        impact,
        confidence,
        evidence: {
          line: lineNum,
          snippet: extractCodeSnippet(content, match.index!, 120),
        },
      });
    }
  }

  // God component detection (>300 LOC)
  if (metrics.loc > 300) {
    evidence.performance_hotspots.push({
      type: 'large_god_module',
      severity: 'high',
      impact: 'maintainability',
      confidence: 100,
      evidence: {
        line: 1,
        snippet: `Component has ${metrics.loc} lines of code (threshold: 300)`,
      },
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mi = line.match(RE_IMPORT);
    if (mi) imports.push(mi[1]);
    const mr = line.match(RE_REQUIRE);
    if (mr) imports.push(mr[1]);
    if (RE_TODO.test(line)) evidence.todos.push({ line: i + 1, snippet: line.trim() });
    if (RE_DB.test(line)) evidence.db.push({ line: i + 1, snippet: line.trim() });
    if (RE_HTTP.test(line)) evidence.http.push({ line: i + 1, snippet: line.trim() });
    if (RE_WEBSOCKET.test(line)) evidence.http.push({ line: i + 1, snippet: line.trim() });
    if (RE_OBSERVABILITY.test(line))
      evidence.observability.push({ line: i + 1, snippet: line.trim() });
    if (RE_LLM.test(line)) evidence.llm.push({ line: i + 1, snippet: line.trim() });
  }

  return {
    path: absPath,
    lang: absPath.endsWith('.tsx') ? 'tsx' : absPath.endsWith('.ts') ? 'ts' : 'js',
    layer: classifyTsLayer(absPath),
    metrics,
    imports,
    signals: evidence,
  };
}

function extractCodeSnippet(content: string, index: number, maxLength: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + maxLength);
  const snippet = content.substring(start, end);
  const firstNewline = snippet.indexOf('\n');
  const lastNewline = snippet.lastIndexOf('\n');
  return snippet.substring(firstNewline + 1, lastNewline > firstNewline ? lastNewline : snippet.length).trim();
}
