# AI Log — Minimal LLM Gateway

## 1. AI Tools and Models Used

I used AI tools throughout the implementation as development assistants rather than as a replacement for understanding the system.

I primarily used:

* ChatGPT — for architecture discussion, debugging, reviewing implementation choices, explaining unfamiliar concepts, and checking the assignment requirements.
* Claude — for generating and iterating on backend implementation ideas and code.
* Google Gemini — as the actual LLM provider used by the gateway.

AI was used for tasks such as:

* Express route/controller structure
* Prisma schema design
* PostgreSQL queries
* Gateway authentication
* Budget reservation logic
* Token/cost calculation
* Gemini API integration
* Retry and fallback handling
* Debugging deployment issues
* Reviewing the assignment against the implementation

I still manually tested the important flows using Postman and Prisma Studio.

---

## 2. One Place Where AI Was Wrong or Misleading

One important issue was around the LLM provider/model availability.

An initially selected Gemini model was no longer available for my account, and the provider returned a model-not-available error. Instead of assuming the generated code was correct, I checked the actual provider response and changed the implementation to use the available Gemini model.

This reinforced that provider documentation and actual API responses have to be treated as the source of truth rather than blindly trusting generated code.

---

## 3. One AI Suggestion I Overrode

AI suggested several possible additions and production features that were not necessary for the assignment, such as more advanced gateway functionality, additional providers, caching, and broader infrastructure.

I intentionally did not add these features.

The assignment explicitly emphasized building the smallest system that genuinely works, so I prioritized:

* Authentication
* Budget enforcement
* Provider proxying
* Usage logging
* Fallback
* Deployment

over additional features that would increase complexity without being required.

---

## 4. How I Stayed in Control of AI-Generated Code

I treated AI-generated code as a starting point and verified the important parts myself.

### Secrets

Provider and administrative credentials are stored in environment variables:

```text
GEMINI_API_KEY
ADMIN_API_KEY
DATABASE_URL
```

The `.env` file is excluded from Git, and secrets are configured separately in Render for deployment.

The gateway-issued API key is stored as a SHA-256 hash rather than storing the raw key in the database.

### Budget Logic

I specifically verified the budget behavior instead of assuming it worked.

The gateway reserves estimated cost before making the provider call and uses PostgreSQL to atomically check:

```text
spentAmount + reservedAmount + newReservation <= budgetLimit
```

I tested a deliberately small-budget key and confirmed that an over-budget request is rejected with:

```text
402 Budget exceeded
```

I also implemented `reservedAmount` so concurrent requests cannot both consume the same remaining budget.

### Provider Call

I verified the Gemini request structure and tested real provider responses.

The provider response is also used to obtain actual token usage, which is then used for final cost reconciliation and usage logging.

### Testing

I used Postman to test the HTTP API and Prisma Studio to inspect persisted usage records.

I verified:

* Health endpoint
* Gateway key creation
* Successful Gemini request
* Actual token usage and cost
* Budget rejection
* Provider fallback
* Fallback usage logging
* `/usage` spend reporting
* Deployed production requests

---

## 5. Something I Learned From Scratch

One of the main things I learned during this project was how to implement concurrency-safe monetary budget enforcement.

A simple approach would be:

```text
Read remaining budget
        ↓
Check budget
        ↓
Call provider
        ↓
Update spent amount
```

I realized that this is unsafe when two requests arrive at the same time. Both requests could read the same remaining budget before either one updates the database.

I therefore learned how to use an atomic PostgreSQL update with a temporary reservation:

```text
spentAmount + reservedAmount + estimatedCost <= budgetLimit
```

The request reserves an amount before calling the provider, and the reservation is reconciled with the actual provider cost afterward.

This was an important learning point because it changed my understanding of budget enforcement from simple application logic into a concurrency problem involving database atomicity.

---

## 6. Overall Use of AI

AI significantly accelerated implementation, debugging, and research, but I did not treat generated code as automatically correct.

For the security-sensitive and correctness-sensitive parts of the gateway, especially secrets, authentication, budget enforcement, provider calls, and persistence, I verified the behavior by running the application and testing the actual system.

The final implementation was therefore driven by a combination of AI assistance, documentation/research, manual reasoning, and real testing.
