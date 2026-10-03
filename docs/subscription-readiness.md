# V45: Profile and subscription preparation

The existing application had no account, subscription or billing integration. V45 adds a local profile, a shared Free/Plus catalog and a read-only `GET /api/subscription` endpoint. Free features remain available; Plus is explicitly planned and cannot be purchased. No price, payment provider or launch date has been approved.

## Implemented

- A native modal settings dialog on mobile and desktop, with keyboard dismissal and focus restoration.
- A device-local display name and home station; persistence failure is reported. Profiles can be deleted. No password or email is collected, and no location is stored in the profile.
- Shared product definitions in `app/subscription-plans.ts`. Anonymous entitlements always return Free, with checkout and synchronization disabled. Editing local storage cannot grant a paid plan.

## Before billing can be enabled

1. Select a payment provider, approve pricing, terms, cancellation and privacy disclosures, and identify the merchant account. Configure credentials through Sites runtime secrets, never source code.
2. Add real authenticated accounts and a database. Suggested server-owned records: account ID, provider customer ID, subscription ID, plan ID, status, paid-through date and processed webhook IDs. Do not use a browser-created profile as authentication.
3. Add an authenticated checkout endpoint and customer portal. Generate sessions server-side, allowlist plan IDs and return URLs, require explicit purchase confirmation, and reject checkout while configuration is incomplete.
4. Verify webhook signatures against the raw body; process idempotently and tolerate out-of-order delivery. Grant Plus only from verified provider events; revoke on expiry/cancellation. Never trust a success redirect or client-supplied entitlement.
5. Add account export/deletion, synchronization and only the Plus features shown in the catalog. The catalog describes planned functionality, not functionality currently delivered.
6. Validate provider test mode: checkout, cancellation, refunds, failed renewals, webhook replays, expired sessions and cross-account authorization. Production billing remains disabled until these checks and merchant setup are complete.

This change intentionally introduces no payment dependency, account database, simulated purchase flow or automatic charge.
