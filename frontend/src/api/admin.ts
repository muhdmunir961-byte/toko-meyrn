/**
 * Super-admin APIs — verified backend contracts only (all SUPER_ADMIN-gated).
 *
 *  - GET  /admin/fraud/events             -> FraudRiskEvent[] (latest 200)
 *  - POST /admin/fraud/events/:id/review  -> { success } (ALLOW|BLOCK)
 *  - GET  /admin/operations/health        -> { status, components: { database } }
 *  - GET  /admin/subscription/plans       -> SubscriptionPlan[] (+ entitlements)
 *  - PATCH /admin/subscription/plans/:id  -> update (price/active/name)
 *
 * CONFIRMED GAPS (no backend endpoint exists — must NOT be fabricated):
 *  - Tenant management, seller-account admin, billing/oversight, platform-wide
 *    order monitoring, provider health/routing (admin view), payment
 *    operations/alerts, audit-log explorer, backup status, feature flags.
 */
import { api } from './client';

export interface FraudReview {
  id: string;
  eventId: string;
  reviewerId: string;
  decision: string;
  reason?: string | null;
  createdAt: string;
}

export interface FraudRiskEvent {
  id: string;
  tenantId?: string | null;
  ruleId?: string | null;
  category: string;
  score: number;
  action: string;
  details: unknown;
  actorId?: string | null;
  orderId?: string | null;
  createdAt: string;
  reviews: FraudReview[];
}

export interface OperationsHealth {
  status: string;
  components: { database: string };
}

export interface PlanEntitlement {
  id: string;
  planId: string;
  feature: string;
  limit: number | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyPriceMinor: number;
  active: boolean;
  entitlements: PlanEntitlement[];
}

export function listFraudEvents() {
  return api.get<FraudRiskEvent[]>('/admin/fraud/events');
}

export function reviewFraudEvent(id: string, input: { decision: 'ALLOW' | 'BLOCK'; reason: string }) {
  return api.post<{ success: boolean }>(`/admin/fraud/events/${id}/review`, input);
}

export function getOperationsHealth() {
  return api.get<OperationsHealth>('/admin/operations/health');
}

export function listPlans() {
  return api.get<SubscriptionPlan[]>('/admin/subscription/plans');
}

export function updatePlan(id: string, input: { monthlyPriceMinor?: number; active?: boolean; name?: string }) {
  return api.patch<SubscriptionPlan>(`/admin/subscription/plans/${id}`, input);
}
