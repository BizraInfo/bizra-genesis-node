import { Evidence, FileMetrics, FileNode, Signals, SecurityHotspot, PerformanceHotspot } from '../types';
import path from 'path';

const RE_USE = /^\s*use\s+([a-zA-Z0-9_:\\{\} ,]+);/;
const RE_UNSAFE = /\bunsafe\b/;
const RE_TODO = /\b(TODO|FIXME|XXX)\b/i;

// integration signals
const RE_SQLX = /\b(sqlx::|sqlx\s*::|query!|query_as!|FromRow|Executor|Pool|PgPool|MySqlPool)/;
const RE_REQWEST = /\b(reqwest::|reqwest\s*::|Client::new|get\(|post\(|RequestBuilder)/;
const RE_OBSERVABILITY = /\b(tracing::|prometheus|opentelemetry|info!|warn!|error!|debug!|trace!|instrument)/;
const RE_LLM = /\b(openai|azure[_\s]*openai|anthropic|mistral|ChatCompletion|CreateChatCompletion|claude|gpt-)/i;
const RE_REDIS = /\b(redis::|AsyncCommands|Client|Connection)/;
const RE_THISERROR = /\b(thiserror::Error|#\[error\()/;
const RE_SERDE = /\b(serde::|Serialize|Deserialize|serde_json)/;

// AUDIT-GRADE: Security hotspot patterns
const SECURITY_PATTERNS = [
  // Hardcoded secrets from Principal Audit findings
  { regex: /JWTSECRETY?[\s:="]+OURJWTSECRETHEREGENERATEWITH/gi, type: 'hardcoded_secrets' as const, risk: 'data_breach' as const, severity: 'critical' as const, confidence: 95 },
  { regex: /ENCRYPTIONKEY[\s:="]+YOURENCRYPTIONKEYHERE/gi, type: 'hardcoded_secrets' as const, risk: 'data_breach' as const, severity: 'critical' as const, confidence: 95 },
  { regex: /OPENAIAPIKEYSK-(?!env\.|std::env)/gi, type: 'hardcoded_secrets' as const, risk: 'data_breach' as const, severity: 'critical' as const, confidence: 90 },
  { regex: /ANTHROPICAPIKEYSK-(?:CHANGETHIS|ANT-CHANGETHIS)/gi, type: 'test_secrets_in_prod' as const, risk: 'deployment_risk' as const, severity: 'critical' as const, confidence: 100 },
  { regex: /(?:password|secret|key|token)\s*[=:]\s*["'][^"']{8,}["'](?!\s*\/\/\s*(?:example|test|placeholder))/gi, type: 'hardcoded_secrets' as const, risk: 'data_breach' as const, severity: 'high' as const, confidence: 70 },
  // Missing validation patterns
  { regex: /\.unwrap\(\)/g, type: 'unsafe_code' as const, risk: 'runtime_crash' as const, severity: 'high' as const, confidence: 85 },
  { regex: /\.expect\(["'][^"']*["']\)/g, type: 'unsafe_code' as const, risk: 'runtime_crash' as const, severity: 'medium' as const, confidence: 75 },
  // SQL injection risks
  { regex: /format!\s*\([^)]*SELECT[^)]*\)/gi, type: 'missing_validation' as const, risk: 'sql_injection' as const, severity: 'critical' as const, confidence: 80 },
];

// AUDIT-GRADE: Performance bottleneck patterns
const PERFORMANCE_PATTERNS = [
  // Excessive cloning detection
  { regex: /metrics\.export\(\)/g, type: 'excessive_cloning' as const, impact: 'memory_pressure' as const, severity: 'high' as const, confidence: 95 },
  { regex: /Arc<[^>]+>\.clone\(\)/g, type: 'excessive_cloning' as const, impact: 'response_latency' as const, severity: 'medium' as const, confidence: 70 },
  // Blocking I/O in async contexts
  { regex: /async\s+fn\s+\w+[^{]*\{[^}]*std::fs::/g, type: 'blocking_io_in_async' as const, impact: 'scalability_limit' as const, severity: 'high' as const, confidence: 85 },
  { regex: /\.await[^;]*\.unwrap\(\)/g, type: 'blocking_io_in_async' as const, impact: 'response_latency' as const, severity: 'high' as const, confidence: 90 },
];

export function classifyRustLayer(p: string): string {
  const s = p.replace(/\\/g, '/');
  if (s.includes('/websocket/')) return 'interface:ws';
  if (s.includes('/api/')) return 'interface:http';
  if (s.includes('/aegis/')) return 'domain:consensus';
  if (s.includes('/rewards/')) return 'domain:rewards';
  if (s.includes('/middleware/')) return 'platform:middleware';
  if (s.includes('/src/db') || s.includes('/migrations')) return 'data';
  return 'other';
}

export function parseRust(
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
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(RE_USE);
    if (m) {
      imports.push(m[1].trim());
    }
    if (RE_UNSAFE.test(line)) evidence.unsafe.push({ line: i + 1, snippet: line.trim() });
    if (RE_TODO.test(line)) evidence.todos.push({ line: i + 1, snippet: line.trim() });
    if (RE_SQLX.test(line)) evidence.db.push({ line: i + 1, snippet: line.trim() });
    if (RE_REDIS.test(line)) evidence.db.push({ line: i + 1, snippet: line.trim() });
    if (RE_REQWEST.test(line)) evidence.http.push({ line: i + 1, snippet: line.trim() });
    if (RE_OBSERVABILITY.test(line))
      evidence.observability.push({ line: i + 1, snippet: line.trim() });
    if (RE_LLM.test(line)) evidence.llm.push({ line: i + 1, snippet: line.trim() });
  }

  // AUDIT-GRADE: Security hotspot detection
  for (const pattern of SECURITY_PATTERNS) {
    let match;
    const patternRegex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = patternRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const snippet = extractCodeSnippet(content, match.index, 120);
      evidence.security_hotspots.push({
        type: pattern.type,
        severity: pattern.severity,
        risk: pattern.risk,
        confidence: pattern.confidence,
        evidence: { line: lineNum, snippet },
      });
    }
  }

  // AUDIT-GRADE: Performance bottleneck detection
  for (const pattern of PERFORMANCE_PATTERNS) {
    let match;
    const patternRegex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = patternRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const snippet = extractCodeSnippet(content, match.index, 120);
      evidence.performance_hotspots.push({
        type: pattern.type,
        severity: pattern.severity,
        impact: pattern.impact,
        confidence: pattern.confidence,
        evidence: { line: lineNum, snippet },
      });
    }
  }

  // God module detection (>300 LOC threshold from audit)
  if (metrics.loc > 300) {
    evidence.performance_hotspots.push({
      type: 'large_god_module',
      severity: 'medium',
      impact: 'maintainability',
      confidence: 100,
      evidence: { line: 1, snippet: `Module size: ${metrics.loc} lines (threshold: 300)` },
    });
  }

  return {
    path: absPath,
    lang: 'rust',
    layer: classifyRustLayer(absPath),
    metrics,
    imports,
    signals: evidence,
  };
}

/**
 * Extract code snippet around a match for evidence
 */
function extractCodeSnippet(content: string, index: number, maxLength: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + maxLength);
  let snippet = content.substring(start, end);
  
  // Trim to complete lines
  const firstNewline = snippet.indexOf('\n');
  const lastNewline = snippet.lastIndexOf('\n');
  if (firstNewline > 0 && lastNewline > firstNewline) {
    snippet = snippet.substring(firstNewline + 1, lastNewline);
  }
  
  return snippet.trim();
}
