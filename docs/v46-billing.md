# V46: saved commutes and Stripe sandbox

Free now includes up to 20 device-local saved origin/destination pairs, reverse-route shortcuts, restore after reload and deletion in the planner/profile. Every journey search remains fresh; no historical realtime status is stored. Browser storage failure is disclosed. No location history or card information is collected.

The owner approved EUR 3.99/month and EUR 29.99/year and selected Neral AI Sandbox (`acct_1UDiCBAHzgzpPLMP`). Resources created:

- Product: `prod_VNIC1kT05Nekro`
- Monthly price: `price_1UMXcPAHzgzpPLMPyzSsEZu1`, EUR399 cents, month, tax-inclusive
- Annual price: `price_1UMXcTAHzgzpPLMP7ZCC7eHn`, EUR2999 cents, year, tax-inclusive
- Dedicated portal configuration: `bpc_1UMXf7AHzgzpPLMPuSEI2Ipz`, invoice history, payment-method updates, cancellation at period end; plan changes disabled

These are sandbox objects, never live prices. A hosted sandbox Checkout Session was actually created and Stripe returned total 399, livemode=false, status=open. It was not paid; a completed purchase, renewal, refund or portal cancellation has not been certified. No customer was created or charged by this check.

## Server implementation

`POST /api/subscription/checkout` authenticates a server session, checks same-origin, allowlists billing interval and verifies actual Stripe price amount/currency/interval. It checks existing subscriptions/open Checkout, uses an idempotency key and creates hosted Checkout with flexible billing and a fixed return origin. `POST /api/subscription/portal` uses the dedicated configuration and the authenticated customer's ID, never a client-supplied customer.

`POST /api/stripe/webhook` verifies signatures on the raw body using the official SDK/SubtleCrypto, rejects live events and inserts event IDs idempotently. Invalid signatures return 400; storage failures return 500 for retries. Entitlements are not cached from event payloads: authenticated `GET /api/subscription` retrieves current Stripe state directly. Thus replay/out-of-order events and success redirects cannot grant or restore Plus. Only an active sandbox subscription with the allowlisted price, quantity one and unexpired period is eligible; provider/database/auth failure returns Free. This simple correctness-first implementation adds provider latency; future server caching must preserve revocation semantics.

## Configuration and remaining activation work

Public app shows prices and explicitly says Plus is not yet bookable. Profile/favorites/routes remain device-local; there is no online login, sync or travel-alert service yet. The new endpoints are integration foundations, not an active customer billing launch.

Sites runtime has non-secret BILLING_MODE=test, BILLING_ORIGIN, STRIPE_PRICE_MONTH, STRIPE_PRICE_YEAR and STRIPE_PORTAL_CONFIGURATION. No key/signing secret is in source or client code. Before test checkout can run end to end:

1. Supply a restricted sandbox API key as secret STRIPE_SECRET_KEY and endpoint signing secret STRIPE_WEBHOOK_SECRET through runtime secret configuration. Never paste keys into repository/chat. Register endpoint events for checkout completion/async success, invoice paid/payment failed and subscription lifecycle.
2. Provision dedicated BILLING_DB and apply `migrations/0001_billing.sql`. The current hosting manifest has no D1 binding: it has deliberately not been given a made-up database ID. Missing configuration returns 503 for mutations.
3. Integrate real authentication. A verified account must own a Stripe customer. The authentication provider issues a random 32-byte session token in `__Host-bahn-session` with Secure, HttpOnly, SameSite=Lax, Path=/ and stores its SHA256 digest/expiry in billing_sessions. Browser local profiles and localStorage never create this association. Implement login, logout/revocation, account recovery/export/deletion and cross-account tests before exposing any checkout button.
4. Deliver the promised Plus sync/alerts, then run completed sandbox checkout, concurrent duplicate purchases, cancellation, failed renewal, expiry, refunds and portal tests. The app currently grants no functional online sync.
5. Production/live billing is explicitly rejected by billingConfig. Live launch needs a separately reviewed change, merchant/tax setup, consumer-facing terms/privacy/cancellation requirements and live-mode tests. Automatic tax is not enabled; no tax registration has been assumed.

## Verification

`pnpm audit:billing` tests sandbox-only configuration, origin matching, expired/invalid/cancelled/unpaid subscription boundaries, valid and tampered SDK-signed webhooks and bounded validated routes. Responsive QA additionally tests route restore/reverse/save/delete at 320/390/1440, and that all unconfigured billing mutations return 503.
