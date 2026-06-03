import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Clock } from "lucide-react";

type PendingPurchase = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  credits: number;
  amount_paid: number;
  payment_method: string;
  transaction_id: string | null;
  created_at: string;
};

export function PendingPurchases({ onChange }: { onChange?: () => void }) {
  const [rows, setRows] = useState<PendingPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_pending_purchases");
    if (error) {
      setMsg(`Error: ${error.message}`);
      setRows([]);
    } else {
      setRows((data as PendingPurchase[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (p: PendingPurchase) => {
    if (
      !confirm(
        `Approve ${p.credits} credits for ${p.email}?\n\nTransaction: ${p.transaction_id ?? "(none)"}\nAmount: $${Number(p.amount_paid).toFixed(2)}`,
      )
    )
      return;
    setBusyId(p.id);
    setMsg(null);
    const { error } = await supabase.rpc("admin_approve_purchase", { _purchase_id: p.id });
    if (error) setMsg(`Error: ${error.message}`);
    else {
      setMsg(`Approved ${p.credits} credits for ${p.email}`);
      await load();
      onChange?.();
    }
    setBusyId(null);
  };

  const reject = async (p: PendingPurchase) => {
    const note = prompt(
      `Reject this purchase from ${p.email}?\n\nReason (optional, shown in audit log):`,
      "Could not verify PayPal transaction",
    );
    if (note === null) return;
    setBusyId(p.id);
    setMsg(null);
    const { error } = await supabase.rpc("admin_reject_purchase", {
      _purchase_id: p.id,
      _note: note || undefined,
    });
    if (error) setMsg(`Error: ${error.message}`);
    else {
      setMsg(`Rejected purchase from ${p.email}`);
      await load();
      onChange?.();
    }
    setBusyId(null);
  };

  return (
    <div className="glass rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-300" />
          <h3 className="font-display text-lg font-semibold">Pending purchases</h3>
          {rows.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
              {rows.length}
            </span>
          )}
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-muted-foreground hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {msg && (
        <div className="mb-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-8 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No pending purchases — you're all caught up.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Buyer</th>
                <th className="py-2 pr-3">Credits</th>
                <th className="py-2 pr-3">Paid</th>
                <th className="py-2 pr-3">Method</th>
                <th className="py-2 pr-3">Transaction ID</th>
                <th className="py-2 pr-3">Submitted</th>
                <th className="py-2 pr-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{p.display_name || p.email}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </td>
                  <td className="py-3 pr-3 font-semibold text-primary-glow">
                    {p.credits.toLocaleString()}
                  </td>
                  <td className="py-3 pr-3">${Number(p.amount_paid).toFixed(2)}</td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">{p.payment_method}</td>
                  <td
                    className="py-3 pr-3 max-w-[200px] truncate font-mono text-xs"
                    title={p.transaction_id ?? ""}
                  >
                    {p.transaction_id ?? "—"}
                  </td>
                  <td className="py-3 pr-3 text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => approve(p)}
                        disabled={busyId === p.id}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        {busyId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => reject(p)}
                        disabled={busyId === p.id}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
