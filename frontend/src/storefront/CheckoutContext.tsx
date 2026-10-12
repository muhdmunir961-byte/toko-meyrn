import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createOrder, mockPayOrder, type Order } from '../api/storefront';

/**
 * Checkout flow state for the public storefront.
 *
 * Idempotency: `POST /orders` REQUIRES an `Idempotency-Key` header and rejects
 * duplicates. We generate one stable key per checkout attempt and reuse it on
 * retry, so an accidental double-click or network retry cannot create two
 * orders. The key is generated once per "session" and reset when the cart
 * contents change.
 */

export interface CheckoutLine {
  productId: string;
  quantity: number;
}

export interface CheckoutState {
  lines: CheckoutLine[];
  /** Player info is UI-only — the backend order contract has no target field. */
  playerId: string;
  serverId: string;
  /** Payment method is UI-only — only the MOCK gateway exists today. */
  paymentMethod: string;
  /** Current order, set after POST /orders succeeds. */
  order: Order | null;
  submitting: boolean;
  paying: boolean;
  error: string | null;
}

interface CheckoutContextValue extends CheckoutState {
  setLines: (lines: CheckoutLine[]) => void;
  setPlayerId: (v: string) => void;
  setServerId: (v: string) => void;
  setPaymentMethod: (v: string) => void;
  submitOrder: () => Promise<Order | null>;
  pay: () => Promise<void>;
  reset: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

function makeIdempotencyKey(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [lines, setLinesState] = useState<CheckoutLine[]>([]);
  const [playerId, setPlayerIdState] = useState('');
  const [serverId, setServerIdState] = useState('');
  const [paymentMethod, setPaymentMethodState] = useState('MOCK');
  const [order, setOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable idempotency key per checkout attempt. Reset when the cart changes.
  const idempotencyKeyRef = useRef<string>(makeIdempotencyKey());

  const setLines = useCallback((next: CheckoutLine[]) => {
    setLinesState(next);
    // New cart -> new idempotency key and discard any prior order.
    idempotencyKeyRef.current = makeIdempotencyKey();
    setOrder(null);
    setError(null);
  }, []);

  const setPlayerId = useCallback((v: string) => setPlayerIdState(v), []);
  const setServerId = useCallback((v: string) => setServerIdState(v), []);
  const setPaymentMethod = useCallback((v: string) => setPaymentMethodState(v), []);

  const submitOrder = useCallback(async (): Promise<Order | null> => {
    if (lines.length === 0) {
      setError('Your cart is empty.');
      return null;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Authoritative pricing comes from the server; we send only product ids
      // + quantities and reuse the SAME idempotency key across retries.
      const created = await createOrder({
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        idempotencyKey: idempotencyKeyRef.current,
      });
      setOrder(created);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place your order.');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [lines]);

  const pay = useCallback(async () => {
    if (!order) {
      setError('No order to pay for.');
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const updated = await mockPayOrder(order.id);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setPaying(false);
    }
  }, [order]);

  const reset = useCallback(() => {
    setLinesState([]);
    setPlayerIdState('');
    setServerIdState('');
    setPaymentMethodState('MOCK');
    setOrder(null);
    setError(null);
    idempotencyKeyRef.current = makeIdempotencyKey();
  }, []);

  const value = useMemo<CheckoutContextValue>(
    () => ({
      lines,
      playerId,
      serverId,
      paymentMethod,
      order,
      submitting,
      paying,
      error,
      setLines,
      setPlayerId,
      setServerId,
      setPaymentMethod,
      submitOrder,
      pay,
      reset,
    }),
    [
      lines,
      playerId,
      serverId,
      paymentMethod,
      order,
      submitting,
      paying,
      error,
      setLines,
      setPlayerId,
      setServerId,
      setPaymentMethod,
      submitOrder,
      pay,
      reset,
    ],
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout must be used within a CheckoutProvider');
  return ctx;
}
