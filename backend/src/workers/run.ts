// Long-running worker entrypoint. Kept separate from `src/server.ts` so the API
// and the worker process can scale and shut down independently.
import { workers, closeWorkers } from './index.js';
import { env } from '../env.js';

// Fail fast on misconfiguration before starting to consume jobs.
void env;

const shutdown = async (signal: string) => {
  console.log(`[worker] received ${signal}, draining jobs...`);
  // `close()` lets in-flight jobs finish (within the per-job timeout) and stops
  // accepting new jobs before resolving.
  await closeWorkers();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

console.log(`[worker] started ${workers.length} worker(s)`);