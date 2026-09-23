# Decisions — Minimal LLM Gateway

## 1. What I Built

I built a minimal HTTP LLM gateway using Node.js, Express, PostgreSQL, and Prisma. The gateway sits between callers and Google Gemini, authenticates callers using gateway-issued virtual API keys, enforces a per-key monetary budget, and records token usage and estimated cost for every request. The gateway uses non-streaming responses and includes retry handling with a mock fallback when the primary provider is temporarily unavailable. It is deployed as a real service on Render with PostgreSQL and environment-based secrets.

---

## 2. Request Lifecycle

A request follows this lifecycle:

```text
Client
  |
  | POST /v1/chat
  | Authorization: Bearer <gateway-key>
  v
Gateway API
  |
  v
Gateway Key Authentication
  |
  |-- invalid key --> 401
  |
  v
Estimate input/output cost
  |
  v
Atomic Budget Reservation
  |
  |-- budget unavailable --> 402
  |
  v
Gemini Provider
  |
  |-- retryable error --> retry once
  |
  |-- still unavailable --> mock fallback
  |
  v
Calculate Actual Cost
  |
  v
Reconcile Reserved Budget
  |
  v
Persist UsageLog
  |
  v
Return Response
```

The main endpoint is:

```text
POST /v1/chat
```

Supporting endpoints are:

```text
POST /admin/keys
GET  /usage?key=<gateway-key>
GET  /health
```

---

## 3. Important Decisions

### Decision 1 — Node.js + Express

**Options considered:**

* Node.js + Express
* Python + FastAPI

**Picked:** Node.js + Express.

I chose Node.js because I already had experience with JavaScript and Express, allowing me to spend more time on gateway-specific concerns such as budgets, provider handling, persistence, and deployment rather than learning a new web framework.

**Tradeoff:** FastAPI would provide strong Python typing and validation features, but using it would have increased the amount of framework-specific learning during the limited implementation window.

---

### Decision 2 — Non-streaming responses

**Options considered:**

* Streaming responses
* Non-streaming responses

**Picked:** Non-streaming.

The gateway waits for the complete provider response before returning it. This makes token accounting, actual cost calculation, budget reconciliation, error handling, and fallback simpler.

**Tradeoff:** Streaming would provide lower perceived latency for long responses, but it makes usage accounting and failure handling more complicated. For this small gateway, correctness and simplicity were more important.

---

### Decision 3 — Monetary budget per gateway key

**Options considered:**

* Request-count limits
* Token limits
* Monetary/cost limits

**Picked:** Monetary budget in ₹.

Each gateway key has a `budgetLimit`, and the gateway tracks both `spentAmount` and `reservedAmount`.

The actual provider token usage is used to calculate the final cost using configured input/output prices.

**Tradeoff:** Token-to-cost conversion depends on provider pricing and can change over time. However, monetary budgets directly represent the resource I am trying to control: provider spend.

---

### Decision 4 — Atomic budget reservation

A simple read-then-update approach could allow two concurrent requests to both observe the same remaining budget and overspend it.

Instead, the gateway uses an atomic PostgreSQL update:

```text
spentAmount + reservedAmount + newReservation <= budgetLimit
```

The reservation succeeds only when this condition is true.

After the provider call, the reservation is reconciled with the actual cost.

**Tradeoff:** This adds some database logic and another piece of state (`reservedAmount`), but it prevents concurrent requests from bypassing the budget check.

---

### Decision 5 — Retry once, then mock fallback

**Options considered:**

* Fail immediately
* Retry the provider
* Use a second provider
* Use a local/mock fallback

**Picked:** Retry the Gemini request once for retryable failures, then return a deterministic mock fallback response.

Retryable cases include provider availability/rate-limit style failures such as 503 and 429.

**Why:** A transient provider failure should not immediately become a failed gateway request. One retry handles short-lived provider issues while keeping latency bounded. If the provider remains unavailable, the mock fallback allows the gateway to demonstrate graceful degradation without requiring another paid provider.

**Tradeoff:** The mock fallback is not equivalent to a real LLM response. It is intentionally a resilience fallback rather than a quality-equivalent model.

---

## 4. Why Enforce Budgets at the Gateway?

The caller cannot be trusted to enforce its own budget because the caller controls its own request behavior.

If the provider key were exposed to callers, they could bypass the gateway entirely. Even if callers were given a budget value, they could send concurrent requests or intentionally ignore the limit.

The gateway is the trusted enforcement point because every provider request passes through it. It can authenticate the virtual key, reserve budget before the provider call, reconcile actual cost afterward, and persist usage centrally.

---

## 5. Concurrency

The gateway deliberately handles concurrent requests for the same key.

The important part is the atomic budget reservation in PostgreSQL. The reservation only succeeds if:

```text
spentAmount + reservedAmount + requestedReservation <= budgetLimit
```

This means two simultaneous requests cannot both independently observe the same remaining budget and exceed the limit.

The request temporarily increases `reservedAmount`. Once the provider call finishes, the reservation is removed and the actual cost is added to `spentAmount`.

If the provider request fails and the gateway reaches the error path, the reservation is released.

---

## 6. Fallback Policy

The primary provider is Google Gemini.

For retryable provider failures:

1. Attempt the Gemini request.
2. If the failure is retryable, wait briefly and retry once.
3. If the retry also fails, return a deterministic mock fallback response.
4. Log the request as a fallback with zero provider token cost.

I chose this policy because the assignment is primarily evaluating the gateway's resilience behavior rather than the quality of a second model.

---

## 7. What I Deliberately Did NOT Build

I intentionally kept the gateway small.

I did not build:

* A frontend
* Multi-tenant authentication
* User accounts
* Fine-tuning
* Streaming
* Semantic caching
* A second real LLM provider
* Local Ollama/vLLM routing
* A sophisticated rate limiter
* Advanced observability/metrics
* A large automated test suite

These were either explicitly optional or outside the core requirements. Adding them would have increased implementation surface without improving the core gateway enough for this assignment.

I also chose not to implement a polished UI because the assignment explicitly states that UI is not being scored.

---

## 8. Least Confident Decision

The least confident decision is using a mock fallback instead of a second real provider.

A second provider would provide a more realistic production fallback and could preserve useful LLM functionality when Gemini is unavailable. However, adding another provider introduces another credential, provider-specific request/response handling, pricing, and additional failure modes.

The mock fallback is much smaller and makes the resilience behavior deterministic and easy to reason about. For a one-weekend implementation, I considered that tradeoff acceptable.

---

## 9. Where It Breaks / What I Would Do With One More Week

The gateway is intentionally minimal and is not a full production gateway.

With more time, I would improve:

* Provider timeout handling with explicit request cancellation.
* More comprehensive automated tests, especially concurrent budget tests.
* Better structured logging and request IDs.
* Metrics for latency, provider failures, fallback frequency, and spend.
* A second real LLM provider for stronger failover.
* More robust rate limiting.
* More detailed provider error classification.
* More precise token-cost handling for provider-specific pricing changes.
* Authentication/authorization improvements for administrative operations.
* Production-grade monitoring and alerting.

The current implementation focuses on getting the core request lifecycle, budget enforcement, usage persistence, resilience, and deployment working correctly rather than building a complete commercial gateway.

---

## 10. Deliberate Scope

The main goal was to build the smallest gateway that genuinely performs the required job:

```text
Virtual Key
    +
Authentication
    +
Budget Enforcement
    +
LLM Proxy
    +
Usage/Spend Logging
    +
Fallback
    +
Deployment
```

Everything outside this core was treated as optional and was not allowed to delay a working deployed service.
