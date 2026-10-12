// Deterministic pricing engine. Precedence (highest first):
// 1. Reseller-specific override
// 2. Product-specific seller override
// 3. Promotional pricing
// 4. Category pricing
// 5. Default seller pricing
// All values are integer minor units (IDR). No floating point is used for money.

export type Markup = { type: 'FIXED' | 'PERCENTAGE' | 'MANUAL'; value: number };

export type PriceContext = {
  providerCostMinor: number;
  sellerDefault?: Markup;
  productOverride?: Markup;
  categoryMarkup?: Markup;
  promotional?: Markup & { active: boolean };
  resellerOverride?: Markup;
  minMarginMinor?: number;
};

export function applyMarkup(baseMinor: number, markup: Markup | undefined): number {
  if (!markup) return baseMinor;
  if (markup.type === 'MANUAL') return markup.value;
  if (markup.type === 'PERCENTAGE') return baseMinor + Math.round((baseMinor * markup.value) / 10000); // bps? use basis points
  return baseMinor + markup.value;
}

export function calculatePrice(ctx: PriceContext): { finalPriceMinor: number; appliedRule: string; components: Record<string, number> } {
  const cost = ctx.providerCostMinor;
  let price = cost;
  let appliedRule = 'default';

  if (ctx.resellerOverride) {
    price = applyMarkup(cost, ctx.resellerOverride);
    appliedRule = 'reseller';
  } else if (ctx.productOverride) {
    price = applyMarkup(cost, ctx.productOverride);
    appliedRule = 'product';
  } else if (ctx.promotional && ctx.promotional.active) {
    price = applyMarkup(cost, { type: ctx.promotional.type, value: ctx.promotional.value });
    appliedRule = 'promotional';
  } else if (ctx.categoryMarkup) {
    price = applyMarkup(cost, ctx.categoryMarkup);
    appliedRule = 'category';
  } else if (ctx.sellerDefault) {
    price = applyMarkup(cost, ctx.sellerDefault);
    appliedRule = 'default';
  }

  if (ctx.minMarginMinor != null && price - cost < ctx.minMarginMinor) {
    price = cost + ctx.minMarginMinor;
    appliedRule = 'min-margin';
  }

  return {
    finalPriceMinor: price,
    appliedRule,
    components: { providerCostMinor: cost, finalPriceMinor: price, marginMinor: price - cost },
  };
}

export function resellerPrice(parentPriceMinor: number, resellerMarkup: Markup | undefined): number {
  return applyMarkup(parentPriceMinor, resellerMarkup);
}