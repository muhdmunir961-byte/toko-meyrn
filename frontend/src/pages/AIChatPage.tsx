import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { aiChat, aiUsage, type AIUsageRecord } from '../api/ai';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { AI_LABEL, isSecretLike } from '../lib/security';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * AI assistant chat — POST /ai/chat (mock model). Every assistant reply is
 * labeled AI-generated/non-authoritative. Responses that look like a secret
 * are redacted in the UI as a defensive measure (the backend already sanitizes
 * prompt injection, but never echoes credentials it doesn't have).
 */
export function AIChatPage() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState<AIUsageRecord[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    aiUsage()
      .then((u) => { if (!cancelled) setUsage(u.slice(0, 5)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setSending(true);
    try {
      const res = await aiChat({ message: text, conversationId });
      setConversationId(res.conversationId);
      const safe = isSecretLike(res.answer) ? '[redacted — possible credential]' : res.answer;
      setMessages((prev) => [...prev, { role: 'assistant', content: safe }]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'AI request failed.';
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠ ${msg}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">AI assistant</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code> · <Badge tone="warning">Mock model</Badge>{' '}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{AI_LABEL}</span>
        </p>
      </div>

      <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
        <div
          ref={listRef}
          style={{ maxHeight: '24rem', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--color-surface)' }}
          aria-live="polite"
        >
          {messages.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Ask about your orders, catalog, or business. Replies are AI-generated and
              may be incorrect — verify against the dashboard.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface-elevated)',
                color: m.role === 'user' ? 'var(--color-on-primary)' : 'var(--color-text)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {m.role === 'assistant' && (
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', opacity: 0.7, marginBottom: '0.25rem' }}>
                  <Icon name="spark" size={12} /> AI-generated
                </span>
              )}
              {m.content}
            </div>
          ))}
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              aria-label="Message"
            />
          </div>
          <Button type="submit" loading={sending} style={{ marginTop: '1.5rem' }}>Send</Button>
        </form>

        {usage.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '0.5rem' }}>Recent AI usage</h2>
            <div className="dash__detail">
              {usage.map((u) => (
                <div key={u.id} className="dash__detail-row">
                  <span>{u.workflow} · <code>{u.model}</code></span>
                  <span>{u.totalTokens} tokens</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
