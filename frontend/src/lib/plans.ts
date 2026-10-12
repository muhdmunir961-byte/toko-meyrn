/**
 * Subscription plans — sourced from the verified backend seed
 * (`backend/prisma/seed.ts`), which upserts exactly four plans by `name` with
 * `monthlyPriceMinor` (integer IDR minor units):
 *
 *   Free      -> 0
 *   Starter   -> 1_000_000   (Rp 10.000 / mo)
 *   Pro       -> 2_500_000   (Rp 25.000 / mo)
 *   Business  -> 5_000_000   (Rp 50.000 / mo)
 *
 * The admin endpoint `GET /api/v1/admin/subscription/plans` is SUPER_ADMIN-only,
 * so a public landing page cannot fetch it — these values are mirrored here and
 * MUST be kept in sync with the seed. `PlanEntitlement` rows are NOT seeded, so
 * the per-plan feature lists below are illustrative (preview) and clearly
 * labeled as such in the UI, not claimed as enforced entitlements.
 */
import { formatIDR } from './money';

export interface Plan {
  id: string;
  name: string;
  monthlyPriceMinor: number;
  blurb: string;
  /** Illustrative — entitlements are not seeded in the backend yet. */
  highlights: string[];
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPriceMinor: 0,
    blurb: 'Launch a storefront and take your first top-up orders.',
    highlights: ['1 storefront', 'Orders & catalog', 'Mock checkout'],
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPriceMinor: 1_000_000,
    blurb: 'For solo sellers growing a real top-up business.',
    highlights: [
      'Everything in Free',
      'Reseller commissions',
      'WhatsApp notifications',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPriceMinor: 2_500_000,
    blurb: 'Multi-channel sellers with routing and analytics.',
    highlights: [
      'Everything in Starter',
      'Smart provider routing',
      'Advanced analytics',
    ],
    featured: true,
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPriceMinor: 5_000_000,
    blurb: 'For teams and networks operating at scale.',
    highlights: ['Everything in Pro', 'AI Studio & workflows', 'Custom domains'],
  },
];

export function formatPlanPrice(minor: number): string {
  return minor === 0 ? 'Free' : formatIDR(minor);
}
