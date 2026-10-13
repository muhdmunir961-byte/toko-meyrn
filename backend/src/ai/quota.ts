export type Quota = { tokenLimit: number; requestLimit: number; tokensReserved: number; requestsUsed: number };
// `tokenLimit` is the maximum size of a SINGLE reservation (per-request cap), while
// `requestLimit` bounds the number of requests. `tokensReserved` accumulates outstanding
// reservations and is settled via `settleQuota`. A request whose own size exceeds the
// per-request cap is rejected before it can reserve anything.
export function reserveQuota(quota: Quota, requestedTokens: number): Quota { if (requestedTokens < 0 || requestedTokens > quota.tokenLimit || quota.requestsUsed + 1 > quota.requestLimit) throw new Error('AI quota exceeded'); return { ...quota, tokensReserved: quota.tokensReserved + requestedTokens, requestsUsed: quota.requestsUsed + 1 }; }
export function settleQuota(quota: Quota, reserved: number, actual: number): Quota { void actual; return { ...quota, tokensReserved: Math.max(0, quota.tokensReserved - reserved), requestsUsed: quota.requestsUsed }; }