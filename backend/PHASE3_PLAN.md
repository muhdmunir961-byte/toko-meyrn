# Phase 3 plan

## Existing components

Fastify/Prisma tenant-scoped API, JWT seller authentication, external API keys, BullMQ queues, provider/payment abstractions, webhook outbox, and subscription-plan models are present. There is no AI gateway, AI persistence, knowledge base, workflow engine, or tool authorization layer.

## Stages implemented in this slice

1. AI model gateway contract with capability checks, timeout/retry/fallback, structured output validation, and deterministic mock adapter.
2. Atomic-style quota reservation/settlement service and usage records.
3. Tenant/customer-authorized tools for products, store, orders, and escalation.
4. Tenant-isolated knowledge documents/chunks with PostgreSQL search-ready metadata.
5. Conversation and workflow persistence models plus safe customer/seller AI API boundaries.

## Risks and blockers

- No Node/npm runtime is available, so Prisma generation, migration, build, and tests cannot run here.
- Live AI credentials are not configured; normal tests must use `MockAIProvider`.
- PostgreSQL full-text search can be added after migration; pgvector is intentionally not assumed.
- LLM output is untrusted and cannot authorize payments, fulfillment, provider activation, or arbitrary tools.

## Acceptance tests

- Unsupported tool capability is rejected before a model request.
- Tenant/customer authorization is checked independently of model output.
- Usage quota is denied when reserved tokens exceed the tenant quota.
- Prompt injection cannot grant protected tool access.
- Knowledge documents cannot cross tenant boundaries.
- Provider mapping proposals remain pending human approval.