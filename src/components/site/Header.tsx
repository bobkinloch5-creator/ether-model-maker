import { Link } from "@tanstack/react-router";
import { Sparkles, User, Coins, Users, Menu, X, Home } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "@/components/LanguagePicker";

export function Header() {
  const { user, profile, loading } = useAuth();
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}>
      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        <div className={`glass flex h-14 items-center justify-between rounded-full pl-4 pr-2 sm:pl-5 transition-all duration-300 ${scrolled ? "shadow-lg shadow-black/20" : ""}`}>
          <Link to="/" className="flex items-center gap-2 min-w-0" onClick={closeMenu}>
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--gradient-primary)] glow">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-sm sm:text-base font-semibold tracking-tight truncate">
              KingDavez <span className="text-muted-foreground hidden xs:inline">studio</span>
            </span>
            <span className="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-glow">
              Beta
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground transition">{t("nav.home")}</Link>
            <a href="#features" className="hover:text-foreground transition">{t("nav.features")}</a>
            <Link to="/community" className="hover:text-foreground transition">{t("nav.community")}</Link>
            <Link to="/second-life" className="hover:text-foreground transition">{t("nav.secondLife")}</Link>
            <Link to="/" hash="integrations" className="hover:text-foreground transition">{t("nav.integrations")}</Link>
            <Link to="/tutorials" className="hover:text-foreground transition">{t("nav.tutorials")}</Link>
            <Link to="/docs" className="hover:text-foreground transition">{t("nav.docs")}</Link>
            <Link to="/roadmap" className="hover:text-foreground transition">{t("nav.roadmap")}</Link>
            <Link to="/changelog" className="hover:text-foreground transition">{t("nav.whatsNew")}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguagePicker />
            {!loading && user ? (
              <>
                {/* Admin link hidden — access via direct URL /admin */}
                <Link
                  to="/credits"
                  className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-sm text-muted-foreground transition hover:text-foreground hover:bg-white/10"
                  title="Buy credits"
                >
                  <Coins className="h-3.5 w-3.5 text-primary-glow" />
                  {profile?.is_owner ? "∞" : (profile?.credits ?? 0).toLocaleString()}
                </Link>
                <Link
                  to="/teams"
                  className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
                  title="Teams"
                >
                  <Users className="h-3.5 w-3.5" /> Teams
                </Link>
                <Link
                  to="/dashboard"
                  className="hidden lg:inline-flex h-10 items-center rounded-full px-4 text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Dashboard
                </Link>
                <Link
                  to="/dashboard"
                  className="hidden sm:grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                  title="Dashboard"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex h-10 items-center rounded-full px-4 text-sm text-muted-foreground hover:text-foreground transition"
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  to="/signup"
                  className="hidden sm:inline-flex h-10 items-center rounded-full bg-[var(--gradient-primary)] px-5 text-sm font-medium text-white shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.6)] hover:opacity-95 transition"
                >
                  {t("nav.launchApp")}
                </Link>
              </>
            )}
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className="sm:hidden grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 top-[72px] z-40 bg-background/95 backdrop-blur-lg animate-fade-in">
          <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-2">
            {!loading && user ? (
              <>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 mb-2">
                  <span className="text-sm text-muted-foreground">Credits</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Coins className="h-4 w-4 text-primary-glow" />
                    {profile?.is_owner ? "∞" : (profile?.credits ?? 0).toLocaleString()}
                  </span>
                </div>
                <MobileLink to="/" onClick={closeMenu} icon={<Home className="h-4 w-4" />} label="Home" />
                <MobileLink to="/dashboard" onClick={closeMenu} icon={<User className="h-4 w-4" />} label="Dashboard" />
                <MobileLink to="/generate" onClick={closeMenu} icon={<Sparkles className="h-4 w-4" />} label="Generate" />
                <MobileLink to="/credits" onClick={closeMenu} icon={<Coins className="h-4 w-4" />} label="Credits" />
                <MobileLink to="/teams" onClick={closeMenu} icon={<Users className="h-4 w-4" />} label="Teams" />
                <MobileLink to="/profile" onClick={closeMenu} icon={<User className="h-4 w-4" />} label="Profile" />
                <MobileLink to="/tutorials" onClick={closeMenu} icon={<Sparkles className="h-4 w-4" />} label="Tutorials" />
                <MobileLink to="/second-life" onClick={closeMenu} icon={<Sparkles className="h-4 w-4" />} label="Second Life" />
                <MobileLink to="/integrations/blender" onClick={closeMenu} icon={<Sparkles className="h-4 w-4" />} label="Blender add-on" />
                <MobileLink to="/integrations/roblox" onClick={closeMenu} icon={<Sparkles className="h-4 w-4" />} label="Roblox plugin" />
                {/* Admin link hidden from mobile menu — access via direct URL /admin */}
              </>
            ) : (
              <>
                <MobileLink to="/" onClick={closeMenu} icon={<Home className="h-4 w-4" />} label="Home" />
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-foreground"
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMenu}
                  className="rounded-2xl bg-[var(--gradient-primary)] px-4 py-3 text-center text-sm font-medium text-white"
                >
                  Launch app
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MobileLink({
  to,
  onClick,
  icon,
  label,
  accent,
}: {
  to: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
        accent
          ? "border-primary/30 bg-primary/10 text-primary-glow"
          : "border-white/10 bg-white/5 text-foreground hover:bg-white/10"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
