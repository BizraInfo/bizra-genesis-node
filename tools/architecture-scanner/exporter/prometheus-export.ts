import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = parseInt(process.env.PORT || '9109', 10);
const HOST = process.env.HOST || '0.0.0.0';

const ROOT = path.resolve(__dirname, '..');
const MAP_JSON = path.join(ROOT, 'architecture.map.json');
const SCANNER_MD = path.join(ROOT, 'ARCHITECTURE.scanner.md');

function countFromJson(): { securityCritical: number; perfCritical: number } | null {
  try {
    const raw = fs.readFileSync(MAP_JSON, 'utf8');
    const data = JSON.parse(raw);
    let securityCritical = 0;
    let perfCritical = 0;
    if (Array.isArray(data.files)) {
      for (const f of data.files) {
        const signals = f.signals || {};
        const sec = signals.security || signals.hotspots || signals.risks;
        const perf = signals.performance || signals.bottlenecks;
        if (Array.isArray(sec)) {
          securityCritical += sec.filter((s: any) => (s.severity || '').toLowerCase() === 'critical').length;
        }
        if (Array.isArray(perf)) {
          perfCritical += perf.filter((p: any) => (p.severity || '').toLowerCase() === 'critical').length;
        }
      }
    }
    // Fallback totals if provided
    if (data.metrics) {
      if (typeof data.metrics.securityCritical === 'number') securityCritical = data.metrics.securityCritical;
      if (typeof data.metrics.perfCritical === 'number') perfCritical = data.metrics.perfCritical;
    }
    return { securityCritical, perfCritical };
  } catch (err) {
    return null;
  }
}

function countFromMarkdown(): { securityCritical: number; perfCritical: number } | null {
  try {
    const md = fs.readFileSync(SCANNER_MD, 'utf8');
    // Naive extraction: look for lines like "Critical Security Hotspots: N" and "Critical Performance Bottlenecks: N"
    const secMatch = md.match(/Critical\s+Security\s+Hotspots\s*:\s*(\d+)/i);
    const perfMatch = md.match(/Critical\s+Performance\s+Bottlenecks\s*:\s*(\d+)/i);
    const securityCritical = secMatch ? parseInt(secMatch[1], 10) : 0;
    const perfCritical = perfMatch ? parseInt(perfMatch[1], 10) : 0;
    return { securityCritical, perfCritical };
  } catch (err) {
    return null;
  }
}

function renderMetrics(counts: { securityCritical: number; perfCritical: number }) {
  const lines = [
    `# HELP scanner_security_hotspots_total Count of critical security hotspots detected by architecture scanner`,
    `# TYPE scanner_security_hotspots_total gauge`,
    `scanner_security_hotspots_total{severity="critical"} ${counts.securityCritical}`,
    `# HELP scanner_performance_bottlenecks_total Count of critical performance bottlenecks detected by architecture scanner`,
    `# TYPE scanner_performance_bottlenecks_total gauge`,
    `scanner_performance_bottlenecks_total{severity="critical"} ${counts.perfCritical}`,
  ];
  return lines.join('\n') + '\n';
}

function getCounts(): { securityCritical: number; perfCritical: number } {
  return (
    countFromJson() ||
    countFromMarkdown() || { securityCritical: 0, perfCritical: 0 }
  );
}

const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    const counts = getCounts();
    const body = renderMetrics(counts);
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
    res.end(body);
    return;
  }
  if (req.url === '/health') {
    const ok = !!(countFromJson() || countFromMarkdown());
    res.writeHead(ok ? 200 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', source: ok ? 'scanner' : 'empty' }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Scanner Prometheus exporter listening on http://${HOST}:${PORT}`);
});
