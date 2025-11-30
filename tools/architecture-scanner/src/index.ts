import path from 'path';
import { walkFiles } from './utils/walker';
import { readText, statSafe, writeText } from './utils/fs';
import { ArchitectureMap, FileMetrics, FileNode, ImportEdge, Language, SecurityHotspot, PerformanceHotspot } from './types';
import { parseRust } from './parsers/rust';
import { parseTs } from './parsers/ts';
import { resolveImport } from './utils/resolve';
import { QualityGradeCalculator } from './quality-calculator';
import { AuditReportGenerator } from './audit-report-generator';

function detectLang(p: string): Language {
  if (p.endsWith('.rs')) return 'rust';
  if (p.endsWith('.tsx')) return 'tsx';
  if (p.endsWith('.ts')) return 'ts';
  if (p.endsWith('.jsx')) return 'jsx';
  if (p.endsWith('.js')) return 'js';
  return 'other';
}

async function metricsFor(file: string): Promise<FileMetrics> {
  const st = await statSafe(file);
  const text = await readText(file);
  const loc = text ? text.split(/\r?\n/).length : 0;
  return {
    bytes: st?.size ?? 0,
    loc,
    mtimeMs: st?.mtimeMs ?? 0,
  };
}

async function toEdges(nodes: FileNode[], projectRoot: string): Promise<ImportEdge[]> {
  const edges: ImportEdge[] = [];
  for (const n of nodes) {
    for (const imp of n.imports) {
      // Resolve TS/JS imports to absolute files when possible
      let to = imp;
      if (n.lang === 'ts' || n.lang === 'tsx' || n.lang === 'js' || n.lang === 'jsx') {
        const resolved = await resolveImport(n.path, imp, projectRoot);
        if (resolved) to = resolved;
      }
      edges.push({ from: n.path, to, evidence: [] });
    }
  }
  return edges;
}

