import { buildApp } from './app.js';
import { db } from './app.js';
import { closeQueues } from './workers/queues.js';
import { env } from './env.js';

// Fail fast on misconfiguration before binding the port.
void env;

const app = await buildApp();
const port = Number(process.env.PORT ?? 3000);

await app.listen({ port, host: '0.0.0.0' });

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] received ${signal}, shutting down...`);
  const force = setTimeout(() => {
    console.error('[api] forced shutdown after timeout');
    process.exit(1);
  }, 25_000);
  force.unref();
  try {
    await app.close(); // stops accepting connections and drains in-flight requests
    await closeQueues();
    await db.$disconnect();
    console.log('[api] shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[api] shutdown error:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));