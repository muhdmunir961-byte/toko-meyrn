/**
 * Seller + storefront APIs — verified backend contracts only.
 *
 *  - GET  /storefront/:slug            -> { id, name, tenant }
 *  - GET  /seller/branding             -> StoreBranding | 404
 *  - PATCH /seller/branding            -> upsert branding (needs storeId)
 *  - GET  /seller/providers            -> ProviderConfiguration[]
 *  - POST /seller/providers            -> create provider (MOCK | DIGIFLAZZ)
 *  - POST /seller/providers/:id/test   -> { ok, message? }
 *  - GET  /seller/whatsapp             -> WhatsAppIntegration[]
 *  - POST /seller/whatsapp             -> upsert integration (MOCK | OFFICIAL)
 *  - GET  /seller/domains              -> StoreDomain[]
 *
 * Confirmed gaps — NOT wired (no endpoint exists):
 *  - No seller-facing subscription/plan read (plans endpoint is SUPER_ADMIN only).
 *  - No payment-gateway configuration endpoint.
 *  - No slug-availability endpoint.
 */
import { api } from './client';

export interface StorefrontInfo {
  id: string;
  name: string;
  tenant: string;
}

export interface Branding {
  id?: string;
  storeId: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  theme?: Record<string, unknown> | null;
}

export interface ProviderConfig {
  id: string;
  providerType: string;
  label: string;
  enabled: boolean;
  priority: number;
  health?: { status: string; failureCount: number; lastCheckedAt?: string } | null;
}

export interface WhatsAppIntegration {
  id: string;
  connectionType: string;
  enabled: boolean;
}

export function getStorefront(slug: string) {
  return api.get<StorefrontInfo>(`/storefront/${encodeURIComponent(slug)}`);
}

export function getBranding() {
  return api.get<Branding>('/seller/branding');
}

export function saveBranding(input: Branding) {
  return api.patch<Branding>('/seller/branding', input);
}

export function listProviders() {
  return api.get<ProviderConfig[]>('/seller/providers');
}

export function createProvider(input: {
  providerType: string;
  label: string;
  enabled?: boolean;
  priority?: number;
}) {
  return api.post<ProviderConfig>('/seller/providers', input);
}

export function testProvider(id: string) {
  return api.post<{ ok: boolean; message?: string }>(`/seller/providers/${id}/test`);
}

export function listWhatsApp() {
  return api.get<WhatsAppIntegration[]>('/seller/whatsapp');
}

export function upsertWhatsApp(input: { connectionType: string; enabled: boolean }) {
  return api.post<WhatsAppIntegration>('/seller/whatsapp', input);
}

/* ============================ Products (seller catalog) ============================ */

export interface MasterProductRef {
  id: string;
  name: string;
  sku: string;
  costMinor: number;
  categoryId: string;
}

export interface SellerProductWithMaster {
  id: string;
  tenantId: string;
  masterProductId: string;
  active: boolean;
  manualPriceMinor?: number | null;
  markupType?: 'FIXED' | 'PERCENTAGE' | 'MANUAL' | null;
  markupValue?: number | null;
  masterProduct: MasterProductRef;
}

export function listProducts() {
  return api.get<SellerProductWithMaster[]>('/seller/products');
}

export function createProduct(input: {
  masterProductId: string;
  manualPriceMinor?: number;
  markupType?: 'FIXED' | 'PERCENTAGE' | 'MANUAL';
  markupValue?: number;
}) {
  return api.post<SellerProductWithMaster>('/seller/products', input);
}

/* ============================ Analytics ============================ */

export interface AnalyticsSummary {
  grossSalesMinor: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  providerCostMinor: number;
  sellerMarkupMinor: number;
  resellerCommissionMinor: number;
  grossProfitMinor: number;
  averageTransactionValueMinor: number;
  repeatPurchaseRate: number;
  platformRevenueMinor: number;
  sellerRevenueMinor: number;
}

export interface ProductAnalytics {
  productId: string;
  qty: number;
  revenue: number;
}

export interface ProviderAnalytics {
  id: string;
  providerType: string;
  label: string;
  enabled: boolean;
  health: { status: string; failureCount: number; lastCheckedAt?: string } | null;
}

export interface ResellerAnalytics {
  id: string;
  name: string;
  email: string;
  status: string;
  settledCommissionMinor: number;
}

export function getAnalytics() {
  return api.get<AnalyticsSummary>('/seller/analytics/advanced');
}

export function getProductAnalytics() {
  return api.get<ProductAnalytics[]>('/seller/analytics/products');
}

export function getProviderAnalytics() {
  return api.get<ProviderAnalytics[]>('/seller/analytics/providers');
}

export function getResellerAnalytics() {
  return api.get<ResellerAnalytics[]>('/seller/analytics/resellers');
}

