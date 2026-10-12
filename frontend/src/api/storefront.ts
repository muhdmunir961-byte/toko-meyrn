/**
 * Public storefront APIs — verified backend contracts only.
 *
 *  - GET  /storefront/:slug            -> { id, name, tenant }
 *  - GET  /storefront/:slug/products   -> SellerProduct[] (server-priced)
 *  - GET  /public/store/:slug/branding -> sanitized branding | 404
 *  - POST /orders                      -> create order (JWT + Idempotency-Key),
 *                                         server computes authoritative prices
 *  - POST /orders/:id/mock-payment     -> advance to SUCCESS (MOCK gateway only)
 *
 * TENANT RESOLUTION: the backend resolves stores by SLUG path param, NOT by
 * host header. Custom-domain (host) resolution is defined in the backend
 * `domain.ts` but NOT wired to any handler — so this storefront is slug-scoped
 * and clearly documents that host-based white-labeling is a backend gap.
 *
 * Hard gaps (NOT implemented, never invented):
 *  - No player-id/target field in the order contract.
 *  - No denomination, stock, or payment-method endpoints (MOCK gateway only).
 *  - No REFUNDED state and no refund endpoint.
 *  - No customer-facing GET /orders/:id (transaction lookup is client-tracked).
 */
import { api } from './client';

export interface StorefrontInfo {
  id: string;
  name: string;
  tenant: string;
}

export interface MasterProduct {
  id: string;
  name: string;
  sku: string;
  costMinor: number;
  categoryId: string;
}

export interface SellerProduct {
  id: string;
  tenantId: string;
  masterProductId: string;
  active: boolean;
  manualPriceMinor?: number | null;
  markupType?: 'FIXED' | 'PERCENTAGE' | 'MANUAL' | null;
  markupValue?: number | null;
  masterProduct: MasterProduct;
}

export interface PublicBranding {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  theme?: Record<string, unknown> | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPriceMinor: number;
  costMinor: number;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  providerReference?: string | null;
}

export interface ProviderTransaction {
  id: string;
  orderId: string;
  status: string;
  providerReference?: string | null;
}

export interface Order {
  id: string;
  tenantId: string;
  customerId: string;
  status: string;
  totalMinor: number;
  currency: string;
  idempotencyKey: string;
  items: OrderItem[];
  payment?: OrderPayment | null;
  providerTransaction?: ProviderTransaction | null;
}

export function getStorefront(slug: string) {
  return api.get<StorefrontInfo>(`/storefront/${encodeURIComponent(slug)}`);
}

export function getStorefrontProducts(slug: string) {
  return api.get<SellerProduct[]>(`/storefront/${encodeURIComponent(slug)}/products`);
}

export function getPublicBranding(slug: string) {
  return api.get<PublicBranding>(`/public/store/${encodeURIComponent(slug)}/branding`);
}

export function createOrder(input: {
  items: { productId: string; quantity: number }[];
  idempotencyKey: string;
}) {
  return api.post<Order>('/orders', { items: input.items }, {
    idempotencyKey: input.idempotencyKey,
  });
}

export function mockPayOrder(orderId: string) {
  return api.post<Order>(`/orders/${encodeURIComponent(orderId)}/mock-payment`);
}

/* ============================ Display helpers ============================ */

/**
 * The order endpoint prices each item as
 * `manualPriceMinor ?? costMinor + (markupValue ?? 0)`. We surface the SAME
 * server-provided fields for display, but the authoritative total is always the
 * value returned by `POST /orders` — never a client recomputation.
 */
export function listedPriceMinor(p: SellerProduct): number {
  if (p.manualPriceMinor != null) return p.manualPriceMinor;
  return p.masterProduct.costMinor + (p.markupValue ?? 0);
}

export type PaymentView = 'pending' | 'paid' | 'failed' | 'expired';
export type FulfillmentView =
  | 'awaiting_payment'
  | 'payment_confirmed'
  | 'queued'
  | 'processing'
  | 'fulfilled'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'manual_review'
  | 'unknown';

/** Map backend Payment.status to a user-facing payment state. */
export function paymentView(status: string | null | undefined): PaymentView {
  switch (status) {
    case 'CONFIRMED':
      return 'paid';
    case 'FAILED':
      return 'failed';
    case 'EXPIRED':
      return 'expired';
    default:
      return 'pending';
  }
}

/** Map backend Order.status to a user-facing fulfillment state. */
export function fulfillmentView(status: string | null | undefined): FulfillmentView {
  switch (status) {
    case 'AWAITING_PAYMENT':
      return 'awaiting_payment';
    case 'PAYMENT_CONFIRMED':
      return 'payment_confirmed';
    case 'QUEUED':
      return 'queued';
    case 'PROCESSING':
      return 'processing';
    case 'SUCCESS':
      return 'fulfilled';
    case 'FAILED':
      return 'failed';
    case 'EXPIRED':
      return 'expired';
    case 'CANCELLED':
      return 'cancelled';
    case 'MANUAL_REVIEW':
      return 'manual_review';
    default:
      return 'unknown';
  }
}
