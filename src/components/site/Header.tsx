import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  User,
  Coins,
  Users,
  Menu,
  X,
  Home,
  Gift,
  Copy,
  Check,
  ChevronDown,
  BookOpen,
  FileText,
  Map,
  History,
  HelpCircle,
  Globe,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "@/components/LanguagePicker";

export function Header() {
  const { user, profile, loading } = useAuth();
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [promoCopied, setPromoCopied] = useState(false);
  const [promoDismissed, setPromoDismissed] = useState(false);

  useEffect(() => {
    setPromoDismissed(
      typeof window !== "undefined" && localStorage.getItem("promo_launch250_dismissed") === "1",
    );
  }, []);

  const copyPromo = async () => {
    try {
      await navigator.clipboard.writeText("LAUNCH250");
      setPromoCopied(true);
      setTimeout(() => setPromoCopied(false), 1500);
    } catch {}
  };

  const dismissPromo = () => {
    setPromoDismissed(true);
    try {
      localStorage.setItem("promo_launch250_dismissed", "1");
    } catch {}
  };

  const showPromo = !promoDismissed && new Date() < new Date("2026-06-10T23:59:59Z");

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
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}
    >
      {showPromo && (
        <div className="mx-auto max-w-6xl px-3 sm:px-4 mb-2">
          <div className="flex items-center justify-between gap-2 rounded-full border border-primary/30 bg-[var(--gradient-primary)]/15 backdrop-blur px-3 sm:px-4 py-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Gift className="h-4 w-4 text-primary-glow shrink-0" />
              <span className="truncate">
                <span className="font-semibold text-foreground">+250 free credits</span>
                <span className="text-muted-foreground hidden sm:inline"> — use code</span>
              </span>
              <button
                onClick={copyPromo}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[11px] sm:text-xs font-bold tracking-wider hover:bg-white/20 transition"
                title="Copy code"
              >
                LAUNCH250
                {promoCopied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3 opacity-70" />
                )}
              </button>
              <span className="text-muted-foreground hidden md:inline">· ends Jun 10</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                to="/credits"
                className="hidden sm:inline-flex h-7 items-center rounded-full bg-[var(--gradient-primary)] px-3 text-xs font-medium text-white hover:opacity-95 transition"
              >
                Redeem
              </Link>
              <button
                onClick={dismissPromo}
                aria-label="Dismiss"
                className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10 transition"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        <div
          className={`glass flex h-14 items-center justify-between rounded-full pl-4 pr-2 sm:pl-5 transition-all duration-300 ${scrolled ? "shadow-lg shadow-black/20" : ""}`}
        >
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
            <Link to="/" className="hover:text-foreground transition">
              {t("nav.home")}
            </Link>
            <Link to="/generate" className="hover:text-foreground transition">
              Studio
            </Link>

            {/* BROWSE DROPDOWN (MEGA MENU) */}
            <div className="relative group py-2">
              <button className="flex items-center gap-1 hover:text-foreground transition focus:outline-none py-1">
                Browse
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 duration-200" />
              </button>

              {/* Dropdown Menu Container */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[720px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform scale-95 group-hover:scale-100 origin-top pointer-events-none group-hover:pointer-events-auto z-50">
                <div className="glass rounded-3xl border border-white/10 bg-black/90 p-6 shadow-2xl shadow-black/80 backdrop-blur-2xl grid grid-cols-3 gap-6 text-left">
                  {/* Column 1: Studio & Creation */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary-glow border-b border-white/5 pb-1.5">
                      Create & Share
                    </h4>
                    <div className="flex flex-col gap-2">
                      <DropdownLink
                        to="/generate"
                        icon={<Sparkles className="h-4 w-4 text-primary" />}
                        title="AI 3D Generator"
                        desc="Text/Image to game-ready 3D"
                      />
                      <DropdownLink
                        to="/community"
                        icon={<Users className="h-4 w-4 text-blue-400" />}
                        title="Community Gallery"
                        desc="Explore and share creations"
                      />
                      <DropdownLink
                        to="/dashboard"
                        icon={<LayoutDashboard className="h-4 w-4 text-purple-400" />}
                        title="My Dashboard"
                        desc="Access assets, credits & tasks"
                      />
                      <DropdownLink
                        to="/teams"
                        icon={<Users className="h-4 w-4 text-emerald-400" />}
                        title="Teams"
                        desc="Collaborate with other creators"
                      />
                    </div>
                  </div>

                  {/* Column 2: Integrations */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-pink-400 border-b border-white/5 pb-1.5">
                      Integrations & SDKs
                    </h4>
                    <div className="flex flex-col gap-2">
                      <DropdownLink
                        to="/second-life"
                        icon={<Globe className="h-4 w-4 text-pink-400" />}
                        title="Second Life Hub"
                        desc="Low LI mesh, script uploader"
                      />
                      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-2 space-y-1.5">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold block">
                          Plugins & Engines
                        </span>
                        <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
                          <Link
                            to="/integrations/blender"
                            className="hover:text-primary-glow text-muted-foreground transition"
                          >
                            Blender
                          </Link>
                          <Link
                            to="/integrations/roblox"
                            className="hover:text-primary-glow text-muted-foreground transition"
                          >
                            Roblox
                          </Link>
                          <Link
                            to="/integrations/unity"
                            className="hover:text-primary-glow text-muted-foreground transition"
                          >
                            Unity
                          </Link>
                          <Link
                            to="/integrations/unreal"
                            className="hover:text-primary-glow text-muted-foreground transition"
                          >
                            Unreal
                          </Link>
                          <Link
                            to="/integrations/godot"
                            className="hover:text-primary-glow text-muted-foreground transition"
                          >
                            Godot
                          </Link>
                          <Link
                            to="/integrations/web"
                            className="hover:text-primary-glow text-muted-foreground transition"
                          >
                            Web API
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Resources */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 border-b border-white/5 pb-1.5">
                      Resources & Docs
                    </h4>
                    <div className="flex flex-col gap-2">
                      <DropdownLink
                        to="/tutorials"
                        icon={<BookOpen className="h-4 w-4 text-amber-400" />}
                        title="Tutorials"
                        desc="Step-by-step 3D guides"
                      />
                      <DropdownLink
                        to="/docs"
                        icon={<FileText className="h-4 w-4 text-indigo-400" />}
                        title="Documentation"
                        desc="Guides, APIs & settings"
                      />
                      <DropdownLink
                        to="/roadmap"
                        icon={<Map className="h-4 w-4 text-cyan-400" />}
                        title="Roadmap"
                        desc="Upcoming features & plans"
                      />
                      <DropdownLink
                        to="/changelog"
                        icon={<History className="h-4 w-4 text-orange-400" />}
                        title="What's New"
                        desc="View recent changelogs"
                      />
                      <DropdownLink
                        to="/faq"
                        icon={<HelpCircle className="h-4 w-4 text-teal-400" />}
                        title="FAQ"
                        desc="Answers to common questions"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Link to="/community" className="hover:text-foreground transition">
              {t("nav.community")}
            </Link>
            <Link to="/second-life" className="hover:text-foreground transition">
              {t("nav.secondLife")}
            </Link>
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
            <div className="mb-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
              <span className="text-sm text-muted-foreground">{t("common.language")}</span>
              <LanguagePicker compact />
            </div>
            {!loading && user ? (
              <>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 mb-2">
                  <span className="text-sm text-muted-foreground">Credits</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Coins className="h-4 w-4 text-primary-glow" />
                    {profile?.is_owner ? "∞" : (profile?.credits ?? 0).toLocaleString()}
                  </span>
                </div>
                {/* Create & Share */}
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary-glow mt-1 mb-0.5 px-1">
                  Create & Share
                </p>
                <MobileLink
                  to="/"
                  onClick={closeMenu}
                  icon={<Home className="h-4 w-4" />}
                  label="Home"
                />
                <MobileLink
                  to="/generate"
                  onClick={closeMenu}
                  icon={<Sparkles className="h-4 w-4" />}
                  label="AI 3D Generator"
                  accent
                />
                <MobileLink
                  to="/dashboard"
                  onClick={closeMenu}
                  icon={<LayoutDashboard className="h-4 w-4" />}
                  label="Dashboard"
                />
                <MobileLink
                  to="/community"
                  onClick={closeMenu}
                  icon={<Users className="h-4 w-4" />}
                  label="Community Gallery"
                />
                <MobileLink
                  to="/credits"
                  onClick={closeMenu}
                  icon={<Coins className="h-4 w-4" />}
                  label="Credits"
                />
                <MobileLink
                  to="/teams"
                  onClick={closeMenu}
                  icon={<Users className="h-4 w-4" />}
                  label="Teams"
                />
                <MobileLink
                  to="/profile"
                  onClick={closeMenu}
                  icon={<User className="h-4 w-4" />}
                  label="Profile"
                />

                {/* Integrations */}
                <p className="text-[10px] font-bold uppercase tracking-wider text-pink-400 mt-3 mb-0.5 px-1">
                  Integrations & SDKs
                </p>
                <MobileLink
                  to="/second-life"
                  onClick={closeMenu}
                  icon={<Globe className="h-4 w-4" />}
                  label="Second Life Hub"
                />
                <MobileLink
                  to="/integrations/blender"
                  onClick={closeMenu}
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Blender Add-on"
                />
                <MobileLink
                  to="/integrations/roblox"
                  onClick={closeMenu}
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Roblox Plugin"
                />
                <MobileLink
                  to="/integrations/unity"
                  onClick={closeMenu}
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Unity SDK"
                />
                <MobileLink
                  to="/integrations/unreal"
                  onClick={closeMenu}
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Unreal Engine"
                />
                <MobileLink
                  to="/integrations/godot"
                  onClick={closeMenu}
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Godot"
                />
                <MobileLink
                  to="/integrations/web"
                  onClick={closeMenu}
                  icon={<Globe className="h-4 w-4" />}
                  label="Web API"
                />

                {/* Resources */}
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mt-3 mb-0.5 px-1">
                  Resources & Docs
                </p>
                <MobileLink
                  to="/tutorials"
                  onClick={closeMenu}
                  icon={<BookOpen className="h-4 w-4" />}
                  label="Tutorials"
                />
                <MobileLink
                  to="/docs"
                  onClick={closeMenu}
                  icon={<FileText className="h-4 w-4" />}
                  label="Documentation"
                />
                <MobileLink
                  to="/roadmap"
                  onClick={closeMenu}
                  icon={<Map className="h-4 w-4" />}
                  label="Roadmap"
                />
                <MobileLink
                  to="/changelog"
                  onClick={closeMenu}
                  icon={<History className="h-4 w-4" />}
                  label="What's New"
                />
                <MobileLink
                  to="/faq"
                  onClick={closeMenu}
                  icon={<HelpCircle className="h-4 w-4" />}
                  label="FAQ"
                />
                {/* Admin link hidden from mobile menu — access via direct URL /admin */}
              </>
            ) : (
              <>
                <MobileLink
                  to="/"
                  onClick={closeMenu}
                  icon={<Home className="h-4 w-4" />}
                  label="Home"
                />
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
                  {t("nav.launchApp")}
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

function DropdownLink({
  to,
  icon,
  title,
  desc,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-start gap-3 rounded-xl p-2 hover:bg-white/5 transition duration-200 group/link text-left"
    >
      <div className="mt-0.5 rounded-lg bg-white/5 p-1.5 transition-colors group-hover/link:bg-primary/20 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-foreground group-hover/link:text-primary-glow transition-colors truncate">
          {title}
        </div>
        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}
