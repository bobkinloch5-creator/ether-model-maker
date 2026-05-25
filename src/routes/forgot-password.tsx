import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Sparkles, Mail, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — KingDavez Studios (Beta)" },
      { name: "description", content: "Reset your KingDavez Studios account password securely. We'll send you an email with instructions to get back into your AI 3D generation dashboard." },
      { property: "og:title", content: "Forgot Password — KingDavez Studios" },
      { property: "og:description", content: "Reset your KingDavez Studios account password." },
      { property: "og:url", content: "https://kingdavez.click/forgot-password" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/forgot-password" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    const result = await resetPassword(email);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
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
            /* Success state */
            <div className="text-center py-4">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--gradient-primary)] glow">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Check your inbox!
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We sent a password reset link to{" "}
                <span className="font-medium text-foreground">{email}</span>.
                Follow the link in the email to create a new password.
              </p>
              <p className="mt-2 text-xs text-muted-foreground/60">
                Didn't get it? Check your spam folder, or try again in a minute.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--gradient-primary)] px-6 text-sm font-medium text-white transition hover:opacity-95"
              >
                Back to Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            /* Form */
            <>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-center">
                Forgot your password?
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                No worries — enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {/* Email */}
                <div>
                  <label
                    htmlFor="reset-email"
                    className="mb-1.5 block text-sm font-medium text-foreground/80"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
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
                  id="reset-password-btn"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gradient-primary)] text-sm font-medium text-white shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.6)] transition hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Send reset link <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary-glow hover:underline"
                >
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
