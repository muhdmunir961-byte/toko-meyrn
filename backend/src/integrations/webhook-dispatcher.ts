import { decryptSecret } from './crypto.js';
import { signWebhook } from './webhooks.js';
import { deliveryStatus, exponentialBackoff } from './retry.js';

export type DeliveryRecord = { attemptCount: number; status: string };
export function buildWebhookRequest(secretFields: { ciphertext: string; iv: string; tag: string }, payload: object, now = new Date()) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(now.getTime() / 1000).toString();
  const secret = decryptSecret(secretFields);
  return { body, headers: { 'content-type': 'application/json', 'x-webhook-signature': signWebhook(secret, timestamp, body), 'x-webhook-timestamp': timestamp } };
}
export function nextDeliveryState(previous: DeliveryRecord, responseStatus?: number) {
  const attempt = previous.attemptCount + 1;
  const status = deliveryStatus(responseStatus, attempt);
  return { status, attemptCount: attempt, nextAttemptMs: status === 'RETRYING' ? exponentialBackoff(attempt) : undefined };
}