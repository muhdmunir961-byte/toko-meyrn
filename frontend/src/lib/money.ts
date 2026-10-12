/**
 * Money formatting helpers.
 *
 * The backend stores ALL monetary values as integer minor units (IDR by
 * default): `*Minor` fields are ÷100 to reach major units. Per the F0 audit,
 * the display layer is the ONLY place we divide — never floating-point math,
 * never rounding drift. We use integer truncation for the major-unit split and
 * the platform `Intl.NumberFormat` for locale-correct rendering.
 */

/** Convert integer minor units to integer major units (IDR). */
export function minorToMajor(minor: number): number {
  return Math.trunc(minor / 100);
}

/** Format integer minor units as an IDR currency string, e.g. Rp 10.000. */
export function formatIDR(minor: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minorToMajor(minor));
}

/** Format a ratio (0..1) as a percentage, e.g. 0.42 -> "42%". */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

