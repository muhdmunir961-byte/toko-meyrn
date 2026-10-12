# Load tests (k6)

These scripts are runnable with [k6](https://k6.io) and produce **real** measurements
against a live target — no invented benchmark numbers are committed to the repo.

## Prerequisites

- A running target (staging recommended; never load-test production without approval).
- k6 installed (`brew install k6`, or the official binary).
- A valid API key / JWT for authenticated endpoints, supplied via `K6_TOKEN`.

## Run

```sh
# Health / unauthenticated smoke
K6_BASE_URL=https://staging.example.com k6 run tests/load/smoke.js

# Authenticated order-browse scenario
K6_BASE_URL=https://staging.example.com \
K6_TOKEN=your-jwt-or-api-key \
k6 run tests/load/orders.js
```

## Interpreting results

Record the following for the launch gate:

- p95/p99 latency and error rate for each endpoint.
- HTTP failure rate — must be ~0% for the scenario's steady-state target.
- Any 429 responses from the rate limiter (indicates the limiter or the test VU count
  needs adjustment; it is not a product defect).

Load testing produces measurements, not guarantees. Capture a baseline, identify the
first bottleneck, tune, and re-run. Do not extrapolate capacity from a single run.