import { identityFromRequest } from "@/db/workspace";
import { activeSubscription, billingConfig, BillingError, createCheckout, createPortal, handleStripeEvent, verifyStripeSignature } from "@/db/billing";
import { membershipFor } from "@/db/membership";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ operation: string }> };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request, context: Context) {
  const { operation } = await context.params;
  if (operation !== "status") return json({ error: "Not found" }, 404);
  const user = await identityFromRequest(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const [membership, subscription] = await Promise.all([membershipFor(user.id), activeSubscription(user.id)]);
  return json({
    configured: !!billingConfig(),
    plan: membership.plan,
    subscription: subscription ? { status: subscription.status, interval: subscription.interval, active: subscription.active, renewsAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null } : null,
  });
}

export async function POST(request: Request, context: Context) {
  const { operation } = await context.params;

  // Stripe calls this directly: no user session, authenticity comes from the signature.
  if (operation === "webhook") {
    const config = billingConfig();
    if (!config) return json({ error: "Billing disabled" }, 503);
    const payload = await request.text();
    if (payload.length > 512_000) return json({ error: "Too large" }, 413);
    if (!(await verifyStripeSignature(payload, request.headers.get("stripe-signature"), config.webhookSecret))) return json({ error: "Invalid signature" }, 400);
    try { await handleStripeEvent(JSON.parse(payload)); }
    catch (error) { console.error("Stripe webhook failed", error); return json({ error: "Webhook failed" }, 500); }
    return json({ received: true });
  }

  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") && request.headers.get("origin") !== origin) return json({ error: "Forbidden" }, 403);
  const user = await identityFromRequest(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  try {
    if (operation === "checkout") {
      const text = await request.text();
      if (text.length > 200) return json({ error: "Too large" }, 413);
      const { interval } = JSON.parse(text || "{}") as { interval?: unknown };
      if (interval !== "monthly" && interval !== "yearly") return json({ error: "Plan seçimi geçersiz." }, 400);
      if ((await membershipFor(user.id)).plan === "founder") return json({ error: "Kurucu hesabının ödemeye ihtiyacı yok." }, 409);
      return json({ url: await createCheckout(user.id, interval, origin) });
    }
    if (operation === "portal") return json({ url: await createPortal(user.id, origin) });
  } catch (error) {
    if (error instanceof BillingError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: "Plan seçimi geçersiz." }, 400);
    console.error("Billing request failed", error);
    return json({ error: "Ödeme isteği tamamlanamadı." }, 502);
  }
  return json({ error: "Not found" }, 404);
}
