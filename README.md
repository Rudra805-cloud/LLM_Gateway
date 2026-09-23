# LLM Gateway

An HTTP gateway that provides a controlled interface between clients and an LLM provider.

## Features

* Virtual API keys
* Per-key monetary budget enforcement
* Atomic budget reservation for concurrent requests
* Gemini LLM proxying
* Token usage and cost logging
* Usage and spend tracking per gateway key
* Retry on transient provider failures
* Mock fallback when the provider remains unavailable
* PostgreSQL persistence with Prisma

## Tech Stack

* Node.js
* Express
* PostgreSQL
* Prisma
* Google Gemini API
* Render

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Rudra805-cloud/LLM_Gateway.git
cd LLM_Gateway
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file using `.env.example`:

```bash
cp .env.example .env
```

Configure the following values in `.env`:

```env
PORT=3000

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE

ADMIN_API_KEY=your_admin_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

GEMINI_INPUT_PRICE_PER_MILLION=0.75
GEMINI_OUTPUT_PRICE_PER_MILLION=3.75
```

Never commit `.env` or real API keys to the repository.

### 4. Generate Prisma Client and run migrations

```bash
npx prisma generate
npx prisma migrate deploy
```

### 5. Start the gateway

For development:

```bash
npm run dev
```

For production:

```bash
npm start
```

The gateway runs on:

```text
http://localhost:3000
```

## API Usage

### Health Check

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "service": "APIGATEWAY"
}
```

### Create Gateway Key

Requires the admin API key.

```bash
curl -X POST http://localhost:3000/admin/keys \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"test-client\",\"budget\":10}"
```

Example response:

```json
{
  "id": 1,
  "key": "gw_...",
  "name": "test-client",
  "budgetLimit": "10"
}
```

The gateway key is returned when the key is created. Store it securely.

### Make an LLM Request

Use the generated gateway key:

```bash
curl -X POST http://localhost:3000/v1/chat \
  -H "Authorization: Bearer YOUR_GATEWAY_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"gemini-3.6-flash\",\"messages\":[{\"role\":\"user\",\"content\":\"What is 2 + 2?\"}]}"
```

Example response:

```json
{
  "text": "Depending on what you mean, here are a few answers:\n\n1. **If you are looking for the sum:** $2 + 2 = \\mathbf{4}$",
  "inputTokens": 7,
  "outputTokens": 101,
  "totalTokens": 667,
  "estimatedCost": 0.000384
}
```

### Check Usage

```bash
curl "http://localhost:3000/usage?key=YOUR_GATEWAY_KEY"
```

Example response:

```json
{
  "keyId": 3,
  "name": "budget-test",
  "budget": 10,
  "spent": 0.000384,
  "remaining": 9.999616,
  "totalRequests": 1,
  "totalInputTokens": 7,
  "totalOutputTokens": 101,
  "totalTokens": 667,
  "loggedCost": 0.000384
}
```

## Live Deployment

The gateway is deployed on Render.

**Live URL:**

https://llm-gateway-cgon.onrender.com/

### Production Health Check

```bash
curl https://llm-gateway-cgon.onrender.com/health
```

### Production Chat Request

```bash
curl -X POST https://llm-gateway-cgon.onrender.com/v1/chat \
  -H "Authorization: Bearer YOUR_GATEWAY_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"gemini-3.6-flash\",\"messages\":[{\"role\":\"user\",\"content\":\"What is 2 + 2?\"}]}"
```

### Production Usage

```bash
curl "https://llm-gateway-cgon.onrender.com/usage?key=YOUR_GATEWAY_KEY"
```

## Budget Enforcement

The gateway enforces a monetary budget for every virtual API key.

Before sending a request to the provider, the gateway atomically reserves the estimated request cost:

```text
spentAmount + reservedAmount + estimatedCost <= budgetLimit
```

If the budget is insufficient, the request is rejected before the provider call.

After the provider response, the reservation is reconciled using the actual token usage and calculated cost.

This prevents concurrent requests from exceeding the configured budget.

## Fallback and Resilience

The gateway retries transient Gemini provider failures once.

If the provider still fails, the gateway returns a mock fallback response instead of failing the entire request.

Fallback requests are recorded with:

```text
provider: mock
status: fallback
estimatedCost: 0
```

This provides a deterministic fallback without introducing a second paid provider.

## Security

* Provider API keys remain server-side.
* Gateway keys are stored as SHA-256 hashes.
* Admin endpoints require a separate admin API key.
* Secrets are loaded through environment variables.
* `.env` is excluded from version control.
* Budget checks are performed by the gateway rather than trusted to callers.

## Project Structure

```text
LLM_Gateway/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── AI-LOG.md
├── DECISIONS.md
├── package.json
└── README.md
```

## Documentation

### DECISIONS.md

Contains:

* Architecture decisions
* Request lifecycle
* Budget enforcement approach
* Concurrency handling
* Fallback policy
* Trade-offs
* Deliberate cuts
* Known limitations

### AI-LOG.md

Contains:

* AI tools used during development
* How AI was used
* Incorrect or misleading AI suggestions
* Decisions overridden by the developer
* Verification and control over generated code
* Key learning from the implementation

## Deliberate Scope

The gateway intentionally does not include:

* Frontend UI
* Multi-tenant authentication
* Streaming responses
* Multiple real LLM providers
* Semantic caching
* Fine-tuning
* Advanced rate limiting
* Large observability stack

The implementation focuses on provider proxying, virtual keys, budget enforcement, usage tracking, persistence, and fallback handling.

## Project Status

The deployed gateway has been tested for:

* Health check
* Virtual key creation
* Real Gemini request
* Token and cost calculation
* Usage persistence
* Per-key budget tracking
* Budget enforcement
* Provider retry
* Mock fallback
* Production deployment
