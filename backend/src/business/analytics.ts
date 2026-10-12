// Deterministic analytics aggregation. Financial ownership is kept distinct:
// platform subscription revenue is NEVER merged with seller GMV.

export type OrderRow = {
  status: string;
  totalMinor: number;
  costMinor: number;
  sellerMarkupMinor: number;
  resellerCommissionMinor: number;
  createdAt: Date;
  customerId?: string;
};

export type AnalyticsInput = {
  orders: OrderRow[];
  subscriptionRevenueMinor: number;
};

export function aggregateAnalytics(input: AnalyticsInput) {
  const orders = input.orders;
  const successful = orders.filter(o => o.status === 'SUCCESS');
  const failed = orders.filter(o => o.status === 'FAILED');
  const pending = orders.filter(o => ['CREATED', 'AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'QUEUED', 'PROCESSING'].includes(o.status));

  const gmvMinor = successful.reduce((n, o) => n + o.totalMinor, 0);
  const providerCostMinor = successful.reduce((n, o) => n + o.costMinor, 0);
  const sellerMarkupMinor = successful.reduce((n, o) => n + o.sellerMarkupMinor, 0);
  const resellerCommissionMinor = successful.reduce((n, o) => n + o.resellerCommissionMinor, 0);
  const grossProfitMinor = gmvMinor - providerCostMinor;

  const uniqueCustomers = new Set(successful.map(o => o.customerId).filter(Boolean) as string[]);
  const repeatCustomers = successful.reduce((acc, o) => { if (o.customerId) acc[o.customerId] = (acc[o.customerId] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const repeatCount = Object.values(repeatCustomers).filter(n => n > 1).length;

  return {
    grossSalesMinor: gmvMinor,
    successfulTransactions: successful.length,
    failedTransactions: failed.length,
    pendingTransactions: pending.length,
    providerCostMinor,
    sellerMarkupMinor,
    resellerCommissionMinor,
    grossProfitMinor,
    averageTransactionValueMinor: successful.length ? Math.round(gmvMinor / successful.length) : 0,
    repeatPurchaseRate: uniqueCustomers.size ? repeatCount / uniqueCustomers.size : 0,
    // Distinct financial ownership:
    platformRevenueMinor: input.subscriptionRevenueMinor,
    sellerRevenueMinor: sellerMarkupMinor - resellerCommissionMinor,
  };
}