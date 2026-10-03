import { env } from 'cloudflare:workers';
import { billingConfig } from './core';
export function billingRuntime() {
  const e=env as unknown as Record<string,unknown>;
  const config=billingConfig(Object.fromEntries(Object.entries(e).filter((entry):entry is [string,string]=>typeof entry[1]==='string')));
  const db=e.BILLING_DB as D1Database|undefined;
  return config&&db ? {config,db}:null;
}
export async function billingAccount(request:Request,db:D1Database) {
  const token=request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-bahn-session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!token) return null;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  return db.prepare('SELECT a.account_id, a.stripe_customer_id FROM billing_sessions s JOIN billing_accounts a ON a.account_id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').bind(hash,Math.floor(Date.now()/1000)).first<{account_id:string;stripe_customer_id:string}>();
}
export function billingUnavailable() {return Response.json({error:'Das Abonnement wird noch eingerichtet. Es wurden keine Zahlungen gestartet.'},{status:503,headers:{'Cache-Control':'no-store'}});}
