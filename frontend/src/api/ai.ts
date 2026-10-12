/**
 * AI / automation APIs — verified backend contracts only.
 *
 *  - POST /ai/chat                  -> { conversationId, answer } (mock model;
 *                                      sanitizes prompt injection, order-ownership check)
 *  - POST /seller/ai/analytics      -> { metrics, explanation, evidence } (OWNER/STAFF)
 *  - GET  /seller/ai/usage          -> AIUsageRecord[]
 *  - GET  /seller/ai/knowledge      -> KnowledgeDocument[] (active only)
 *  - POST /seller/ai/knowledge      -> create doc (prompt-injection rejected)
 *  - DELETE /seller/ai/knowledge/:id -> soft-delete
 *  - POST /seller/ai/provider/analyze -> { documentationId, proposalId, state }
 *  - GET  /seller/ai/workflows      -> AIWorkflow[]
 *  - GET  /seller/ai/workflows/:id  -> AIWorkflow + steps
 *
 * The AI model is MOCK only (MockAIProvider) — every AI surface is labeled as
 * such and never claims production behavior.
 */
import { api } from './client';

export interface ChatResponse {
  conversationId: string;
  answer: string;
}

export interface AIAnalyticsResponse {
  metrics: {
    orderCount: number;
    successfulOrders: number;
    revenueMinor: number;
    estimatedGrossProfitMinor: number;
    evidenceOrderIds: number[];
  };
  explanation: string;
  evidence: number[];
}

export interface AIUsageRecord {
  id: string;
  tenantId: string;
  userId?: string | null;
  model: string;
  workflow: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  status: string;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderAnalyzeResponse {
  documentationId: string;
  proposalId: string;
  state: string;
}

export interface AIWorkflow {
  id: string;
  tenantId: string;
  type: string;
  state: string;
  errorMessage?: string | null;
  createdAt: string;
}

export function aiChat(input: { message: string; conversationId?: string; orderId?: string }) {
  return api.post<ChatResponse>('/ai/chat', input);
}

export function aiAnalytics() {
  return api.post<AIAnalyticsResponse>('/seller/ai/analytics');
}

export function aiUsage() {
  return api.get<AIUsageRecord[]>('/seller/ai/usage');
}

export function aiKnowledge() {
  return api.get<KnowledgeDocument[]>('/seller/ai/knowledge');
}

export function aiCreateKnowledge(input: { title: string; source: string; content: string }) {
  return api.post<{ id: string; title: string; chunkCount: number }>('/seller/ai/knowledge', input);
}

export function aiDeleteKnowledge(id: string) {
  return api.del<{ success: boolean }>(`/seller/ai/knowledge/${id}`);
}

export function aiAnalyzeProvider(input: { sourceUrl: string; content: string }) {
  return api.post<ProviderAnalyzeResponse>('/seller/ai/provider/analyze', input);
}

export function aiWorkflows() {
  return api.get<AIWorkflow[]>('/seller/ai/workflows');
}
