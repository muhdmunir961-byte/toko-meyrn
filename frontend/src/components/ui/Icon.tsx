import type { SVGProps } from 'react';

/**
 * Minimal inline icon set (stroke-based, currentColor) — no external icon
 * dependency. Names correspond to NavItem.icon keys and common UI glyphs.
 */

export type IconName =
  | 'grid'
  | 'cart'
  | 'box'
  | 'tag'
  | 'users'
  | 'plug'
  | 'key'
  | 'webhook'
  | 'chat'
  | 'globe'
  | 'palette'
  | 'chart'
  | 'spark'
  | 'shield'
  | 'pulse'
  | 'layers'
  | 'menu'
  | 'close'
  | 'sun'
  | 'moon'
  | 'chevron-down'
  | 'logout'
  | 'search'
  | 'check'
  | 'alert'
  | 'arrow-right'
  | 'zap'
  | 'credit-card'
  | 'cpu'
  | 'trending-up'
  | 'headset'
  | 'star'
  | 'store'
  | 'lock'
  | 'refresh'
  | 'gift'
  | 'crosshair'
  | 'target';

const PATHS: Record<IconName, string> = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  cart: 'M3 3h2l2.4 12.2a1 1 0 0 0 1 .8h8.5a1 1 0 0 0 1-.8L20 8H6M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3.3 8.3L12 13l8.7-4.7M12 13v8',
  tag: 'M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7 7h.01',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  plug: 'M12 22v-5M9 8V2M15 8V2M18 8v2a6 6 0 0 1-12 0V8z',
  key: 'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zM15 6l6 6',
  webhook: 'M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2M6 17l3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06M12 8l3.13 5.78c.53.97 1.14 1.8 2.13 2.7a4 4 0 0 1-6.89 4.06',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  palette: 'M12 22a10 10 0 1 1 10-10c0 2-1 3-3 3h-2a2 2 0 0 0-2 2c0 .5.2 1 .5 1.4.3.4.5.9.5 1.4 0 1.2-1 2.2-2.2 2.2zM7 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  chart: 'M3 3v18h18M8 17V9M13 17V5M18 17v-6',
  spark: 'M12 3l1.9 5.7L19 12l-5.1 3.3L12 21l-1.9-5.7L5 12l5.1-3.3z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  pulse: 'M22 12h-4l-3 9L9 3l-3 9H2',
  layers: 'M12 2l10 5-10 5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M18 6L6 18M6 6l12 12',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  'chevron-down': 'M6 9l6 6 6-6',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  check: 'M20 6L9 17l-5-5',
  alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  zap: 'M13 2L3 14h7l-1 8 11-13h-7l1-7z',
  'credit-card': 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 10h18M7 15h4',
  cpu: 'M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3M7 7h10v10H7z',
  'trending-up': 'M3 17l6-6 4 4 8-8M15 7h6v6',
  headset: 'M4 13a8 8 0 0 1 16 0M4 13v3a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2zM20 13v3a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2z',
  star: 'M12 3l2.7 5.6 6.3.9-4.5 4.4 1 6.3-5.5-2.9-5.5 2.9 1-6.3L3 9.5l6.3-.9z',
  store: 'M4 7l2-3h12l2 3v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0v-1zM4 7v13h16V7M9 20v-6h6v6',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6',
  gift: 'M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7a3 3 0 1 0-3-3M12 7a3 3 0 1 1 3-3',
  crosshair: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
};

export function Icon({
  name,
  size = 20,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}