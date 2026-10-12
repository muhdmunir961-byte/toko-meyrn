import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useCheckout } from '../storefront/CheckoutContext';
import { Icon } from '../components/ui/Icon';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

/**
 * Transaction lookup.
 *
 * The backend has NO customer-facing order-lookup endpoint (`GET /orders/:id`
 * is external-API-key only). This page therefore only surfaces the CURRENT
 * in-memory order (from this browser session) and clearly states the limitation.
 */
export function StorefrontLookupPage() {
  const { slug = '' } = useParams();
  const { order } = useCheckout();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setMessage('Enter an order ID to look up.');
      return;
    }
    if (order && (order.id === q || order.id.startsWith(q))) {
      setMessage(`Found order ${order.id.slice(0, 8)} in this session.`);
    } else {
      setMessage('No matching order in this session. Lookup across sessions is not supported yet (no public lookup endpoint).');
    }
  }

  return (
    <div className="sf__container sf__lookup" id="lookup">
      <h1 className="sf__title">Transaction lookup</h1>
      <p className="sf__subtitle">
        Check a recent order from this browser session.
      </p>

      <form className="sf__form" style={{ marginTop: '1rem' }} onSubmit={onSubmit}>
        <Input
          label="Order ID"
          placeholder="Paste your order ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="secondary">Look up</Button>
      </form>

      {message && (
        <p className="sf__notice" style={{ marginTop: '1rem' }}>
          <Icon name="shield" size={14} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
          {message}
        </p>
      )}

      {order && (
        <div className="sf__status-row" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
          <span>Current session order</span>
          <a href={`/${slug}/order/${order.id}`} style={{ fontWeight: 'var(--weight-semibold)' }}>
            {order.id.slice(0, 8)} →
          </a>
        </div>
      )}
    </div>
  );
}
