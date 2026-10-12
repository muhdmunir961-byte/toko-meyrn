// Deterministic weighted routing score. Weights are configurable and auditable.

export type RoutingCandidate = {
  id: string;
  enabled: boolean;
  maintenance: boolean;
  health: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  availability: number;   // 0..1
  reliability: number;    // 0..1 (higher = more reliable)
  costMinor?: number;
  latencyMs?: number;
  failureRateBps: number; // basis points of failures
};

export type RoutingWeights = { availability: number; reliability: number; cost: number; latency: number };

export const defaultWeights: RoutingWeights = { availability: 0.35, reliability: 0.3, cost: 0.2, latency: 0.15 };

function normalizeWeights(weights: RoutingWeights): RoutingWeights {
  const sum = weights.availability + weights.reliability + weights.cost + weights.latency;
  if (sum <= 0) return defaultWeights;
  return {
    availability: weights.availability / sum,
    reliability: weights.reliability / sum,
    cost: weights.cost / sum,
    latency: weights.latency / sum,
  };
}

export function scoreCandidate(candidate: RoutingCandidate, weights: RoutingWeights = defaultWeights): number {
  if (!candidate.enabled || candidate.maintenance || candidate.health === 'OPEN') return -Infinity;
  const w = normalizeWeights(weights);
  const healthPenalty = candidate.health === 'HALF_OPEN' ? 0.5 : 1;
  const costScore = candidate.costMinor != null ? 1 / (1 + candidate.costMinor) : 0;
  const latencyScore = candidate.latencyMs != null ? 1 / (1 + candidate.latencyMs) : 0;
  const reliability = Math.max(0, candidate.reliability - candidate.failureRateBps / 10000);
  return (
    w.availability * candidate.availability +
    w.reliability * Math.max(0, reliability) +
    w.cost * costScore +
    w.latency * latencyScore
  ) * healthPenalty;
}

export function chooseWeighted(candidates: RoutingCandidate[], weights: RoutingWeights = defaultWeights): RoutingCandidate | undefined {
  const scored = candidates.map(c => ({ c, score: scoreCandidate(c, weights) }));
  const usable = scored.filter(s => s.score !== -Infinity);
  if (!usable.length) return undefined;
  usable.sort((a, b) => b.score - a.score);
  return usable[0].c;
}