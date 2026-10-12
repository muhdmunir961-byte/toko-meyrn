import { z } from 'zod';

export type AIMessage = { role: 'system'|'user'|'assistant'|'tool'; content: string };
export type AICapabilities = { tools: boolean; streaming: boolean; json: boolean };
export type AICompletion = { content: string; model: string; usage?: { inputTokens: number; outputTokens: number }; finishReason?: string };
export type AIRequest = { model?: string; messages: AIMessage[]; maxOutputTokens?: number; responseSchema?: z.ZodTypeAny; tools?: unknown[] };
export interface AIProvider { readonly name: string; readonly capabilities: AICapabilities; complete(request: AIRequest, signal?: AbortSignal): Promise<AICompletion>; }
export class MockAIProvider implements AIProvider {
  readonly name = 'mock'; readonly capabilities = { tools: true, streaming: false, json: true };
  constructor(private readonly answer = 'I can help with verified store information.') {}
  async complete(request: AIRequest) { const content = request.responseSchema ? JSON.stringify({ answer: this.answer }) : this.answer; return { content, model: request.model ?? 'mock', usage: { inputTokens: request.messages.reduce((n, m) => n + m.content.length, 0), outputTokens: content.length } };
  }
}
export class AIModelGateway {
  constructor(private readonly primary: AIProvider, private readonly fallback?: AIProvider) {}
  async complete(request: AIRequest, timeoutMs = Number(process.env.AI_TIMEOUT_MS ?? 15000)) {
    const provider = request.tools && !this.primary.capabilities.tools ? this.fallback : this.primary;
    if (!provider || (request.tools && !provider.capabilities.tools) || (request.responseSchema && !provider.capabilities.json)) throw new Error('AI model capability is not supported');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { const result = await provider.complete(request, controller.signal); if (request.responseSchema) result.content = JSON.stringify(request.responseSchema.parse(JSON.parse(result.content))); return result; }
    catch (error) { if (this.fallback && provider !== this.fallback) return this.fallback.complete(request, controller.signal); throw error; }
    finally { clearTimeout(timer); }
  }
}