async function main() {
  const root = path.resolve(process.argv[2] || process.cwd());
  const files = await walkFiles(root);
  const nodes: FileNode[] = [];

  for (const f of files) {
    const lang = detectLang(f);
    const text = await readText(f);
    const metrics = await metricsFor(f);
    if (!text) continue;
    if (lang === 'rust') nodes.push(parseRust(f, text, metrics));
    else if (lang === 'ts' || lang === 'tsx' || lang === 'js' || lang === 'jsx')
      nodes.push(parseTs(f, text, metrics));
  }

  // Basic hotspot scoring
  for (const n of nodes) {
    const reasons: string[] = [];
    let score = 0;
    if (n.metrics.loc > 800) {
      score += 40;
      reasons.push(`Large file: ${n.metrics.loc} LOC`);
    } else if (n.metrics.loc > 400) {
      score += 25;
      reasons.push(`Medium-large file: ${n.metrics.loc} LOC`);
    }
    const todos = n.signals.todos.length;
    if (todos > 5) {
      score += 20;
      reasons.push(`Many TODO/FIXME: ${todos}`);
    } else if (todos > 0) {
      score += 10;
      reasons.push(`Some TODO/FIXME: ${todos}`);
    }
    const unsafes = n.signals.unsafe.length;
    if (unsafes > 0) {
      score += 25;
      reasons.push(`Uses unsafe (${unsafes})`);
    }
    const integrations =
      n.signals.db.length + n.signals.http.length + n.signals.llm.length + n.signals.observability.length;
    if (integrations > 10) {
      score += 15;
      reasons.push(`High integration surface: ${integrations}`);
    } else if (integrations > 0) {
      score += 5;
      reasons.push(`Integration surface: ${integrations}`);
    }
    if (score > 0) n.hotspot = { score: Math.min(score, 100), reasons };
  }

  const map: ArchitectureMap = {
    root,
    generatedAt: new Date().toISOString(),
    files: nodes,
    edges: await toEdges(nodes, root),
  };

  const outJson = path.join(root, 'architecture.map.json');
  await writeText(outJson, JSON.stringify(map, null, 2));

  // Emit minimal markdown summary next to existing ARCHITECTURE.md if present
  const mdOut = path.join(root, 'ARCHITECTURE.scanner.md');
  const topHotspots = nodes
    .filter((n) => n.hotspot)
    .sort((a, b) => (b.hotspot!.score - a.hotspot!.score))
    .slice(0, 10)
    .map((n) => `- ${n.path} (score ${n.hotspot!.score})`)
    .join('\n');

  // Integration summary
  const integrationCounts = { db: 0, http: 0, llm: 0, observability: 0 };
  for (const n of nodes) {
    if (n.signals.db.length > 0) integrationCounts.db++;
    if (n.signals.http.length > 0) integrationCounts.http++;
    if (n.signals.llm.length > 0) integrationCounts.llm++;
    if (n.signals.observability.length > 0) integrationCounts.observability++;
  }

  // Security hotspots summary
  const securityHotspots = nodes.flatMap((n) =>
    n.signals.security_hotspots?.map((h) => ({ ...h, file: n.path })) || []
  );
  const securityBySeverity = {
    critical: securityHotspots.filter((h) => h.severity === 'critical'),
    high: securityHotspots.filter((h) => h.severity === 'high'),
    medium: securityHotspots.filter((h) => h.severity === 'medium'),
  };

  // Performance hotspots summary
  const performanceHotspots = nodes.flatMap((n) =>
    n.signals.performance_hotspots?.map((h) => ({ ...h, file: n.path })) || []
  );
  const performanceBySeverity = {
    high: performanceHotspots.filter((h) => h.severity === 'high'),
    medium: performanceHotspots.filter((h) => h.severity === 'medium'),
    low: performanceHotspots.filter((h) => h.severity === 'low'),
  };

  // Confidence scoring
  const allDetections = [...securityHotspots, ...performanceHotspots];
  const avgConfidence = allDetections.length > 0
    ? allDetections.reduce((sum, h) => sum + h.confidence, 0) / allDetections.length
    : 0;

  // ============================================================================
  // SAPE AUDIT-GRADE QUALITY ASSESSMENT v2.0
  // ============================================================================

  console.log(`🔍 SAPE Analysis: ${securityHotspots.length} security hotspots, ${performanceHotspots.length} performance bottlenecks detected`);

  // Generate quality grade using Principal Audit methodology
  const gradeCalculator = new QualityGradeCalculator();
  const qualityGrade = gradeCalculator.calculateGrade(securityHotspots, performanceHotspots);

  console.log(`📊 Quality Grade: ${qualityGrade.overall.letter} (${qualityGrade.overall.score}/100) - ${qualityGrade.risk_level} risk`);

  // Generate professional audit report
  const auditGenerator = new AuditReportGenerator();
  const fullAuditReport = auditGenerator.generatePrincipalAudit(securityHotspots, performanceHotspots, qualityGrade, root);

  // Save the professional audit report
  const auditOut = path.join(root, 'AUDIT_PRINCIPAL_TECHNICAL_v3.md');
  await writeText(auditOut, fullAuditReport);

  console.log(`📋 Principal Technical Audit v3 generated: ${auditOut}`);

  // Format security section
  const formatSecurityIssues = (issues: any[], label: string) => {
    if (issues.length === 0) return '';
    return `### ${label} Severity (${issues.length})\n\n${issues
      .slice(0, 10)
      .map((h) => {
        const relPath = path.relative(root, h.file);
        return `- **${h.type}** in \`${relPath}:${h.evidence.line}\`\n  - Risk: ${h.risk}\n  - Confidence: ${h.confidence}%\n  - Evidence: \`${h.evidence.snippet.substring(0, 80)}...\``;
      })
      .join('\n')}\n${issues.length > 10 ? `\n_...and ${issues.length - 10} more_\n` : ''}\n`;
  };

  // Format performance section
  const formatPerformanceIssues = (issues: any[], label: string) => {
    if (issues.length === 0) return '';
    return `### ${label} Severity (${issues.length})\n\n${issues
      .slice(0, 10)
      .map((h) => {
        const relPath = path.relative(root, h.file);
        return `- **${h.type}** in \`${relPath}:${h.evidence.line}\`\n  - Impact: ${h.impact}\n  - Confidence: ${h.confidence}%\n  - Evidence: \`${h.evidence.snippet.substring(0, 80)}...\``;
      })
      .join('\n')}\n${issues.length > 10 ? `\n_...and ${issues.length - 10} more_\n` : ''}\n`;
  };

  const securitySection = `## 🔒 Security Hotspots

**Total Detected:** ${securityHotspots.length}
**Average Confidence:** ${avgConfidence.toFixed(1)}%

${formatSecurityIssues(securityBySeverity.critical, 'Critical')}
${formatSecurityIssues(securityBySeverity.high, 'High')}
${formatSecurityIssues(securityBySeverity.medium, 'Medium')}

${securityHotspots.length === 0 ? '_No security hotspots detected._\n' : ''}`;

  const performanceSection = `## ⚡ Performance Bottlenecks

**Total Detected:** ${performanceHotspots.length}

${formatPerformanceIssues(performanceBySeverity.high, 'High')}
${formatPerformanceIssues(performanceBySeverity.medium, 'Medium')}
${formatPerformanceIssues(performanceBySeverity.low, 'Low')}

${performanceHotspots.length === 0 ? '_No performance bottlenecks detected._\n' : ''}`;

  const summary = `# Architecture Scanner Summary

- Files scanned: ${nodes.length}
- Generated: ${map.generatedAt}

${securitySection}

${performanceSection}

## Integration Surface

- Database: ${integrationCounts.db} files
- HTTP/WebSocket: ${integrationCounts.http} files
- LLM/AI: ${integrationCounts.llm} files
- Observability: ${integrationCounts.observability} files

## Hotspots (Top 10)

${topHotspots || '- None detected'}

---

**Audit Quality Metrics:**
- Overall Confidence: ${avgConfidence.toFixed(1)}%
- False Positive Estimate: <${(100 - avgConfidence).toFixed(1)}%
- Total Patterns: 21 audit-grade detection rules (13 security + 8 performance)
`;
  await writeText(mdOut, summary);

  // eslint-disable-next-line no-console
  console.log(`Architecture map written: ${outJson}`);
  console.log(`Markdown summary written: ${mdOut}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
