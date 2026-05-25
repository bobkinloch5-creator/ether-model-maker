import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Coins, Check, ArrowLeft, Sparkles, Zap, Shield, Loader2, ExternalLink, Ticket, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { purchaseCredits } from "@/lib/supabase";
import { PAYPAL_ME_USERNAME } from "@/lib/plans";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { toast } from "sonner";

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: "Buy Credits — AI 3D Generation | KingDavez" },
      { name: "description", content: "Purchase generation credits for AI 3D models, PBR textures, and image-to-mesh via PayPal. Pay only for what you use — no subscriptions." },
      { name: "keywords", content: "buy 3D generation credits, AI mesh credits, PayPal 3D models, game asset credits, Second Life mesh credits, PBR texture credits" },
      { property: "og:title", content: "Buy Credits — AI 3D Generation" },
      { property: "og:description", content: "Generation credits for AI 3D models and textures via PayPal. No subscriptions." },
      { property: "og:url", content: "https://kingdavez.click/credits" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Buy Credits — AI 3D Generation | KingDavez" },
    { name: "twitter:description", content: "Purchase generation credits for AI 3D models, PBR textures, and image-to-mesh via PayPal." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/credits" }],
  }),
  component: CreditsPage,
});

type Pack = { credits: number; cost: number; label: string; badge?: string; perk: string };

const PACKS: Pack[] = [
  { credits: 50, cost: 5, label: "Spark", perk: "~25 text-to-3D runs" },
  { credits: 150, cost: 12, label: "Builder", badge: "Best value", perk: "~75 text-to-3D runs" },
  { credits: 400, cost: 25, label: "Studio", perk: "~200 text-to-3D runs" },
];

function CreditsPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Pack | null>(null);
  const [customCredits, setCustomCredits] = useState<string>("");
  const [success, setSuccess] = useState<{ credits: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const redeemPromo = async () => {
    if (!promoCode.trim()) return;
    setRedeeming(true);
    setRedeemResult(null);
    const { data, error } = await supabase.rpc("redeem_promo", { _code: promoCode.trim() });
    if (error) {
      setRedeemResult({ ok: false, msg: error.message });
      toast.error(error.message);
    } else {
      const r = data as { credits: number; code: string };
      setRedeemResult({ ok: true, msg: `+${r.credits} credits added from ${r.code}` });
      toast.success(`+${r.credits} credits redeemed`);
      setPromoCode("");
      await refreshProfile();
    }
    setRedeeming(false);
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const customPack = (): Pack | null => {
    const n = parseInt(customCredits, 10);
    if (!Number.isFinite(n) || n < 10) return null;
    return { credits: n, cost: Math.max(1, Math.round(n * 0.1 * 100) / 100), label: "Custom", perk: `${n} credits` };
  };

  const handleApprove = async (pack: Pack, transactionId?: string) => {
    if (!user) return;
    setProcessing(true);
    try {
      const purchaseId = await purchaseCredits(user.id, pack.credits, "paypal", transactionId, pack.cost);
      if (purchaseId !== null) {
        setSuccess({ credits: pack.credits });
        toast.success("Payment submitted — awaiting owner approval");
      } else {
        toast.error("Could not submit payment. Make sure you pasted a valid PayPal transaction ID, then try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-28 pb-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex items-center justify-between gap-4">
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/credits/history" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/10">
                History
              </Link>
              {profile && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
                  <Coins className="h-4 w-4 text-primary-glow" />
                  <span className="text-muted-foreground">Balance:</span>
                  <span className="font-semibold">
                    {profile.is_owner ? "∞" : profile.credits.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <header className="mt-8 text-center">
            <p className="text-sm font-medium text-primary-glow">Credits</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Top up your <span className="gradient-text">balance</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Pay only for what you use. No subscriptions, no plans — just credits that never expire.
            </p>
          </header>

          {/* Promo redeem */}
          <div className="mt-10 rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-transparent p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-fuchsia-500/20 text-fuchsia-200">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">Have a promo code?</h3>
                  <p className="text-xs text-muted-foreground">Redeem it for free credits — one per account.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") redeemPromo(); }}
                  placeholder="ENTER CODE"
                  maxLength={32}
                  className="h-10 w-44 rounded-lg border border-white/10 bg-black/40 px-3 font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-fuchsia-400/50"
                />
                <button
                  onClick={redeemPromo}
                  disabled={redeeming || !promoCode.trim()}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--gradient-primary)] px-4 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
                >
                  {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                  Redeem
                </button>
              </div>
            </div>
            {redeemResult && (
              <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${redeemResult.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                {redeemResult.msg}
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {PACKS.map((p) => {
              const isSelected = selected?.label === p.label;
              return (
                <button
                  key={p.label}
                  onClick={() => setSelected(p)}
                  className={`group relative text-left rounded-2xl border p-6 transition ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                  }`}
                >
                  {p.badge && (
                    <span className="absolute -top-2 right-4 rounded-full bg-[var(--gradient-primary)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      {p.badge}
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary-glow" /> {p.label}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-semibold">{p.credits}</span>
                    <span className="text-sm text-muted-foreground">credits</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{p.perk}</div>
                  <div className="mt-4 text-2xl font-semibold text-primary-glow">${p.cost.toFixed(2)}</div>
                </button>
              );
            })}
          </div>

          {/* Custom pack */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Custom amount</h3>
                <p className="text-sm text-muted-foreground">$0.10 per credit · minimum 10 credits</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={customCredits}
                  onChange={(e) => {
                    setCustomCredits(e.target.value);
                    const cp = (() => {
                      const n = parseInt(e.target.value, 10);
                      if (!Number.isFinite(n) || n < 10) return null;
                      return { credits: n, cost: Math.max(1, Math.round(n * 0.1 * 100) / 100), label: "Custom", perk: `${n} credits` } as Pack;
                    })();
                    setSelected(cp);
                  }}
                  placeholder="e.g. 250"
                  className="w-32 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm">
                  ${(customPack()?.cost ?? 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Checkout */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-card p-6">
            {!selected ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Select a credit pack above to continue with PayPal.
              </p>
            ) : success ? (
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold text-emerald-400">Payment successful</h3>
                <p className="text-sm text-muted-foreground">
                  Added <span className="font-semibold text-foreground">{success.credits}</span> credits to your account.
                </p>
                <p className="text-sm text-muted-foreground">
                  New balance: <span className="font-semibold text-foreground">{profile?.is_owner ? "∞" : (profile?.credits ?? 0).toLocaleString()}</span> credits
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => { setSuccess(null); setSelected(null); setCustomCredits(""); }}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/5"
                  >
                    Buy more
                  </button>
                  <Link
                    to="/generate"
                    className="rounded-xl bg-[var(--gradient-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                  >
                    Start generating
                  </Link>
                </div>
              </div>
            ) : processing ? (
              <div className="py-10 text-center space-y-4">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/20 text-primary-glow">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <h3 className="font-display text-lg font-semibold">Processing payment…</h3>
                <p className="text-sm text-muted-foreground">
                  Adding {selected.credits} credits to your account. This takes just a moment.
                </p>
              </div>
            ) : (
              <PaypalCheckout
                pack={selected}
                userEmail={user?.email ?? null}
                userId={user?.id ?? ""}
                onConfirm={(txid) => handleApprove(selected, txid)}
              />
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Payments are sent directly to <span className="font-semibold text-foreground">paypal.me/{PAYPAL_ME_USERNAME}</span>. Credits are released after payment is confirmed.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PaypalCheckout({
  pack,
  userEmail,
  userId,
  onConfirm,
}: {
  pack: Pack;
  userEmail: string | null;
  userId: string;
  onConfirm: (txid: string) => Promise<void> | void;
}) {
  const [opened, setOpened] = useState(false);
  const [txid, setTxid] = useState("");
  const [autoGranting, setAutoGranting] = useState(false);
  const [granted, setGranted] = useState(false);

  const ref = useMemo(
    () => `kd-${userId.slice(0, 8)}-${Date.now().toString(36)}`,
    [userId, pack.credits, pack.cost],
  );

  const note = encodeURIComponent(
    [
      "KingDavez Studios",
      `${pack.credits} credits`,
      `ref ${ref}`,
      userEmail ? `user ${userEmail}` : undefined,
    ]
      .filter(Boolean)
      .join(" - "),
  );

  const paypalUrl = `https://paypal.me/${PAYPAL_ME_USERNAME}/${pack.cost.toFixed(2)}USD?note=${note}`;

  const doGrant = async (value: string) => {
    const clean = value.trim();
    if (!clean || autoGranting || granted) return;
    setAutoGranting(true);
    try {
      await onConfirm(clean);
      setGranted(true);
      setTxid("");
    } finally {
      setAutoGranting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
        <div>
          <div className="text-xs text-muted-foreground">{pack.label} pack</div>
          <div className="font-semibold">{pack.credits} credits</div>
        </div>
        <div className="text-2xl font-semibold text-emerald-400">${pack.cost.toFixed(2)}</div>
      </div>

      {granted ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <Check className="h-4 w-4" /> Credits added automatically
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Your balance has been updated. Refresh the dashboard to see it.
          </p>
        </div>
      ) : (
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="font-semibold text-foreground">1. Send payment via PayPal</div>
            <p className="mt-1">
              Open <span className="font-mono text-foreground">paypal.me/{PAYPAL_ME_USERNAME}</span> for{" "}
              <span className="font-semibold text-emerald-400">${pack.cost.toFixed(2)}</span>. The note is pre-filled with your reference{" "}
              <span className="font-mono text-foreground">{ref}</span> — please keep it.
            </p>
            <a
              href={paypalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpened(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0070ba] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005ea6] transition"
            >
              Pay ${pack.cost.toFixed(2)} on PayPal <ExternalLink className="h-4 w-4" />
            </a>
          </li>

          <li className={`rounded-xl border p-4 transition ${opened ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"}`}>
            <div className="font-semibold text-foreground">2. Paste your PayPal transaction ID</div>
            <p className="mt-1">
              After paying, copy your PayPal transaction / receipt ID and paste it here. Credits will be added instantly.
            </p>
            <div className="mt-3">
              <input
                value={txid}
                onChange={(e) => {
                  const val = e.target.value;
                  setTxid(val);
                  if (val.trim().length > 6) doGrant(val);
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  if (pasted.trim().length > 6) {
                    e.preventDefault();
                    setTxid(pasted);
                    doGrant(pasted);
                  }
                }}
                placeholder="PayPal transaction / receipt ID"
                disabled={autoGranting}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
              />
              {autoGranting && (
                <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying and adding credits…
                </div>
              )}
            </div>
          </li>
        </ol>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Paid directly to paypal.me/{PAYPAL_ME_USERNAME}</span>
        <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Keep your reference {ref}</span>
      </div>
    </div>
  );
}