/* ============================ Orders ============================ */

export interface SellerOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPriceMinor: number;
  costMinor: number;
}

export interface SellerOrder {
  id: string;
  tenantId: string;
  customerId: string | null;
  resellerId: string | null;
  status: string;
  totalMinor: number;
  currency: string;
  idempotencyKey: string;
  createdAt: string;
  items: SellerOrderItem[];
  payment: { id: string; orderId: string; status: string; providerReference?: string | null } | null;
}

export function listOrders() {
  return api.get<SellerOrder[]>('/seller/orders');
}

/* ============================ Pricing ============================ */

export interface SellerPricingRule {
  id: string;
  tenantId: string;
  markupType: 'FIXED' | 'PERCENTAGE' | 'MANUAL';
  markupValue: number;
}

export interface PricePreview {
  finalPriceMinor: number;
  appliedRule: string;
  components: Record<string, number>;
}

export function listPricingRules() {
  return api.get<SellerPricingRule[]>('/seller/pricing/rules');
}

export function createPricingRule(input: { markupType: string; markupValue: number }) {
  return api.post<SellerPricingRule>('/seller/pricing/rules', input);
}

export function previewPrice(input: { masterProductId: string; resellerId?: string }) {
  return api.post<PricePreview>('/seller/pricing/preview', input);
}

/* ============================ Providers & routing ============================ */

export interface RoutingPolicy {
  id: string;
  tenantId: string;
  strategy: string;
  masterProductId?: string | null;
  weights?: Record<string, number> | null;
  maintenanceMode?: boolean;
}

export function getRoutingPolicies() {
  return api.get<RoutingPolicy[]>('/seller/routing');
}

export function updateRoutingPolicy(input: {
  strategy?: string;
  weights?: Record<string, number>;
  maintenanceMode?: boolean;
}) {
  return api.patch<RoutingPolicy>('/seller/routing', input);
}

export function getRoutingHealth() {
  return api.get<{ id: string; providerType: string; enabled: boolean; priority: number; health: string; failureCount: number }[]>('/seller/routing/health');
}

export function testProviderConnection(id: string) {
  return api.post<{ ok: boolean; message?: string }>(`/seller/providers/${id}/test`);
}

export function syncProvider(id: string) {
  return api.post<{ accepted: boolean; jobId: string }>(`/seller/providers/${id}/sync`);
}

/* ============================ Domains ============================ */

export interface StoreDomain {
  id: string;
  tenantId: string;
  storeId: string;
  domain: string;
  state: string;
  verifiedAt?: string | null;
  sslCertificateIssued?: boolean;
  sslIssuedAt?: string | null;
  healthStatus?: string | null;
}

export function listDomains() {
  return api.get<StoreDomain[]>('/seller/domains');
}

export function createDomain(input: { storeId: string; domain: string }) {
  return api.post<StoreDomain>('/seller/domains', input);
}

export function verifyDomain(id: string) {
  return api.post<StoreDomain>(`/seller/domains/${id}/verify`);
}

export function removeDomain(id: string) {
  return api.del<{ success: boolean }>(`/seller/domains/${id}`);
}

/* ============================ Resellers ============================ */

export interface Reseller {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  parentId: string | null;
  commissionRateBps: number;
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
}

export function listResellers() {
  return api.get<Reseller[]>('/seller/resellers');
}

export function createReseller(input: {
  email: string;
  name: string;
  parentId?: string;
  commissionRateBps?: number;
}) {
  return api.post<Reseller>('/seller/resellers', input);
}

export function updateReseller(id: string, input: { name?: string; status?: 'ACTIVE' | 'SUSPENDED'; commissionRateBps?: number; parentId?: string | null }) {
  return api.patch<Reseller>(`/seller/resellers/${id}`, input);
}

export function suspendReseller(id: string) {
  return api.post<{ success: boolean }>(`/seller/resellers/${id}/suspend`);
}

/* ============================ API keys ============================ */

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  expiresAt?: string | null;
}

export function createApiKey(input: { name: string; scopes?: string[]; expiresAt?: string }) {
  return api.post<ApiKey>('/seller/api-keys', input);
}

export function revokeApiKey(id: string) {
  return api.del<{ success: boolean }>(`/seller/api-keys/${id}`);
}

/* ============================ Webhook deliveries ============================ */

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventId: string;
  status: string;
  attemptCount: number;
  lastError?: string | null;
  deliveredAt?: string | null;
  event: { id: string; eventType: string; payload: unknown };
}

export function listWebhookDeliveries() {
  return api.get<WebhookDelivery[]>('/seller/webhook-deliveries');
}

export function replayWebhookDelivery(id: string) {
  return api.post<{ accepted: boolean; jobId: string }>(`/seller/webhook-deliveries/${id}/replay`);
}



