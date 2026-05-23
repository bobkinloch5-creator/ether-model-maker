import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { checkSignupAllowed, recordSignupFingerprint } from "@/lib/account-guard.functions";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Gift,
  Ticket,
  Wand2,
  Copy,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign Up — Get 25 Free Credits for AI 3D Generation | KingDavez Studios" },
      {
        name: "description",
        content:
          "Create your free KingDavez Studios account and get 25 free credits to start generating AI 3D models, PBR textures, and game-ready meshes instantly.",
      },
      { name: "keywords", content: "AI 3D generator free trial, free 3D model generator, text to 3D free, Second Life mesh creator, PBR texture AI" },
      { property: "og:title", content: "Sign Up — Get 25 Free Credits for AI 3D Generation | KingDavez Studios" },
      { property: "og:description", content: "Create a free account and get 25 credits to generate AI 3D models and textures." },
      { property: "og:url", content: "https://kingdavez.click/signup" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/signup" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp, signInWithGoogle, signInWithApple, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const length = 20;
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const all = lower + upper + digits + special;

    let pwd = "";
    // Ensure at least one of each type
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += digits[Math.floor(Math.random() * digits.length)];
    pwd += special[Math.floor(Math.random() * special.length)];

    for (let i = 4; i < length; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle
    pwd = pwd
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    setPassword(pwd);
    setCopied(false);
  };

  const copyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Pick up ?ref=CODE from the URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
  }, []);

  // Redirect if already logged in
  if (!authLoading && user) {
    navigate({ to: "/dashboard" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    // Device + IP guard: one account per user
    let fingerprint = "";
    try {
      fingerprint = await getDeviceFingerprint();
      const check = await checkSignupAllowed({
        data: { fingerprint, email: email.toLowerCase() },
      });
      if (check.blocked) {
        setError(check.reason ?? "Only one account is allowed per user.");
        setLoading(false);
        return;
      }
    } catch {
      // fail-open if the check itself errors
    }

    const result = await signUp(email, password, displayName || undefined, referralCode || undefined);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      // Best-effort: record the fingerprint for the new account.
      // Only works if the session is already active (auto-confirm flow);
      // otherwise we record on first sign-in below via the auth-context hook.
      if (fingerprint) {
        try { await recordSignupFingerprint({ data: { fingerprint } }); } catch {}
      }
      setSuccess(true);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
    }
    setGoogleLoading(false);
  };

  const handleAppleSignIn = async () => {
    setError("");
    setAppleLoading(true);
    const result = await signInWithApple();
    if (result.error) {
      setError(result.error);
    }
    setAppleLoading(false);
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

      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 animate-fade-in">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--gradient-primary)] glow animate-bounce-subtle">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">
            KingDavez<span className="text-muted-foreground">.studio</span>
          </span>
        </Link>

        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-[var(--shadow-elegant)] animate-slide-up animate-delay-100">
          {success ? (
            /* Success state */
            <div className="text-center py-4 animate-scale-in">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--gradient-primary)] glow">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Check your email!
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We sent a confirmation link to{" "}
                <span className="font-medium text-foreground">{email}</span>.
                Click it to activate your account and claim your{" "}
                <span className="font-semibold gradient-text">
                  25 free credits
                </span>
                .
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--gradient-primary)] px-6 text-sm font-medium text-white transition hover:opacity-95"
              >
                Go to Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            /* Form */
            <>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-center">
                Create your account
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Start with{" "}
                <span className="font-semibold gradient-text">
                  25 free credits
                </span>{" "}
                — no credit card required.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {/* Google Sign Up */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-foreground transition hover:bg-white/10 disabled:opacity-50"
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Apple Sign Up */}
                <button
                  type="button"
                  onClick={handleAppleSignIn}
                  disabled={appleLoading}
                  className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-foreground transition hover:bg-white/10 disabled:opacity-50"
                >
                  {appleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.5.12 2.63.72 3.4 1.8-3.12 1.87-2.54 5.98.22 7.13-.57 1.5-1.31 2.99-2.27 4.09zm-5.85-15.1c.07-2.04 1.76-3.79 3.75-3.95.29 2.32-1.93 4.48-3.75 3.95z" />
                      </svg>
                      Continue with Apple
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Display Name */}
                <div>
                  <label
                    htmlFor="signup-name"
                    className="mb-1.5 block text-sm font-medium text-foreground/80"
                  >
                    Display name{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="KingDavez Studios"
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="signup-email"
                    className="mb-1.5 block text-sm font-medium text-foreground/80"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="signup-password"
                      className="block text-sm font-medium text-foreground/80"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="flex items-center gap-1 text-xs font-medium text-primary-glow hover:text-primary transition"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Generate strong
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••  (min 6 characters)"
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-20 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    />
                    {password && (
                      <button
                        type="button"
                        onClick={copyPassword}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 items-center gap-1 rounded-lg bg-white/10 px-2 text-xs font-medium text-foreground/70 hover:bg-white/15 transition"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                  {password && (
                    <PasswordStrength password={password} />
                  )}
                </div>

                {/* Referral Code */}
                <div>
                  <label
                    htmlFor="signup-ref"
                    className="mb-1.5 block text-sm font-medium text-foreground/80"
                  >
                    Referral code{" "}
                    <span className="text-muted-foreground">(optional — +50 credits)</span>
                  </label>
                  <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-glow" />
                    <input
                      id="signup-ref"
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="FRIEND123"
                      maxLength={16}
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm uppercase tracking-wider placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
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
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gradient-primary)] text-sm font-medium text-white shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.6)] transition hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Create account <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary-glow hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Password strength indicator ---------- */
function PasswordStrength({ password }: { password: string }) {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const longEnough = password.length >= 12;

  const score = [hasLower, hasUpper, hasDigit, hasSpecial, longEnough].filter(Boolean).length;

  const labels = ["Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = [
    "bg-destructive",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-emerald-400",
    "bg-emerald-500",
  ];

  return (
    <div className="mt-2 space-y-1.5 animate-fade-in">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= score ? colors[score - 1] : "bg-white/10"
            }`}
          />
        ))}
        <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {labels[score - 1] ?? "Weak"}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        <span className={hasLower ? "text-emerald-400" : ""}>Lowercase</span>
        <span className={hasUpper ? "text-emerald-400" : ""}>Uppercase</span>
        <span className={hasDigit ? "text-emerald-400" : ""}>Number</span>
        <span className={hasSpecial ? "text-emerald-400" : ""}>Symbol</span>
        <span className={longEnough ? "text-emerald-400" : ""}>12+ chars</span>
      </div>
    </div>
  );
}
