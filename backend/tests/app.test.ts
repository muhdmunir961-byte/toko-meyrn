import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
describe('health', () => { it('responds', async () => { const app = await buildApp(); const response = await app.inject('/health'); expect(response.statusCode).toBe(200); expect(response.json()).toEqual({ status: 'ok' }); await app.close(); }); });