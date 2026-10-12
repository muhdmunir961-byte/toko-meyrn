import { z } from 'zod';
export type ToolContext = { tenantId: string; actorId: string; customerId?: string; role: 'OWNER'|'STAFF'|'CUSTOMER' };
export const toolNames = ['searchProducts','getProductDetails','getStoreInformation','getPublicFAQ','getOrderStatus','getPaymentStatus','getProviderStatus','createSupportTicket','escalateToHuman'] as const;
export type ToolName = typeof toolNames[number];
export const toolInput = z.object({ productId: z.string().optional(), query: z.string().max(200).optional(), orderId: z.string().optional(), reason: z.string().max(1000).optional() });
export function authorizeTool(name: ToolName, context: ToolContext, input: z.infer<typeof toolInput>) {
  if (['getOrderStatus','getPaymentStatus','getProviderStatus'].includes(name) && context.role === 'CUSTOMER' && (!context.customerId || !input.orderId)) throw new Error('verified order ownership is required');
  if (['createSupportTicket','escalateToHuman'].includes(name) && !context.actorId) throw new Error('authenticated actor is required');
  return true;
}
export function sanitizeAssistantInput(value: string) { return value.replace(/\b(ignore|disregard)\s+(all|previous)\s+instructions?\b/gi, '[untrusted instruction removed]').slice(0, 4000); }