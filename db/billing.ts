import { env } from "cloudflare:workers";
import { database } from "./raw";

// Stripe subscriptions for the Pro plan. Everything stays disabled until the
// server-only secrets below are configured in the Sites environment.
export const billingSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS subscriptions (owner_id TEXT PRIMARY KEY NOT NULL, customer_id TEXT NOT NULL, subscription_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'incomplete', interval TEXT NOT NULL DEFAULT '', current_period_end INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_customer_idx ON subscriptions (customer_id)`,
];

export class BillingError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

type BillingConfig = { secret: string; webhookSecret: string; monthly: string; yearly: string };

export function billingConfig(): BillingConfig | null {
  const e = env as unknown as Record<string, string | undefined>;
  const config = { secret: e.STRIPE_SECRET_KEY ?? "", webhookSecret: e.STRIPE_WEBHOOK_SECRET ?? "", monthly: e.STRIPE_PRICE_MONTHLY ?? "", yearly: e.STRIPE_PRICE_YEARLY ?? "" };
  return /^sk_(test|live)_/.test(config.secret) && /^whsec_/.test(config.webhookSecret) && /^price_/.test(config.monthly) && /^price_/.test(config.yearly) ? config : null;
}

const activeStatuses = new Set(["active", "trialing", "past_due"]);

export async function activeSubscription(owner: string) {
  try {
    const row = await database().prepare("SELECT status, interval, current_period_end, customer_id FROM subscriptions WHERE owner_id=?").bind(owner)
      .first<{ status: string; interval: string; current_period_end: number; customer_id: string }>();
    if (!row) return null;
    // A day of grace covers webhook delays around renewal.
    const active = activeStatuses.has(row.status) && row.current_period_end * 1000 + 86_400_000 > Date.now();
    return { ...row, active };
  } catch {
    return null;
  }
}

function form(values: Record<string, string>) {
  return new URLSearchParams(values).toString();
}

async function stripe(config: BillingConfig, path: string, values: Record<string, string>) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form(values),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new BillingError("Ödeme sağlayıcısı isteği tamamlayamadı. Biraz sonra tekrar dene.", 502);
  return body;
}

export async function createCheckout(owner: string, interval: "monthly" | "yearly", origin: string) {
  const config = billingConfig();
  if (!config) throw new BillingError("Ödemeler henüz açılmadı.", 503);
  const current = await activeSubscription(owner);
  if (current?.active) throw new BillingError("Pro aboneliğin zaten aktif. Yönetmek için “Aboneliği yönet”i kullan.", 409);
  const values: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": interval === "yearly" ? config.yearly : config.monthly,
    "line_items[0][quantity]": "1",
    client_reference_id: owner,
    "metadata[owner_id]": owner,
    "subscription_data[metadata][owner_id]": owner,
    allow_promotion_codes: "true",
    success_url: `${origin}/?billing=success`,
    cancel_url: `${origin}/?billing=cancelled`,
  };
  if (current?.customer_id) values.customer = current.customer_id;
  const session = await stripe(config, "/checkout/sessions", values);
  if (typeof session.url !== "string" || !session.url.startsWith("https://checkout.stripe.com/")) throw new BillingError("Ödeme sayfası açılamadı.", 502);
  return session.url;
}

export async function createPortal(owner: string, origin: string) {
  const config = billingConfig();
  if (!config) throw new BillingError("Ödemeler henüz açılmadı.", 503);
  const current = await activeSubscription(owner);
  if (!current?.customer_id) throw new BillingError("Yönetilecek bir abonelik bulunamadı.", 404);
  const session = await stripe(config, "/billing_portal/sessions", { customer: current.customer_id, return_url: `${origin}/` });
  if (typeof session.url !== "string" || !session.url.startsWith("https://billing.stripe.com/")) throw new BillingError("Abonelik sayfası açılamadı.", 502);
  return session.url;
}

const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Stripe-Signature: t=<unix>,v1=<hex hmac-sha256 of "t.payload">; rejects replays older than 5 minutes.
export async function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()) {
  if (!header) return false;
  const parts = header.split(",").map((part) => part.split("=", 2) as [string, string]);
  const timestamp = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(timestamp) || !signatures.length || Math.abs(now / 1000 - timestamp) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  return signatures.some((signature) => safeEqual(signature, expected));
}

type StripeSubscription = {
  id: string; customer: string; status: string; metadata?: Record<string, string>;
  current_period_end?: number;
  items?: { data?: { current_period_end?: number; price?: { recurring?: { interval?: string } } }[] };
};

export async function handleStripeEvent(event: { type: string; data: { object: Record<string, unknown> } }) {
  const db = database();
  const now = new Date().toISOString();
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { client_reference_id?: string; customer?: string; subscription?: string; mode?: string };
    if (session.mode !== "subscription" || !session.client_reference_id || typeof session.customer !== "string") return;
    await db.prepare(`INSERT INTO subscriptions (owner_id,customer_id,subscription_id,status,updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(owner_id) DO UPDATE SET customer_id=excluded.customer_id, subscription_id=excluded.subscription_id, updated_at=excluded.updated_at`)
      .bind(session.client_reference_id, session.customer, session.subscription ?? "", "incomplete", now).run();
    return;
  }
  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as unknown as StripeSubscription;
    const item = sub.items?.data?.[0];
    // Newer API versions moved the period end onto subscription items.
    const periodEnd = sub.current_period_end ?? item?.current_period_end ?? 0;
    const interval = item?.price?.recurring?.interval === "year" ? "yearly" : item?.price?.recurring?.interval === "month" ? "monthly" : "";
    const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
    const owner = sub.metadata?.owner_id
      ?? (await db.prepare("SELECT owner_id FROM subscriptions WHERE customer_id=?").bind(sub.customer).first<{ owner_id: string }>())?.owner_id;
    if (!owner) return;
    await db.prepare(`INSERT INTO subscriptions (owner_id,customer_id,subscription_id,status,interval,current_period_end,updated_at) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(owner_id) DO UPDATE SET customer_id=excluded.customer_id, subscription_id=excluded.subscription_id, status=excluded.status, interval=excluded.interval, current_period_end=excluded.current_period_end, updated_at=excluded.updated_at`)
      .bind(owner, sub.customer, sub.id, status, interval, periodEnd, now).run();
  }
}
