// Minimal Prometheus-compatible metrics registry (no external dependency).
// Metrics are process-local, monotonically increasing where appropriate, and carry
// no secrets, PII, or tenant identifiers. Renders Prometheus text format 0.0.4.

type Sample = { labels: Record<string, string>; value: number };

interface MetricDef {
  name: string;
  help: string;
  type: 'counter' | 'gauge';
  samples: Sample[];
}

const metrics = new Map<string, MetricDef>();

function register(name: string, help: string, type: 'counter' | 'gauge'): MetricDef {
  let m = metrics.get(name);
  if (!m) {
    m = { name, help, type, samples: [] };
    metrics.set(name, m);
  }
  return m;
}

function findSample(m: MetricDef, labels: Record<string, string>): Sample | undefined {
  const keys = Object.keys(labels).sort();
  return m.samples.find((s) => {
    const sk = Object.keys(s.labels).sort();
    if (sk.length !== keys.length) return false;
    return keys.every((k) => s.labels[k] === labels[k]);
  });
}

export function incCounter(name: string, labels: Record<string, string> = {}, by = 1): void {
  const m = register(name, name, 'counter');
  const existing = findSample(m, labels);
  if (existing) existing.value += by;
  else m.samples.push({ labels: { ...labels }, value: by });
}

export function setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
  const m = register(name, name, 'gauge');
  const existing = findSample(m, labels);
  if (existing) existing.value = value;
  else m.samples.push({ labels: { ...labels }, value });
}

function escapeLabelValue(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function labelString(labels: Record<string, string>): string {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return '';
  return `{${entries.map(([k, v]) => `${k}="${escapeLabelValue(v)}"`).join(',')}}`;
}

export function renderMetrics(): string {
  const out: string[] = [];
  for (const m of metrics.values()) {
    out.push(`# HELP ${m.name} ${m.help}`);
    out.push(`# TYPE ${m.name} ${m.type}`);
    for (const s of m.samples) {
      out.push(`${m.name}${labelString(s.labels)} ${s.value}`);
    }
  }
  return out.join('\n') + '\n';
}