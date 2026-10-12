// Immutable, idempotent commission ledger. Commission is earned only from
// confirmed (eligible) transactions — never from a bare payment callback.

export type CommissionState = 'PENDING' | 'ELIGIBLE' | 'APPROVED' | 'SETTLED' | 'REVERSED' | 'CANCELLED' | 'DISPUTED';

export const commissionTransitions: Record<CommissionState, CommissionState[]> = {
  PENDING: ['ELIGIBLE', 'CANCELLED'],
  ELIGIBLE: ['APPROVED', 'CANCELLED', 'DISPUTED'],
  APPROVED: ['SETTLED', 'REVERSED', 'DISPUTED'],
  SETTLED: ['REVERSED', 'DISPUTED'],
  REVERSED: [],
  CANCELLED: [],
  DISPUTED: ['APPROVED', 'CANCELLED', 'REVERSED'],
};

export function canTransition(from: CommissionState, to: CommissionState): boolean {
  return (commissionTransitions[from] ?? []).includes(to);
}

export function calculateCommission(eligibleAmountMinor: number, rateBps: number, type: 'FIXED' | 'PERCENTAGE', fixedMinor = 0): number {
  if (eligibleAmountMinor < 0) return 0;
  if (type === 'FIXED') return Math.min(fixedMinor, eligibleAmountMinor);
  return Math.round((eligibleAmountMinor * rateBps) / 10000);
}

// Eligibility requires authoritative payment confirmation AND successful fulfillment.
export function isEligible(paymentConfirmed: boolean, fulfillmentSucceeded: boolean): boolean {
  return paymentConfirmed && fulfillmentSucceeded;
}

// Ledger entries are append-only; this produces a deterministic balance from history.
export function ledgerBalance(entries: { kind: string; amountMinor: number }[]): number {
  return entries.reduce((sum, e) => (e.kind === 'REVERSAL' || e.kind === 'CANCELLATION' ? sum - e.amountMinor : sum + e.amountMinor), 0);
}