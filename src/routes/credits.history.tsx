import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  ArrowLeft, Coins, Gift, ShoppingCart, Wand2, ShieldCheck, Sparkles, Download, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/credits/history")({
  head: () => ({
    meta: [
      { title: "Credit History — KingDavez Studios (Beta)" },
      { name: "description", content: "Full audit log of every credit grant, PayPal purchase, generation deduction, and referral bonus on your KingDavez Studios account." },
      { property: "og:title", content: "Credit History — KingDavez Studios" },
      { property: "og:description", content: "Audit log of every credit grant, purchase, and deduction on your account." },
      { property: "og:url", content: "https://kingdavez.click/credits/history" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/credits/history" }],
  }),
  component: HistoryPage,
});

type LedgerRow = {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number | null;
  kind: string;
  reason: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Filter = "all" | "grants" | "purchases" | "deductions";

const KIND_META: Record<string, { label: string; icon: typeof Coins; cls: string }> = {
  signup_bonus: { label: "Signup bonus", icon: Gift, cls: "text-emerald-400 bg-emerald-500/10" },
  admin_signup_bonus: { label: "Owner grant", icon: ShieldCheck, cls: "text-amber-400 bg-amber-500/10" },
  purchase: { label: "Purchase", icon: ShoppingCart, cls: "text-blue-400 bg-blue-500/10" },
  generation: { label: "Generation", icon: Wand2, cls: "text-pink-400 bg-pink-500/10" },
  admin_adjustment: { label: "Admin adjustment", icon: ShieldCheck, cls: "text-amber-400 bg-amber-500/10" },
  owner_free_use: { label: "Owner (free)", icon: Sparkles, cls: "text-muted-foreground bg-white/5" },
};

function HistoryPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      const { data, error } = await supabase
        .from("credit_ledger")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!cancelled) {
        if (error) console.error("ledger load", error);
        setRows((data ?? []) as LedgerRow[]);
        setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const totals = useMemo(() => {
    let granted = 0, spent = 0, purchased = 0;
    for (const r of rows) {
      if (r.amount > 0) granted += r.amount;
      if (r.amount < 0) spent += -r.amount;
      if (r.kind === "purchase") purchased += r.amount;
    }
    return { granted, spent, purchased };
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "purchases") return rows.filter((r) => r.kind === "purchase");
    if (filter === "grants") return rows.filter((r) => r.amount > 0 && r.kind !== "purchase");
    return rows.filter((r) => r.amount < 0);
  }, [rows, filter]);

  const exportCsv = () => {
    const header = ["created_at", "kind", "amount", "balance_after", "reason", "reference_id"];
    const csv = [
      header.join(","),
      ...rows.map((r) => [
        r.created_at,
        r.kind,
        r.amount,
        r.balance_after ?? "",
        JSON.stringify(r.reason ?? ""),
        r.reference_id ?? "",
      ].join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `credit-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
              <Link to="/credits" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">
                Buy credits
              </Link>
              <button
                onClick={exportCsv}
                disabled={!rows.length}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
          </div>

          <header className="mt-8">
            <p className="text-sm font-medium text-primary-glow">Credit history</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
              Every <span className="gradient-text">credit movement</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Full audit log of grants, purchases, and deductions on your account.
            </p>
          </header>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            <Stat label="Current balance" value={profile?.is_owner ? "∞" : (profile?.credits ?? 0).toLocaleString()} />
            <Stat label="Total granted" value={`+${totals.granted.toLocaleString()}`} accent="text-emerald-400" />
            <Stat label="Total purchased" value={`+${totals.purchased.toLocaleString()}`} accent="text-blue-400" />
            <Stat label="Total spent" value={`-${totals.spent.toLocaleString()}`} accent="text-pink-400" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {(["all", "grants", "purchases", "deductions"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                  filter === f
                    ? "bg-[var(--gradient-primary)] text-white"
                    : "border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} of {rows.length} entries
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-card">
            {busy ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No entries to show.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {filtered.map((r) => {
                  const meta = KIND_META[r.kind] ?? { label: r.kind, icon: Coins, cls: "text-muted-foreground bg-white/5" };
                  const Icon = meta.icon;
                  const isPositive = r.amount > 0;
                  const isZero = r.amount === 0;
                  return (
                    <li key={r.id} className="flex items-start gap-4 px-4 py-4 sm:px-6">
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.cls}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-semibold">{meta.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString()}
                          </span>
                        </div>
                        {r.reason && (
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{r.reason}</p>
                        )}
                        {r.reference_id && (
                          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/70">
                            ref: {r.reference_id}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-display text-lg font-semibold ${
                          isZero ? "text-muted-foreground" : isPositive ? "text-emerald-400" : "text-pink-400"
                        }`}>
                          {isZero ? "0" : `${isPositive ? "+" : ""}${r.amount}`}
                        </div>
                        {r.balance_after != null && (
                          <div className="text-[11px] text-muted-foreground">
                            balance: {r.balance_after.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
