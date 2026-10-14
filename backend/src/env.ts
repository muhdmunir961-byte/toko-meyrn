// Startup environment validation. Fails fast with a clear, secret-free error if a
// required production variable is missing or malformed. Never logs secret values.
import { z } from 'zod';

const secret = (min = 32) => z.string().min(min);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).optional().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: secret(),
  API_KEY_PEPPER: secret(),
  CREDENTIAL_ENCRYPTION_KEY_BASE64: secret(24),
  PUBLIC_BASE_URL: z.string().url().optional(),
  // Google OAuth client ID used to verify Identity Services ID tokens.
  // Optional: when unset, POST /auth/google responds 503 and password auth is
  // unaffected, so a deployment without Google configured still boots.
  GOOGLE_CLIENT_ID: z.string().optional(),
  MAX_RESELLER_DEPTH: z.coerce.number().int().positive().default(3),
  AI_BASE_URL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_DEFAULT_MODEL: z.string().optional(),
  AI_FALLBACK_MODEL: z.string().optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(1000),
  ALERT_CHANNEL_ID: z.string().optional(),
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  WORKER_JOB_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(60000),
  WORKER_LOCK_DURATION_MS: z.coerce.number().int().positive().default(120000),
  WORKER_STALLED_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
  WORKER_MAX_STALLED: z.coerce.number().int().nonnegative().default(1),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and return the runtime environment. In development we relax the secret
 * requirement (the app falls back to dev defaults) to keep local iteration easy; in
 * production a missing secret is a fatal startup error.
 */
export function loadEnv(): Env {
  const isProduction = process.env.NODE_ENV === 'production';
  const schema = isProduction ? envSchema : envSchema.partial();
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    // Do NOT include process.env — the issues list only names variables, not values.
    throw new Error(`Invalid or missing environment configuration: ${issues}`);
  }
  return result.data as Env;
}

// Validate once at module load. Crashes fast on misconfiguration rather than
// serving requests with a missing secret.
export const env = loadEnv();