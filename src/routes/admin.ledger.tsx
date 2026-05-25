import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ScrollText,
  Loader2,
  Search,
  Download,
  Filter,
  Coins,
  Plus,
  Minus,
  X,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  ShoppingCart,
  Wand2,
  Settings as SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ledger")({
  head: () => ({
    meta: [
      { title: "Credit Ledger — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    { name: "twitter:description", content: "Owner-only credit ledger and transaction history." },
    { name: "twitter:title", content: "Credit Ledger — KingDavez Studios" },
    { name: "twitter:card", content: "summary" },
    { property: "og:url", content: "https://kingdavez.click/admin/ledger" },
    { property: "og:description", content: "Owner-only credit ledger and transaction history." },
    { property: "og:title", content: "Credit Ledger — KingDavez Studios" },
    ],
  links: [{ rel: "canonical", href: "https://kingdavez.click/admin/ledger" }],
  }),
  component: AdminLedgerPage,
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

type ProfileLite = {
  id: string;
  email: string;
  display_name: string;
  credits: number;
  is_owner: boolean;
};

const KIND_META: Record<string, { label: string; color: string; icon: typeof Coins }> = {
  signup_bonus: { label: "Signup bonus", color: "text-emerald-300", icon: Gift },
  admin_signup_bonus: { label: "Owner bonus", color: "text-amber-300", icon: Crown },
  purchase: { label: "Purchase", color: "text-sky-300", icon: ShoppingCart },
  generation: { label: "Generation", color: "text-rose-300", icon: Wand2 },
  owner_free_use: { label: "Owner free use", color: "text-muted-foreground", icon: Crown },
  admin_adjustment: { label: "Admin adjust", color: "text-violet-300", icon: SettingsIcon },
};

function kindMeta(k: string) {
  return KIND_META[k] ?? { label: k, color: "text-foreground", icon: Coins };
}

function AdminLedgerPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isOwner = profile?.is_owner === true;

  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [drillUserId, setDrillUserId] = useState<string | null>(null);
  const [drillRows, setDrillRows] = useState<LedgerRow[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState<string>("");
  const [grantAmount, setGrantAmount] = useState<string>("100");
  const [grantNote, setGrantNote] = useState<string>("");
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: ledger, error: lerr }] = await Promise.all([
      supabase.from("profiles").select("id,email,display_name,credits,is_owner").order("email"),
      supabase
        .from("credit_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);
    if (lerr) toast.error(lerr.message);
    setProfiles((profs as ProfileLite[]) ?? []);
    setRows((ledger as LedgerRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isOwner) load();
  }, [isOwner]);

  const profilesById = useMemo(() => {
    const map = new Map<string, ProfileLite>();
    for (const p of profiles) map.set(p.id, p);
    return map;
  }, [profiles]);

  const kindOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.kind));
    return ["all", ...Array.from(set)];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (userFilter !== "all" && r.user_id !== userFilter) return false;
      if (!q) return true;
      const p = profilesById.get(r.user_id);
      return (
        p?.email?.toLowerCase().includes(q) ||
        p?.display_name?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.kind.toLowerCase().includes(q)
      );
    });
  }, [rows, search, kindFilter, userFilter, profilesById]);

  const totals = useMemo(() => {
    let granted = 0, spent = 0;
    filtered.forEach((r) => {
      if (r.amount >= 0) granted += r.amount;
      else spent += r.amount;
    });
    return { granted, spent, net: granted + spent };
  }, [filtered]);

  const openDrill = async (userId: string) => {
    setDrillUserId(userId);
    setDrillLoading(true);
    const { data, error } = await supabase.rpc("get_user_ledger", {
      target_user_id: userId,
      _limit: 500,
      _offset: 0,
    });
    if (error) toast.error(error.message);
    setDrillRows((data as LedgerRow[]) ?? []);
    setDrillLoading(false);
  };

  const grantCredits = async () => {
    const amt = parseInt(grantAmount, 10);
    if (!grantUserId) return toast.error("Pick a user");
    if (!Number.isFinite(amt) || amt === 0) return toast.error("Enter a non-zero amount");
    if (Math.abs(amt) > 10_000_000) return toast.error("Amount too large");
    setGranting(true);
    const { data, error } = await supabase.rpc("admin_adjust_credits", {
      target_user_id: grantUserId,
      delta: amt,
      note: grantNote.trim() || undefined,
    });
    setGranting(false);
    if (error) return toast.error(error.message);
    const target = profilesById.get(grantUserId);
    toast.success(`${amt > 0 ? "Granted" : "Removed"} ${Math.abs(amt).toLocaleString()} credits`, {
      description: `${target?.email ?? grantUserId} now has ${(data as number).toLocaleString()} credits`,
    });
    setGrantOpen(false);
    setGrantAmount("100");
    setGrantNote("");
    await load();
    if (drillUserId === grantUserId) await openDrill(grantUserId);
  };

  const exportCsv = () => {
    const header = ["created_at", "user_email", "kind", "amount", "balance_after", "reason", "reference_id"];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      const p = profilesById.get(r.user_id);
      const row = [
        r.created_at,
        p?.email ?? r.user_id,
        r.kind,
        r.amount,
        r.balance_after ?? "",
        (r.reason ?? "").replace(/"/g, '""'),
        r.reference_id ?? "",
      ].map((v) => `"${String(v)}"`).join(",");
      lines.push(row);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `credit-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <Crown className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-3 font-display text-2xl font-semibold">Owners only</h1>
          <p className="mt-2 text-sm text-muted-foreground">This page is restricted to site owners.</p>
          <Link to="/dashboard" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary-glow" />
              <span className="font-display font-semibold">Credit Ledger</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGrantOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--gradient-primary)] px-3 text-xs font-medium text-white shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.6)] transition hover:opacity-95"
            >
              <Plus className="h-3.5 w-3.5" /> Grant credits
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Entries shown" value={filtered.length.toLocaleString()} />
          <Stat label="Granted" value={`+${totals.granted.toLocaleString()}`} accent="text-emerald-300" />
          <Stat label="Spent" value={totals.spent.toLocaleString()} accent="text-rose-300" />
          <Stat label="Net flow" value={`${totals.net >= 0 ? "+" : ""}${totals.net.toLocaleString()}`} accent={totals.net >= 0 ? "text-emerald-300" : "text-rose-300"} />
        </div>

        {/* Filters */}
        <div className="mt-6 glass rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email, reason, kind…"
                className="h-10 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm focus:border-primary/50 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
              >
                {kindOptions.map((k) => (
                  <option key={k} value={k}>{k === "all" ? "All kinds" : kindMeta(k).label}</option>
                ))}
              </select>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm max-w-[200px]"
              >
                <option value="all">All users</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.email}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 glass rounded-2xl p-4">
          {loading ? (
            <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">When</th>
                    <th className="py-2 pr-4 font-medium">User</th>
                    <th className="py-2 pr-4 font-medium">Kind</th>
                    <th className="py-2 pr-4 font-medium text-right">Δ</th>
                    <th className="py-2 pr-4 font-medium text-right">Balance</th>
                    <th className="py-2 pr-4 font-medium">Reason</th>
                    <th className="py-2 pr-4 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 500).map((r) => {
                    const p = profilesById.get(r.user_id);
                    const meta = kindMeta(r.kind);
                    const Icon = meta.icon;
                    return (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-2 pr-4 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-4">
                          <button onClick={() => openDrill(r.user_id)} className="text-left hover:text-primary-glow transition">
                            <div className="font-medium">{p?.display_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{p?.email ?? r.user_id.slice(0, 8)}</div>
                          </button>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs ${meta.color}`}>
                            <Icon className="h-3 w-3" /> {meta.label}
                          </span>
                        </td>
                        <td className={`py-2 pr-4 text-right font-mono font-semibold ${r.amount > 0 ? "text-emerald-300" : r.amount < 0 ? "text-rose-300" : "text-muted-foreground"}`}>
                          {r.amount > 0 && <ArrowUpRight className="inline h-3 w-3" />}
                          {r.amount < 0 && <ArrowDownRight className="inline h-3 w-3" />}
                          {r.amount > 0 ? "+" : ""}{r.amount.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-xs text-muted-foreground">
                          {r.balance_after?.toLocaleString() ?? "—"}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground truncate max-w-[260px]">{r.reason || "—"}</td>
                        <td className="py-2 pr-4 text-right">
                          <button
                            onClick={() => { setGrantUserId(r.user_id); setGrantOpen(true); }}
                            className="rounded-md border border-white/10 bg-white/5 p-1 hover:bg-white/10"
                            title="Grant credits to this user"
                          >
                            <Coins className="h-3.5 w-3.5 text-amber-300" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No ledger entries match.</td></tr>
                  )}
                </tbody>
              </table>
              {filtered.length > 500 && (
                <p className="mt-2 text-xs text-muted-foreground text-center">Showing first 500 of {filtered.length}. Refine filters or export CSV.</p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Drill-down drawer */}
      {drillUserId && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setDrillUserId(null)}>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" />
          <div
            className="w-full max-w-2xl border-l border-white/10 bg-background overflow-y-auto animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-background/95 px-5 py-4 backdrop-blur">
              <div>
                <div className="text-xs text-muted-foreground">User drill-down</div>
                <div className="font-display font-semibold">{profilesById.get(drillUserId)?.email}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Balance: <span className="font-mono text-foreground">{profilesById.get(drillUserId)?.credits.toLocaleString()}</span>
                  {profilesById.get(drillUserId)?.is_owner && <Crown className="ml-1.5 inline h-3 w-3 text-primary-glow" />}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setGrantUserId(drillUserId); setGrantOpen(true); }}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--gradient-primary)] px-2.5 text-xs font-medium text-white"
                >
                  <Plus className="h-3 w-3" /> Grant
                </button>
                <button onClick={() => setDrillUserId(null)} className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="p-5">
              {drillLoading ? (
                <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
              ) : drillRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No ledger entries yet.</p>
              ) : (
                <ol className="space-y-2">
                  {drillRows.map((r) => {
                    const meta = kindMeta(r.kind);
                    const Icon = meta.icon;
                    return (
                      <li key={r.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 ${meta.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{meta.label}</span>
                            <span className={`font-mono text-sm font-semibold ${r.amount > 0 ? "text-emerald-300" : r.amount < 0 ? "text-rose-300" : "text-muted-foreground"}`}>
                              {r.amount > 0 ? "+" : ""}{r.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground truncate">{r.reason || "—"}</div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{new Date(r.created_at).toLocaleString()}</span>
                            <span>Balance: <span className="font-mono">{r.balance_after?.toLocaleString() ?? "—"}</span></span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grant credits modal */}
      {grantOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setGrantOpen(false)}>
          <div className="w-full max-w-md glass rounded-2xl p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-300" /> Grant credits
              </h3>
              <button onClick={() => setGrantOpen(false)} className="rounded-lg p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Logged in the ledger as <span className="font-mono">admin_adjustment</span>. Use a negative number to remove credits.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">User</label>
                <select
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
                >
                  <option value="">— pick a user —</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.email} ({p.credits.toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Amount (negative to remove)</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-mono"
                  />
                  <div className="flex gap-1">
                    {[100, 1000, 10000].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setGrantAmount(String(n))}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 text-xs hover:bg-white/10"
                      >+{n.toLocaleString()}</button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setGrantAmount("-" + Math.abs(parseInt(grantAmount || "0", 10) || 0))}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 text-xs text-rose-200 hover:bg-rose-500/20"
                      title="Flip sign"
                    ><Minus className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Note (optional)</label>
                <input
                  type="text"
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  placeholder="e.g. promo, refund #1234"
                  maxLength={200}
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
                />
              </div>
              <button
                onClick={grantCredits}
                disabled={granting || !grantUserId}
                className="h-11 w-full rounded-xl bg-[var(--gradient-primary)] text-sm font-medium text-white disabled:opacity-50"
              >
                {granting ? <Loader2 className="inline h-4 w-4 animate-spin" /> : "Apply adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold font-mono ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
