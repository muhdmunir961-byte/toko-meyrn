import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection. `REDIS_PASSWORD` is optional and, when set, is applied even if
// `REDIS_URL` does not embed credentials (keeps secrets out of URLs/URLs out of logs).
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  enableReadyCheck: true,
});

connection.on('error', (err) => {
  // Log without secrets; BullMQ reconnects automatically.
  console.error('[redis] connection error:', err.message);
});

export const queues = {
  providerSync: new Queue('provider-sync', { connection }),
  providerFulfillment: new Queue('provider-fulfillment', { connection }),
  providerReconciliation: new Queue('provider-reconciliation', { connection }),
  webhookDispatch: new Queue('webhook-dispatch', { connection }),
  whatsappNotifications: new Queue('whatsapp-notifications', { connection }),
  paymentReconciliation: new Queue('payment-reconciliation', { connection }),
};

// Queue job-level retry/cleanup policy. Financial/provider jobs that could double-
// submit on retry MUST be idempotent upstream (the DB is the source of truth).
export function retryPolicy() {
  return {
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  };
}

// Worker reliability defaults. Every worker gets a hard per-job timeout so a hung
// provider/webhook call cannot block its concurrency slot forever, and stalled-job
// recovery re-queues jobs whose worker died without finalizing state.
export function createWorker(
  name: keyof typeof queues,
  handler: (job: { id?: string; data: unknown }) => Promise<void>,
) {
  const jobTimeoutMs = Number(process.env.WORKER_JOB_TIMEOUT_MS ?? 60_000);
  // Per-job timeout guard: a hung provider/webhook call must not pin its
  // concurrency slot indefinitely. BullMQ has no worker-level timeout option,
  // so we race the handler against a timer and surface a clear error.
  const timedHandler = async (job: { id?: string; data: unknown }) => {
    if (jobTimeoutMs <= 0) return handler(job);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Job timed out after ${jobTimeoutMs}ms (queue: ${queues[name].name})`)),
        jobTimeoutMs,
      );
    });
    try {
      return await Promise.race([handler(job), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  return new Worker(queues[name].name, timedHandler as never, {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
    lockDuration: Number(process.env.WORKER_LOCK_DURATION_MS ?? 120_000),
    stalledInterval: Number(process.env.WORKER_STALLED_INTERVAL_MS ?? 30_000),
    maxStalledCount: Number(process.env.WORKER_MAX_STALLED ?? 1),
  });
}

export async function closeQueues() {
  await Promise.all(Object.values(queues).map((q) => q.close()));
  await connection.quit();
}