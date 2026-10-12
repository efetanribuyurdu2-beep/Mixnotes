"use client";
import { L } from "./localized";

import { useEffect, useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";

type BillingStatus = { configured: boolean; plan: string; subscription: { status: string; interval: string; active: boolean; renewsAt: string | null } | null };

export function useBillingStatus() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/billing/status", { cache: "no-store" }).then((r) => (r.ok ? r.json() as Promise<BillingStatus> : null))
      .then((value) => { if (live) setStatus(value); }).catch(() => { if (live) setStatus(null); });
    return () => { live = false; };
  }, []);
  return status;
}

async function redirect(path: string, body?: unknown) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json() as { url?: string; error?: string };
  if (!response.ok || !value.url) throw new Error(value.error || "Ödeme isteği tamamlanamadı.");
  window.location.assign(value.url);
}

// Pro card actions. Renders nothing until Stripe keys are configured on the server.
export function ProBillingActions({ status }: { status: BillingStatus | null }) {
  const [working, setWorking] = useState<"" | "monthly" | "yearly" | "portal">("");
  const [error, setError] = useState("");
  if (!status?.configured || status.plan === "founder") return null;

  async function run(kind: "monthly" | "yearly" | "portal") {
    setWorking(kind); setError("");
    try { await (kind === "portal" ? redirect("/api/billing/portal") : redirect("/api/billing/checkout", { interval: kind })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Ödeme isteği tamamlanamadı."); setWorking(""); }
  }

  const sub = status.subscription;
  return (
    <div className="billing-actions">
      {sub?.active ? (
        <>
          <p className="billing-state"><L text="Pro aktif" /> · {sub.interval === "yearly" ? <L text="Yıllık" /> : <L text="Aylık" />}{sub.renewsAt && <> · <L text="yenileme" /> {new Date(sub.renewsAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</>}</p>
          <button className="button secondary" disabled={!!working} onClick={() => run("portal")}>{working === "portal" ? <LoaderCircle className="spin" size={15} /> : <CreditCard size={15} />}<L text="Aboneliği yönet" /></button>
        </>
      ) : (
        <>
          <button className="button primary" disabled={!!working} onClick={() => run("monthly")}>{working === "monthly" && <LoaderCircle className="spin" size={15} />}<L text="Aylık Pro'ya geç" /></button>
          <button className="button secondary" disabled={!!working} onClick={() => run("yearly")}>{working === "yearly" && <LoaderCircle className="spin" size={15} />}<L text="Yıllık Pro'ya geç" /></button>
        </>
      )}
      {error && <p className="inline-error" role="alert"><L text={error} /></p>}
      <small><L text="Ödeme Stripe'ın güvenli sayfasında alınır; kart bilgilerin MixNotes'a gelmez. İstediğin zaman iptal edebilirsin." /></small>
    </div>
  );
}
