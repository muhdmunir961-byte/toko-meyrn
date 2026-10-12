import { PrismaClient } from '@prisma/client';
import { createWorker } from './queues.js';
import { buildWebhookRequest, nextDeliveryState } from '../integrations/webhook-dispatcher.js';
import { assertSafeWebhookUrl } from '../integrations/webhooks.js';
import { decryptSecret } from '../integrations/crypto.js';
import { whatsappAdapters } from '../integrations/whatsapp.js';
import { providerRegistry } from '../integrations/provider.js';

const db = new PrismaClient();
type JobData = Record<string, unknown>;
function data(job: { data: unknown }) { return job.data as JobData; }

const providerSync = createWorker('providerSync', async job => {
  const { providerId } = data(job) as { providerId: string };
  const provider = await db.providerConfiguration.findUnique({ where: { id: providerId } });
  if (!provider) return;
  const adapter = providerRegistry[provider.providerType];
  if (!adapter) throw new Error('Unsupported provider adapter');
  const log = await db.providerSyncLog.create({ data: { providerId, status: 'RUNNING' } });
  try {
    const records = await adapter.syncProducts(undefined);
    await db.providerSyncLog.update({ where: { id: log.id }, data: { status: 'SUCCESS', records: records.length, finishedAt: new Date() } });
  } catch (error) {
    await db.providerSyncLog.update({ where: { id: log.id }, data: { status: 'FAILED', errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'sync failed', finishedAt: new Date() } });
    throw error;
  }
});

const webhookDispatch = createWorker('webhookDispatch', async job => {
  const { outboxEventId } = data(job) as { outboxEventId: string };
  const outbox = await db.outboxEvent.findUnique({ where: { id: outboxEventId } });
  if (!outbox || outbox.status === 'DISPATCHED') return;
  const endpoints = await db.webhookEndpoint.findMany({ where: { tenantId: outbox.tenantId, active: true, events: { has: outbox.eventType } } });
  const event = await db.webhookEvent.create({ data: { tenantId: outbox.tenantId, eventType: outbox.eventType, payload: outbox.payload } });
  for (const endpoint of endpoints) {
    const existing = await db.webhookDelivery.findUnique({ where: { endpointId_eventId: { endpointId: endpoint.id, eventId: event.id } } });
    if (existing?.status === 'DELIVERED' || existing?.status === 'DEAD_LETTER') continue;
    const delivery = existing ?? await db.webhookDelivery.create({ data: { endpointId: endpoint.id, eventId: event.id } });
    try {
      const url = await assertSafeWebhookUrl(endpoint.url, process.env.NODE_ENV === 'production');
      const signed = buildWebhookRequest({ ciphertext: endpoint.secretCiphertext, iv: endpoint.secretIv, tag: endpoint.secretTag }, { event: outbox.eventType, event_id: outbox.id, timestamp: outbox.createdAt.toISOString(), data: outbox.payload });
      const response = await fetch(url, { method: 'POST', headers: signed.headers, body: signed.body, redirect: 'error', signal: AbortSignal.timeout(8000) });
      const state = nextDeliveryState(delivery, response.status);
      await db.webhookDelivery.update({ where: { id: delivery.id }, data: { status: state.status, attemptCount: state.attemptCount, nextAttemptAt: state.nextAttemptMs ? new Date(Date.now() + state.nextAttemptMs) : null, deliveredAt: state.status === 'DELIVERED' ? new Date() : null, lastError: response.ok ? null : `HTTP ${response.status}` } });
    } catch (error) {
      const state = nextDeliveryState(delivery);
      await db.webhookDelivery.update({ where: { id: delivery.id }, data: { status: state.status, attemptCount: state.attemptCount, nextAttemptAt: state.nextAttemptMs ? new Date(Date.now() + state.nextAttemptMs) : null, lastError: error instanceof Error ? error.message.slice(0, 500) : 'delivery failed' } });
      if (state.status === 'RETRYING') throw error;
    }
  }
  await db.outboxEvent.update({ where: { id: outbox.id }, data: { status: 'DISPATCHED', attempts: { increment: 1 } } });
});

const whatsappWorker = createWorker('whatsappNotifications', async job => {
  const { integrationId, recipient, eventType, text } = data(job) as { integrationId: string; recipient: string; eventType: string; text: string };
  const integration = await db.whatsAppIntegration.findUnique({ where: { id: integrationId } });
  if (!integration?.enabled) return;
  const adapter = whatsappAdapters[integration.connectionType as keyof typeof whatsappAdapters];
  if (!adapter) throw new Error('Unsupported WhatsApp transport');
  const msg = await db.whatsAppMessage.create({ data: { integrationId, recipient, eventType, payload: { text }, status: 'SENDING' } });
  try {
    const result = await adapter.send({ recipient, text, eventType });
    await db.whatsAppMessage.update({ where: { id: msg.id }, data: { status: result.accepted ? 'ACCEPTED' : 'FAILED', providerReference: result.providerReference, attempts: { increment: 1 } } });
    if (!result.accepted) throw new Error('WhatsApp transport rejected message');
  } catch (error) {
    await db.whatsAppMessage.update({ where: { id: msg.id }, data: { status: 'FAILED', attempts: { increment: 1 } } });
    throw error;
  }
});

// Non-implemented external integrations are intentionally not registered as
// no-op workers: enqueue attempts fail visibly until a real handler is enabled.
export const workers = [providerSync, webhookDispatch, whatsappWorker];
export async function closeWorkers() { await Promise.all(workers.map(worker => worker.close())); await db.$disconnect(); }