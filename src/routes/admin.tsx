import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Shield,
  Users,
  CreditCard,
  Activity,
  Loader2,
  Search,
  Plus,
  Crown,
  ArrowLeft,
  Scale,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Gift,
  Star,
  BarChart3,
  ShieldCheck,
  Ban,
  Trash2,
} from "lucide-react";
import { PromoManager } from "@/components/admin/PromoManager";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — KingDavez Studios (Beta)" },
      { name: "description", content: "Owner-only admin control panel." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

type AdminProfile = {
  id: string;
  email: string;
  display_name: string;
  credits: number;
  is_owner: boolean;
  is_manager: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
};

type Stats = {
  users: number;
  generations: number;
  credits: number;
  purchases: number;
};

type Analytics = {
  totals: {
    users: number;
    managers: number;
    owners: number;
    generations: number;
    credits_circulating: number;
    purchases_count: number;
    revenue_total: number;
    credits_sold: number;
    revenue_30d: number;
    new_users_30d: number;
    generations_30d: number;
    referrals_count: number;
  };
  daily: Array<{ day: string; new_users: number; generations: number; revenue: number; credits_sold: number }>;
  top_spenders: Array<{ email: string; display_name: string | null; spent: number; credits: number }>;
  recent_purchases: Array<{ id: string; created_at: string; amount_paid: number; credits: number; payment_method: string; email: string; display_name: string | null }>;
  recent_generations: Array<{ id: string; created_at: string; generation_type: string; credits_used: number; status: string; email: string }>;
};

function AdminPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [giftDialog, setGiftDialog] = useState<AdminProfile | null>(null);
  const [giftAmount, setGiftAmount] = useState<string>("500");

  type ReconRow = {
    user_id: string;
    email: string;
    display_name: string;
    is_owner: boolean;
    profile_credits: number;
    ledger_sum: number;
    diff: number;
    ledger_entries: number;
    last_entry_at: string | null;
  };
  const [recon, setRecon] = useState<ReconRow[] | null>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconRanAt, setReconRanAt] = useState<Date | null>(null);
  const [onlyMismatches, setOnlyMismatches] = useState(true);

  const runReconciliation = async () => {
    setReconLoading(true);
    setMsg(null);
    const { data, error } = await supabase.rpc("get_credit_reconciliation");
    if (error) {
      setMsg(`Reconciliation failed: ${error.message}`);
      setRecon([]);
    } else {
      setRecon((data as ReconRow[]) ?? []);
      setReconRanAt(new Date());
    }
    setReconLoading(false);
  };

  const isOwner = profile?.is_owner === true;

  const loadData = async () => {
    setLoading(true);
    try {
      const [profsRes, gensRes, pchsRes, analyticsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,email,display_name,credits,is_owner,is_manager,is_banned,ban_reason,created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("generations").select("*", { count: "exact", head: true }),
        supabase.from("purchases").select("*", { count: "exact", head: true }),
        supabase.rpc("admin_get_analytics"),
      ]);
      const rows = (profsRes.data as AdminProfile[] | null) ?? [];
      setProfiles(rows);
      setStats({
        users: rows.length,
        generations: gensRes.count ?? 0,
        purchases: pchsRes.count ?? 0,
        credits: rows.reduce((sum, r) => sum + (r.credits ?? 0), 0),
      });
      if (analyticsRes.error) {
        setMsg(`Analytics error: ${analyticsRes.error.message}`);
        setAnalytics(null);
      } else if (analyticsRes.data) {
        // Defensive: coerce missing arrays/numbers so the UI never crashes.
        const a = analyticsRes.data as Partial<Analytics> & { totals?: Partial<Analytics["totals"]> };
        setAnalytics({
          totals: {
            users: Number(a.totals?.users ?? 0),
            managers: Number(a.totals?.managers ?? 0),
            owners: Number(a.totals?.owners ?? 0),
            generations: Number(a.totals?.generations ?? 0),
            credits_circulating: Number(a.totals?.credits_circulating ?? 0),
            purchases_count: Number(a.totals?.purchases_count ?? 0),
            revenue_total: Number(a.totals?.revenue_total ?? 0),
            credits_sold: Number(a.totals?.credits_sold ?? 0),
            revenue_30d: Number(a.totals?.revenue_30d ?? 0),
            new_users_30d: Number(a.totals?.new_users_30d ?? 0),
            generations_30d: Number(a.totals?.generations_30d ?? 0),
            referrals_count: Number(a.totals?.referrals_count ?? 0),
          },
          daily: Array.isArray(a.daily) ? a.daily : [],
          top_spenders: Array.isArray(a.top_spenders) ? a.top_spenders : [],
          recent_purchases: Array.isArray(a.recent_purchases) ? a.recent_purchases : [],
          recent_generations: Array.isArray(a.recent_generations) ? a.recent_generations : [],
        });
      }
    } catch (err) {
      console.error("[admin] loadData failed", err);
      setMsg(`Failed to load admin data: ${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOwner) loadData();
  }, [isOwner]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login", search: { redirect: "/admin" } });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (authLoading || !user || profile) return;
    void refreshProfile();
  }, [authLoading, user, profile, refreshProfile]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) => p.email?.toLowerCase().includes(q) || p.display_name?.toLowerCase().includes(q),
    );
  }, [profiles, search]);

  const adjustCredits = async (userId: string, amount: number, label: string) => {
    setBusyId(userId);
    setMsg(null);
    const target = profiles.find((p) => p.id === userId);
    const { error } = await supabase.rpc("admin_adjust_credits", {
      target_user_id: userId,
      delta: amount,
      note: label,
    });
    if (error) setMsg(`Error: ${error.message}`);
    else {
      setMsg(`${amount >= 0 ? "Gifted" : "Removed"} ${Math.abs(amount).toLocaleString()} credits ${amount >= 0 ? "to" : "from"} ${target?.email}`);
      await loadData();
    }
    setBusyId(null);
  };

  const setUnlimited = async (userId: string) => {
    setBusyId(userId);
    const target = profiles.find((p) => p.id === userId);
    const delta = 999999 - (target?.credits ?? 0);
    const { error } = await supabase.rpc("admin_adjust_credits", {
      target_user_id: userId,
      delta,
      note: "Set unlimited from admin panel",
    });
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${target?.email} now has unlimited credits`); await loadData(); }
    setBusyId(null);
  };

  const toggleManager = async (p: AdminProfile) => {
    setBusyId(p.id);
    const { error } = await supabase.rpc("admin_set_manager", { target_user_id: p.id, value: !p.is_manager });
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${p.email} is ${!p.is_manager ? "now a manager" : "no longer a manager"}`); await loadData(); }
    setBusyId(null);
  };

  const toggleOwner = async (p: AdminProfile) => {
    if (!confirm(`${p.is_owner ? "Demote" : "Promote"} ${p.email} ${p.is_owner ? "from" : "to"} owner?`)) return;
    setBusyId(p.id);
    const { error } = await supabase.rpc("admin_set_owner", { target_user_id: p.id, value: !p.is_owner });
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${p.email} ${!p.is_owner ? "promoted to owner" : "demoted from owner"}`); await loadData(); }
    setBusyId(null);
  };

  const toggleBan = async (p: AdminProfile) => {
    let reason: string | null = null;
    if (!p.is_banned) {
      reason = prompt(`Ban ${p.email}?\n\nReason (shown in logs):`, "Violation of terms");
      if (reason === null) return;
    } else {
      if (!confirm(`Unban ${p.email}?`)) return;
    }
    setBusyId(p.id);
    const { error } = await supabase.rpc("admin_set_banned", { target_user_id: p.id, value: !p.is_banned, reason: reason ?? undefined });
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`${p.email} ${!p.is_banned ? "banned" : "unbanned"}`); await loadData(); }
    setBusyId(null);
  };

  const wipeGenerations = async (p: AdminProfile) => {
    if (!confirm(`Delete ALL of ${p.email}'s generation history? This cannot be undone.`)) return;
    setBusyId(p.id);
    const { data, error } = await supabase.rpc("admin_wipe_user_generations", { target_user_id: p.id });
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg(`Wiped ${data ?? 0} generations from ${p.email}`); await loadData(); }
    setBusyId(null);
  };

  if (authLoading || (user && !profile)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="grid min-h-screen place-items-center px-4 py-24">
        <div className="glass w-full max-w-lg rounded-3xl p-8 text-center shadow-[var(--shadow-elegant)]">
          <Shield className="mx-auto h-10 w-10 text-primary-glow" />
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Owner access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account is signed in, but it does not currently have owner access for the admin panel.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--gradient-primary)] px-4 text-sm font-medium text-white hover:opacity-95"
            >
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </button>
            <button
              onClick={() => void refreshProfile()}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-muted-foreground transition hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" /> Refresh access
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxRevenue = analytics ? Math.max(1, ...analytics.daily.map((d) => Number(d.revenue))) : 1;
  const maxGens = analytics ? Math.max(1, ...analytics.daily.map((d) => d.generations)) : 1;

  return (
    <div className="min-h-screen px-4 py-24">
      <div className="grid-bg absolute inset-0 -z-10" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[40vh] opacity-30" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.7 0.22 305 / 0.4), transparent 70%)" }} />

      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--gradient-primary)] glow">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Signed in as {profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-muted-foreground transition hover:bg-white/10">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <Link to="/admin/ledger" className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--gradient-primary)] px-4 text-sm font-medium text-white hover:opacity-95">
              <CreditCard className="h-4 w-4" /> Ledger
            </Link>
            <Link to="/dashboard" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-muted-foreground transition hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
          </div>
        </div>

        {/* KPI grid */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: DollarSign, label: "Revenue (all-time)", value: analytics ? `$${Number(analytics.totals.revenue_total).toFixed(2)}` : "—", accent: "text-emerald-300" },
            { icon: TrendingUp, label: "Revenue (30d)", value: analytics ? `$${Number(analytics.totals.revenue_30d).toFixed(2)}` : "—", accent: "text-emerald-300" },
            { icon: CreditCard, label: "Credits Sold", value: analytics?.totals.credits_sold.toLocaleString() ?? "—", accent: "text-primary-glow" },
            { icon: Users, label: "Users", value: stats?.users ?? "—", accent: "text-primary-glow" },
            { icon: Activity, label: "Generations", value: stats?.generations?.toLocaleString() ?? "—", accent: "text-primary-glow" },
            { icon: BarChart3, label: "Gens (30d)", value: analytics?.totals.generations_30d.toLocaleString() ?? "—", accent: "text-primary-glow" },
            { icon: Star, label: "New Users (30d)", value: analytics?.totals.new_users_30d ?? "—", accent: "text-amber-300" },
            { icon: Gift, label: "Referrals", value: analytics?.totals.referrals_count ?? "—", accent: "text-amber-300" },
          ].map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className="glass rounded-2xl p-5">
              <Icon className={`h-5 w-5 ${accent}`} />
              <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {msg && (
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">{msg}</div>
        )}

        {/* Charts: 30d sparklines */}
        {analytics && (
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass rounded-3xl p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Revenue · 30 days</h3>
                <span className="text-xs text-muted-foreground">${Number(analytics.totals.revenue_30d).toFixed(2)} total</span>
              </div>
              <div className="flex h-32 items-end gap-1">
                {analytics.daily.map((d) => {
                  const h = (Number(d.revenue) / maxRevenue) * 100;
                  return (
                    <div key={d.day} className="group relative flex-1" style={{ height: `${Math.max(h, 2)}%` }}>
                      <div className="h-full w-full rounded-t bg-gradient-to-t from-emerald-500/40 to-emerald-300/80 transition group-hover:opacity-100" />
                      <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] text-white group-hover:block">
                        {d.day} · ${Number(d.revenue).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="glass rounded-3xl p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Generations · 30 days</h3>
                <span className="text-xs text-muted-foreground">{analytics.totals.generations_30d.toLocaleString()} total</span>
              </div>
              <div className="flex h-32 items-end gap-1">
                {analytics.daily.map((d) => {
                  const h = (d.generations / maxGens) * 100;
                  return (
                    <div key={d.day} className="group relative flex-1" style={{ height: `${Math.max(h, 2)}%` }}>
                      <div className="h-full w-full rounded-t bg-gradient-to-t from-fuchsia-500/40 to-violet-300/80" />
                      <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] text-white group-hover:block">
                        {d.day} · {d.generations}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Top spenders + Recent purchases */}
        {analytics && (
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass rounded-3xl p-6">
              <h3 className="mb-4 font-display text-lg font-semibold">Top Spenders</h3>
              {analytics.top_spenders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No purchases yet.</p>
              ) : (
                <ul className="space-y-2">
                  {analytics.top_spenders.map((s, i) => (
                    <li key={s.email} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--gradient-primary)] text-xs font-bold text-white">{i + 1}</span>
                        <div>
                          <div className="font-medium">{s.display_name || s.email}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold text-emerald-300">${Number(s.spent).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{s.credits.toLocaleString()} cr</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="glass rounded-3xl p-6">
              <h3 className="mb-4 font-display text-lg font-semibold">Recent Purchases</h3>
              {analytics.recent_purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground">No purchases yet.</p>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {analytics.recent_purchases.map((r) => (
                    <li key={r.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.display_name || r.email}</div>
                        <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {r.payment_method}</div>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <div className="font-mono font-semibold text-emerald-300">${Number(r.amount_paid).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">+{r.credits.toLocaleString()} cr</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Recent generations */}
        {analytics && analytics.recent_generations.length > 0 && (
          <div className="mb-6 glass rounded-3xl p-6">
            <h3 className="mb-4 font-display text-lg font-semibold">Recent Generations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">User</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium text-right">Credits</th>
                    <th className="py-2 pr-4 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recent_generations.map((g) => (
                    <tr key={g.id} className="border-b border-white/5">
                      <td className="py-2 pr-4">{g.email}</td>
                      <td className="py-2 pr-4 capitalize">{g.generation_type}</td>
                      <td className="py-2 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs ${g.status === "completed" ? "bg-emerald-400/10 text-emerald-300" : g.status === "failed" ? "bg-red-400/10 text-red-300" : "bg-amber-400/10 text-amber-300"}`}>{g.status}</span></td>
                      <td className="py-2 pr-4 text-right font-mono">{g.credits_used}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{new Date(g.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reconciliation */}
        <div className="mb-6 glass rounded-3xl p-6 shadow-[var(--shadow-elegant)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15"><Scale className="h-5 w-5 text-primary-glow" /></div>
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">Credit Reconciliation</h2>
                <p className="text-xs text-muted-foreground">
                  Compares <span className="font-mono">profiles.credits</span> against ledger sum.
                  {reconRanAt && <> Last run {reconRanAt.toLocaleTimeString()}.</>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={onlyMismatches} onChange={(e) => setOnlyMismatches(e.target.checked)} className="accent-primary" />
                Only mismatches
              </label>
              <button onClick={runReconciliation} disabled={reconLoading} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--gradient-primary)] px-3 text-xs font-medium text-white hover:opacity-95 disabled:opacity-50">
                {reconLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Run check
              </button>
            </div>
          </div>

          {recon === null ? (
            <p className="text-sm text-muted-foreground">Click <span className="font-medium text-foreground">Run check</span> to audit all balances.</p>
          ) : (() => {
            const mismatches = recon.filter((r) => r.diff !== 0);
            const visible = onlyMismatches ? mismatches : recon;
            return (
              <div className="overflow-x-auto">
                <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${mismatches.length === 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                  {mismatches.length === 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {mismatches.length === 0 ? "All balanced" : `${mismatches.length} mismatch${mismatches.length === 1 ? "" : "es"}`}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 pr-4 font-medium">User</th>
                      <th className="py-3 pr-4 font-medium text-right">Profile</th>
                      <th className="py-3 pr-4 font-medium text-right">Ledger</th>
                      <th className="py-3 pr-4 font-medium text-right">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r.user_id} className={`border-b border-white/5 ${r.diff !== 0 ? "bg-amber-400/[0.04]" : ""}`}>
                        <td className="py-3 pr-4"><div className="font-medium">{r.display_name || "—"}</div><div className="text-xs text-muted-foreground">{r.email}</div></td>
                        <td className="py-3 pr-4 text-right font-mono">{r.profile_credits.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right font-mono">{r.ledger_sum.toLocaleString()}</td>
                        <td className={`py-3 pr-4 text-right font-mono font-semibold ${r.diff !== 0 ? "text-amber-300" : "text-emerald-400"}`}>{r.diff > 0 ? "+" : ""}{r.diff.toLocaleString()}</td>
                      </tr>
                    ))}
                    {visible.length === 0 && (<tr><td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No mismatches.</td></tr>)}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

        {/* Promo codes */}
        <PromoManager />

        {/* Users table */}
        <div className="glass rounded-3xl p-6 shadow-[var(--shadow-elegant)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">Users ({filtered.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email or name…" className="h-10 w-72 rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {loading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">User</th>
                    <th className="py-3 pr-4 font-medium">Credits</th>
                    <th className="py-3 pr-4 font-medium">Role</th>
                    <th className="py-3 pr-4 font-medium">Joined</th>
                    <th className="py-3 pr-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{p.display_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </td>
                      <td className="py-3 pr-4 font-mono">{p.credits.toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {p.is_owner && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gradient-primary)] px-2 py-0.5 text-[10px] font-medium text-white"><Crown className="h-2.5 w-2.5" /> Owner</span>
                          )}
                          {p.is_manager && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-300"><Shield className="h-2.5 w-2.5" /> Manager</span>
                          )}
                          {p.is_banned && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-300" title={p.ban_reason ?? "Banned"}><Ban className="h-2.5 w-2.5" /> Banned</span>
                          )}
                          {!p.is_owner && !p.is_manager && !p.is_banned && (
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">User</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button disabled={busyId === p.id} onClick={() => setGiftDialog(p)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 text-xs text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50">
                            <Gift className="h-3 w-3" /> Gift
                          </button>
                          <button disabled={busyId === p.id} onClick={() => adjustCredits(p.id, 100, "Quick grant +100")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs transition hover:bg-white/10 disabled:opacity-50"><Plus className="h-3 w-3" /> 100</button>
                          <button disabled={busyId === p.id} onClick={() => adjustCredits(p.id, 1000, "Quick grant +1000")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs transition hover:bg-white/10 disabled:opacity-50"><Plus className="h-3 w-3" /> 1k</button>
                          <button disabled={busyId === p.id} onClick={() => setUnlimited(p.id)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--gradient-primary)] px-2.5 text-xs text-white transition hover:opacity-95 disabled:opacity-50" title="Set unlimited"><Crown className="h-3 w-3" /> ∞</button>
                          <button disabled={busyId === p.id} onClick={() => toggleManager(p)} className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs transition disabled:opacity-50 ${p.is_manager ? "bg-amber-400/30 text-amber-100 hover:bg-amber-400/40" : "border border-amber-400/40 text-amber-300 hover:bg-amber-400/10"}`} title={p.is_manager ? "Remove manager" : "Promote to manager"}>
                            <Shield className="h-3 w-3" /> {p.is_manager ? "Mgr ✓" : "Mgr"}
                          </button>
                          <button disabled={busyId === p.id} onClick={() => toggleOwner(p)} className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs transition disabled:opacity-50 ${p.is_owner ? "bg-fuchsia-400/30 text-white hover:bg-fuchsia-400/40" : "border border-fuchsia-400/40 text-fuchsia-300 hover:bg-fuchsia-400/10"}`} title={p.is_owner ? "Demote from owner" : "Promote to owner"}>
                            <ShieldCheck className="h-3 w-3" /> {p.is_owner ? "Own ✓" : "Own"}
                          </button>
                          <button disabled={busyId === p.id} onClick={() => toggleBan(p)} className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs transition disabled:opacity-50 ${p.is_banned ? "bg-rose-500/30 text-rose-100 hover:bg-rose-500/40" : "border border-rose-500/40 text-rose-300 hover:bg-rose-500/10"}`} title={p.is_banned ? "Unban user" : "Ban user"}>
                            <Ban className="h-3 w-3" /> {p.is_banned ? "Unban" : "Ban"}
                          </button>
                          <button disabled={busyId === p.id} onClick={() => wipeGenerations(p)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50" title="Wipe all generations">
                            <Trash2 className="h-3 w-3" /> Wipe
                          </button>
                          {busyId === p.id && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Gift dialog */}
      {giftDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4" onClick={() => setGiftDialog(null)}>
          <div onClick={(e) => e.stopPropagation()} className="glass w-full max-w-sm rounded-3xl p-6 shadow-[var(--shadow-elegant)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20"><Gift className="h-5 w-5 text-emerald-300" /></div>
              <div>
                <h3 className="font-display text-lg font-semibold">Gift credits</h3>
                <p className="text-xs text-muted-foreground">to {giftDialog.email}</p>
              </div>
            </div>
            <label className="text-xs text-muted-foreground">Amount (use negative to remove)</label>
            <input type="number" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[100, 500, 1000, 5000].map((n) => (
                <button key={n} onClick={() => setGiftAmount(String(n))} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs hover:bg-white/10">+{n.toLocaleString()}</button>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setGiftDialog(null)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10">Cancel</button>
              <button
                onClick={async () => {
                  const amt = parseInt(giftAmount, 10);
                  if (!isNaN(amt) && amt !== 0) {
                    const target = giftDialog;
                    setGiftDialog(null);
                    await adjustCredits(target.id, amt, `Gift ${amt >= 0 ? "+" : ""}${amt} from admin`);
                  }
                }}
                className="flex-1 rounded-xl bg-[var(--gradient-primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-95"
              >Send gift</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
