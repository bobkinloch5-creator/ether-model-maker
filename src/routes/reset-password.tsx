// @ts-nocheck — legacy ported file; full typing pending
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Sparkles, Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — KingDavez Studios (Beta)" },
      { name: "description", content: "Set a new secure password for your KingDavez Studios account and regain access to your AI 3D model generation workspace." },
      { property: "og:title", content: "Reset Password — KingDavez Studios" },
      { property: "og:description", content: "Set a new password for your KingDavez Studios account." },
      { property: "og:url", content: "https://kingdavez.click/reset-password" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/reset-password" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase embeds the recovery token in the URL hash (#access_token=...).
  // onAuthStateChange fires with event "PASSWORD_RECOVERY" when it detects it.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also check if there's already an active session from the hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirm) {
      setError("Please fill in both fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // Auto-redirect to dashboard after 3 seconds
      setTimeout(() => navigate({ to: "/dashboard" }), 3000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="grid-bg absolute inset-0 -z-10" />
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 30%, oklch(0.7 0.22 305 / 0.3), transparent 70%)",
        }}
      />

      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--gradient-primary)] glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">
            KingDavez<span className="text-muted-foreground">.studio</span>
          </span>
        </Link>

        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-[var(--shadow-elegant)]">
          {success ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--gradient-primary)] glow">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Password updated!
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Your password has been changed. Redirecting you to your dashboard…
              </p>
              <Link
                to="/dashboard"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--gradient-primary)] px-6 text-sm font-medium text-white transition hover:opacity-95"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : !sessionReady ? (
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary/60" />
              <p className="mt-4 text-sm text-muted-foreground">
                Verifying reset link…
              </p>
              <p className="mt-2 text-xs text-muted-foreground/60">
                If nothing happens,{" "}
                <Link to="/forgot-password" className="text-primary-glow hover:underline">
                  request a new link
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-center">
                Set a new password
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Choose a strong password for your account.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {/* New password */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-1.5 block text-sm font-medium text-foreground/80"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••  (min 6 characters)"
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    />
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-1.5 block text-sm font-medium text-foreground/80"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  id="update-password-btn"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gradient-primary)] text-sm font-medium text-white shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.6)] transition hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Update password <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
