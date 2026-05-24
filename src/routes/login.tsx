import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — KingDavez Studios AI 3D Generator" },
      { name: "description", content: "Sign in to your KingDavez Studios account to generate AI 3D models, manage credits, and deliver mesh to Second Life." },
      { property: "og:title", content: "Sign In — KingDavez Studios AI 3D Generator" },
      { property: "og:description", content: "Access your KingDavez Studios account to create AI 3D models and textures." },
      { property: "og:url", content: "https://kingdavez.click/login" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signInWithGoogle, signInWithApple, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    // Detect common in-app browsers where third-party cookies (CSRF) break OAuth
    if (/(FBAN|FBAV|Instagram|Line|MicroMessenger|TikTok|Twitter|Snapchat|LinkedInApp|Pinterest)/i.test(ua)) {
      setInAppBrowser(true);
    }
  }, []);

  // Restore remembered credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kd_remember");
      if (saved) {
        const { email: e, password: p } = JSON.parse(saved);
        if (e) setEmail(e);
        if (p) setPassword(p);
        setRememberMe(true);
      }
    } catch {}
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

    const result = await signIn(email, password);
    if (result.error) {
      // Friendlier error messages
      let msg = result.error;
      if (msg.toLowerCase().includes("invalid login credentials") || msg.toLowerCase().includes("invalid credentials")) {
        msg = "Incorrect email or password. Please try again.";
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        msg = "Please confirm your email first — check your inbox for the confirmation link.";
      }
      setError(msg);
      setLoading(false);
    } else {
      // Persist or clear remembered credentials
      try {
        if (rememberMe) {
          localStorage.setItem("kd_remember", JSON.stringify({ email, password }));
        } else {
          localStorage.removeItem("kd_remember");
        }
      } catch {}
      navigate({ to: "/dashboard" });
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
          <h1 className="font-display text-2xl font-semibold tracking-tight text-center">
            Welcome back
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Sign in to access your dashboard and start creating.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {inAppBrowser && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-xs text-yellow-200">
                You're in an in-app browser. Google/Apple sign-in may fail with a CSRF error. Tap the ··· menu and choose <strong>Open in Safari/Chrome</strong>, or use email sign-in below.
              </div>
            )}
            {/* Google Sign In */}
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

            {/* Apple Sign In */}
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

            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-sm font-medium text-foreground/80"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-email"
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
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium text-foreground/80"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
            </div>

            {/* Remember me + Forgot password row */}
            <div className="flex items-center justify-between">
              <label
                htmlFor="remember-me"
                className="flex cursor-pointer items-center gap-2 select-none"
              >
                <div className="relative flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-white/20 bg-black/30 checked:border-primary/60 checked:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  />
                  {/* Custom checkmark */}
                  <svg
                    className="pointer-events-none absolute left-0 top-0 h-4 w-4 opacity-0 peer-checked:opacity-100 transition"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M3.5 8L6.5 11L12.5 5"
                      stroke="oklch(0.7 0.22 305)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-sm text-primary-glow hover:underline"
              >
                Forgot password?
              </Link>
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
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary-glow hover:underline"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
