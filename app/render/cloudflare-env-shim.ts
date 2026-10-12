/**
 * Render's Node.js deployment intentionally ships without Cloudflare D1/R2.
 * Billing endpoints fail closed via billingRuntime() when BILLING_DB is absent.
 * This shim must be used only by vite.render.config.ts.
 */
export const env: Record<string, unknown> = Object.freeze({});
