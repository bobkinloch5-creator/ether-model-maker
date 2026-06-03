import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Ticket,
  Plus,
  Loader2,
  Copy,
  Check,
  Trash2,
  Power,
  RefreshCw,
  Shuffle,
} from "lucide-react";

type Promo = {
  id: string;
  code: string;
  credits: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  active: boolean;
  note: string | null;
  created_at: string;
};

const PRESETS = [50, 100, 250, 500, 1000];

function randomCode(len = 8) {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
  return s;
}

export function PromoManager() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [credits, setCredits] = useState("100");
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    setPromos((data as Promo[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const generate = () => setCode(randomCode());

  const create = async () => {
    setBusy(true);
    setMsg(null);
    const _credits = parseInt(credits, 10);
    const _max = maxUses.trim() ? parseInt(maxUses, 10) : null;
    const _expires = expiresInDays.trim()
      ? new Date(Date.now() + parseInt(expiresInDays, 10) * 86400_000).toISOString()
      : null;
    const { data, error } = await supabase.rpc("admin_create_promo", {
      _code: code.trim() || undefined,
      _credits,
      _max_uses: _max ?? undefined,
      _expires_at: _expires ?? undefined,
      _note: note.trim() || undefined,
    });
    if (error) {
      setMsg(`Error: ${error.message}`);
    } else {
      const created = data as Promo;
      setMsg(`Created code ${created.code} (+${created.credits} credits)`);
      setCode("");
      setNote("");
      setMaxUses("");
      setExpiresInDays("");
      await load();
    }
    setBusy(false);
  };

  const toggle = async (p: Promo) => {
    const { error } = await supabase.rpc("admin_toggle_promo", { _id: p.id, _active: !p.active });
    if (error) setMsg(error.message);
    else await load();
  };

  const remove = async (p: Promo) => {
    if (!confirm(`Delete code ${p.code}? Redemptions remain logged.`)) return;
    const { error } = await supabase.rpc("admin_delete_promo", { _id: p.id });
    if (error) setMsg(error.message);
    else await load();
  };

  const copy = async (c: string) => {
    await navigator.clipboard.writeText(c);
    setCopied(c);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="mb-6 glass rounded-3xl p-6 shadow-[var(--shadow-elegant)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-fuchsia-500/15">
            <Ticket className="h-5 w-5 text-fuchsia-300" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Promo Codes</h2>
            <p className="text-xs text-muted-foreground">
              Generate discount-style codes that credit users instantly on redemption.
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-muted-foreground hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Generator */}
      <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:grid-cols-12">
        <div className="sm:col-span-4">
          <label className="text-xs text-muted-foreground">Code (or auto-generate)</label>
          <div className="mt-1 flex gap-1.5">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH50"
              className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={generate}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
              title="Generate random code"
            >
              <Shuffle className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">Credits</label>
          <input
            type="number"
            min={1}
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCredits(String(n))}
                className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] hover:bg-white/10"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">Max uses</label>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="∞"
            className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">Expires in (days)</label>
          <input
            type="number"
            min={1}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            placeholder="never"
            className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div className="sm:col-span-2 flex items-end">
          <button
            onClick={create}
            disabled={busy || !credits || parseInt(credits, 10) <= 0}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--gradient-primary)] px-3 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
        </div>
        <div className="sm:col-span-12">
          <label className="text-xs text-muted-foreground">Note (internal)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Launch promo on Twitter"
            className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      {msg && (
        <div className="mb-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
          {msg}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
        </div>
      ) : promos.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No promo codes yet. Generate one above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Code</th>
                <th className="py-2 pr-4 font-medium text-right">Credits</th>
                <th className="py-2 pr-4 font-medium text-right">Uses</th>
                <th className="py-2 pr-4 font-medium">Expires</th>
                <th className="py-2 pr-4 font-medium">Note</th>
                <th className="py-2 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => {
                const expired = p.expires_at && new Date(p.expires_at) < new Date();
                const exhausted = p.max_uses != null && p.uses_count >= p.max_uses;
                const live = p.active && !expired && !exhausted;
                return (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-semibold ${live ? "text-fuchsia-200" : "text-muted-foreground line-through"}`}
                        >
                          {p.code}
                        </span>
                        <button
                          onClick={() => copy(p.code)}
                          className="rounded-md border border-white/10 bg-white/5 p-1 hover:bg-white/10"
                          title="Copy"
                        >
                          {copied === p.code ? (
                            <Check className="h-3 w-3 text-emerald-300" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                        {!live && (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">
                            {!p.active ? "off" : expired ? "expired" : "exhausted"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-primary-glow">
                      +{p.credits.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {p.uses_count}
                      {p.max_uses != null ? `/${p.max_uses}` : ""}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground truncate max-w-[14rem]">
                      {p.note || "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => toggle(p)}
                          className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs transition ${
                            p.active
                              ? "border border-white/10 bg-white/5 hover:bg-white/10"
                              : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                          }`}
                          title={p.active ? "Disable" : "Enable"}
                        >
                          <Power className="h-3 w-3" /> {p.active ? "Off" : "On"}
                        </button>
                        <button
                          onClick={() => remove(p)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs text-muted-foreground hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
