import type { BadgeTone } from '../components/ui/Badge';

/**
 * Status → badge tone mapping for the seller dashboard. Only states the
 * backend actually emits are mapped; unknown states fall back to neutral.
 */

export function orderStatusTone(status: string): BadgeTone {
  switch (status) {
    case 'SUCCESS':
      return 'success';
    case 'FAILED':
    case 'EXPIRED':
    case 'CANCELLED':
      return 'danger';
    case 'PAYMENT_CONFIRMED':
    case 'PROCESSING':
    case 'QUEUED':
      return 'info';
    case 'AWAITING_PAYMENT':
    case 'CREATED':
      return 'warning';
    case 'MANUAL_REVIEW':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function paymentStatusTone(status: string | null | undefined): BadgeTone {
  switch (status) {
    case 'CONFIRMED':
      return 'success';
    case 'FAILED':
    case 'EXPIRED':
      return 'danger';
    case 'PENDING':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function providerHealthTone(status: string | null | undefined): BadgeTone {
  switch (status) {
    case 'OPEN':
      return 'success';
    case 'CLOSED':
      return 'danger';
    case 'DEGRADED':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** Humanize a SCREAMING_SNAKE backend enum for display. */
export function humanizeStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
