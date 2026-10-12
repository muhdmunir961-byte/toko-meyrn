// Rule-based risk engine. Scores never auto-block without human review.

export type RiskAction = 'ALLOW' | 'FLAG' | 'REQUIRE_REVIEW' | 'BLOCK';
export type RiskCategory = 'PAYMENT_ATTEMPT' | 'DUPLICATE_ORDER' | 'ORDER_FREQUENCY' | 'TRANSACTION_BURST' | 'API_KEY_ACTIVITY' | 'WEBHOOK_FAILURE' | 'PROVIDER_ANOMALY' | 'RESELLER_PATTERN';

export type RiskSignal = { category: RiskCategory; value: number };
export type RiskRule = { category: RiskCategory; threshold: number; action: RiskAction };

export function evaluateRisk(signals: RiskSignal[], rules: RiskRule[]): { score: number; action: RiskAction; triggered: RiskCategory[] } {
  let score = 0;
  const triggered: RiskCategory[] = [];
  let worst: RiskAction = 'ALLOW';
  const severity: Record<RiskAction, number> = { ALLOW: 0, FLAG: 1, REQUIRE_REVIEW: 2, BLOCK: 3 };
  for (const signal of signals) {
    const rule = rules.find(r => r.category === signal.category);
    if (rule && signal.value >= rule.threshold) {
      triggered.push(signal.category);
      score += signal.value;
      if (severity[rule.action] > severity[worst]) worst = rule.action;
    }
  }
  // Never auto-block on score alone; a BLOCK requires an explicit matching rule.
  return { score, action: worst, triggered };
}

export function isReviewable(action: RiskAction): boolean {
  return action === 'FLAG' || action === 'REQUIRE_REVIEW' || action === 'BLOCK';
}