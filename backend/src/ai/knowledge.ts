import { createHash } from 'node:crypto';
export function hashKnowledge(content: string) { return createHash('sha256').update(content).digest('hex'); }
export function chunkKnowledge(content: string, size = 1200) { const chunks: string[] = []; for (let i = 0; i < content.length; i += size) chunks.push(content.slice(i, i + size)); return chunks; }
export function containsPromptInjection(content: string) { return /ignore\s+(?:(?:all|previous|prior)\s+)+instructions|reveal\s+(the\s+)?system\s+prompt|execute\s+shell/i.test(content); }