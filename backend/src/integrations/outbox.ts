import type { PrismaClient } from '@prisma/client';
import { queues, retryPolicy } from '../workers/queues.js';

export async function recordOutboxEvent(db: PrismaClient, input: { tenantId: string; eventType: string; aggregateId: string; payload: object }) {
  const event = await db.outboxEvent.create({ data: { ...input, payload: input.payload } });
  await queues.webhookDispatch.add('outbox-event', { outboxEventId: event.id }, retryPolicy());
  return event;
}