/**
 * Landing-page content model. Kept out of the component so the page remains
 * declarative and easy to audit. "Preview" flags mark content that is not yet
 * backed by a verified contract.
 */

export interface NavAnchor {
  id: string;
  label: string;
}

export const NAV_ANCHORS: NavAnchor[] = [
  { id: 'storefront', label: 'Storefront' },
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
];

export interface GameCover {
  title: string;
  tagline: string;
  gradient: string;
  glyph: string;
  priceMinor: number;
  /** e.g. "86 Diamonds", "60 UC" */
  denom: string;
  status: 'In stock' | 'Limited' | 'New';
}

/** Preview-only demo catalog — no live `/storefront` data is available. */
export const FEATURED_COVERS: GameCover[] = [
  {
    title: 'Mobile Legends',
    tagline: 'Diamonds & passes',
    gradient: 'linear-gradient(135deg, #3b227d 0%, #6f3fe0 60%, #9877ff 100%)',
    glyph: 'zap',
    priceMinor: 12000,
    denom: '86 Diamonds',
    status: 'In stock',
  },
  {
    title: 'Genshin Impact',
    tagline: 'Genesis Crystals',
    gradient: 'linear-gradient(135deg, #1f2a6b 0%, #3d5af1 60%, #60a5fa 100%)',
    glyph: 'star',
    priceMinor: 15000,
    denom: '60 Crystals',
    status: 'In stock',
  },
  {
    title: 'PUBG Mobile',
    tagline: 'Unknown Cash',
    gradient: 'linear-gradient(135deg, #3a1230 0%, #c0265a 60%, #fb7185 100%)',
    glyph: 'crosshair',
    priceMinor: 10000,
    denom: '60 UC',
    status: 'Limited',
  },
  {
    title: 'Free Fire',
    tagline: 'Diamonds & events',
    gradient: 'linear-gradient(135deg, #431407 0%, #f97316 60%, #fbbf24 100%)',
    glyph: 'spark',
    priceMinor: 9000,
    denom: '100 Diamonds',
    status: 'In stock',
  },
  {
    title: 'Valorant',
    tagline: 'Points',
    gradient: 'linear-gradient(135deg, #111827 0%, #ef4444 60%, #f87171 100%)',
    glyph: 'target',
    priceMinor: 25000,
    denom: '475 VP',
    status: 'New',
  },
  {
    title: 'Steam Wallet',
    tagline: 'Gift codes',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #2563eb 60%, #60a5fa 100%)',
    glyph: 'gift',
    priceMinor: 30000,
    denom: 'Rp 30.000',
    status: 'In stock',
  },
];
