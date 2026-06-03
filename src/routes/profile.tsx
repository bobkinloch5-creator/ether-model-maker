import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  updateProfile,
  getPurchases,
  getUserStats,
  getMyReferrals,
  applyReferralCode,
  supabase,
  type Purchase,
  type ReferralRow,
} from "@/lib/supabase";
import {
  ArrowLeft,
  User,
  Mail,
  Key,
  Coins,
  Save,
  Loader2,
  LogOut,
  Copy,
  CheckCircle2,
  Shield,
  TrendingUp,
  CreditCard,
  History,
  Box,
  Palette,
  Sparkles,
  Image as ImageIcon,
  Wand2,
  Dices,
  Gift,
  Share2,
  Ticket,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile Settings — KingDavez Studios (Beta)" },
      {
        name: "description",
        content:
          "Customize your KingDavez Studios profile, avatar, display name, bio, theme preferences, API keys, and referral code.",
      },
      {
        name: "keywords",
        content:
          "3D creator profile, AI generator account, avatar generator, API key manager, referral program",
      },
      { property: "og:title", content: "Profile Settings — KingDavez Studios" },
      {
        property: "og:description",
        content: "Customize your KingDavez Studios profile, avatar, and preferences.",
      },
      { property: "og:url", content: "https://kingdavez.click/profile" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/profile" }],
  }),
  component: ProfilePage,
});

// ----- Avatar catalog (DiceBear, no auth, returns SVG) -----
const AVATAR_STYLES: { id: string; label: string; emoji: string; vibe: string }[] = [
  { id: "avataaars", label: "Classic", emoji: "🧑", vibe: "Stylized humans" },
  { id: "lorelei", label: "Feminine", emoji: "👩", vibe: "Soft illustrated" },
  { id: "micah", label: "Masculine", emoji: "👨", vibe: "Bold illustrated" },
  { id: "personas", label: "Diverse", emoji: "🧑‍🎨", vibe: "Modern portraits" },
  { id: "adventurer", label: "Fantasy", emoji: "🧝", vibe: "RPG hero" },
  { id: "bottts", label: "Robot", emoji: "🤖", vibe: "Cyber-bot" },
  { id: "pixel-art", label: "Pixel", emoji: "👾", vibe: "8-bit retro" },
  { id: "thumbs", label: "Creature", emoji: "👻", vibe: "Cute monster" },
];

const SEEDS = [
  "Aria",
  "Kai",
  "Nova",
  "Zane",
  "Luna",
  "Rex",
  "Mika",
  "Ivy",
  "Orion",
  "Sage",
  "Jade",
  "Echo",
];

function avatarUrl(style: string, seed: string) {
  const s = encodeURIComponent(seed || "default");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${s}`;
}

// ----- Accent colors -----
const ACCENTS: { id: string; label: string; hex: string; glow: string }[] = [
  { id: "violet", label: "Violet", hex: "#8b5cf6", glow: "rgba(139,92,246,0.45)" },
  { id: "cyan", label: "Cyan", hex: "#22d3ee", glow: "rgba(34,211,238,0.45)" },
  { id: "emerald", label: "Emerald", hex: "#10b981", glow: "rgba(16,185,129,0.45)" },
  { id: "amber", label: "Amber", hex: "#f59e0b", glow: "rgba(245,158,11,0.45)" },
  { id: "rose", label: "Rose", hex: "#f43f5e", glow: "rgba(244,63,94,0.45)" },
  { id: "blue", label: "Blue", hex: "#3b82f6", glow: "rgba(59,130,246,0.45)" },
];

// ----- Banner gradients -----
const BANNERS: { id: string; label: string; css: string }[] = [
  { id: "aurora", label: "Aurora", css: "linear-gradient(135deg,#0f172a,#4f46e5 45%,#22d3ee)" },
  { id: "sunset", label: "Sunset", css: "linear-gradient(135deg,#7c2d12,#f59e0b 50%,#f43f5e)" },
  { id: "noir", label: "Noir", css: "linear-gradient(135deg,#000000,#1f2937 60%,#374151)" },
  { id: "mint", label: "Mint", css: "linear-gradient(135deg,#064e3b,#10b981 60%,#a7f3d0)" },
  { id: "candy", label: "Candy", css: "linear-gradient(135deg,#831843,#ec4899 50%,#a78bfa)" },
  { id: "ocean", label: "Ocean", css: "linear-gradient(135deg,#0c2340,#1e40af 50%,#22d3ee)" },
];

function ProfilePage() {
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [slUsername, setSlUsername] = useState("");
  const [robloxUsername, setRobloxUsername] = useState("");
  const [bio, setBio] = useState("");
  const [accent, setAccent] = useState("violet");
  const [banner, setBanner] = useState("aurora");
  const [avatarStyle, setAvatarStyle] = useState("avataaars");
  const [avatarSeed, setAvatarSeed] = useState("Aria");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [userStats, setUserStats] = useState<{
    current_credits: number;
    total_purchased: number;
    total_used: number;
    total_generations: number;
    member_since: string;
  } | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [refCodeInput, setRefCodeInput] = useState("");
  const [refApplying, setRefApplying] = useState(false);
  const [refMsg, setRefMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [refCopied, setRefCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setSlUsername(profile.sl_username || "");
      setRobloxUsername(profile.roblox_username || "");
      setBio(profile.bio || "");
      setAccent(profile.accent_color || "violet");
      setBanner(profile.banner_gradient || "aurora");
      setAvatarStyle(profile.avatar_style || "avataaars");
      setAvatarSeed(profile.avatar_seed || profile.display_name || "Aria");
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      setLoadingPurchases(true);
      getPurchases(user.id)
        .then(setPurchases)
        .finally(() => setLoadingPurchases(false));
      getUserStats(user.id).then(setUserStats);
      getMyReferrals(user.id).then(setReferrals);
    }
  }, [user]);

  const referralLink = useMemo(() => {
    if (!profile?.referral_code || typeof window === "undefined") return "";
    return `${window.location.origin}/signup?ref=${profile.referral_code}`;
  }, [profile?.referral_code]);

  const totalReferralCredits = useMemo(
    () => referrals.reduce((sum, r) => sum + (r.referrer_bonus || 0), 0),
    [referrals],
  );

  const copyRef = async (text: string, which: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setRefCopied(which);
      setTimeout(() => setRefCopied(null), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleApplyReferral = async () => {
    const code = refCodeInput.trim();
    if (!code) return;
    setRefApplying(true);
    setRefMsg(null);
    // Try referral first
    const res = await applyReferralCode(code);
    if (res.success) {
      setRefMsg({ kind: "ok", text: `Code applied — +${res.bonus ?? 50} credits!` });
      setRefCodeInput("");
      await refreshProfile();
      setRefApplying(false);
      return;
    }
    // Fallback: try as a promo code
    const { data, error } = await supabase.rpc("redeem_promo", { _code: code });
    if (!error && data) {
      const r = data as { credits: number; code: string };
      setRefMsg({ kind: "ok", text: `Promo redeemed — +${r.credits} credits!` });
      setRefCodeInput("");
      await refreshProfile();
    } else {
      setRefMsg({ kind: "err", text: error?.message || res.error || "Invalid code" });
    }
    setRefApplying(false);
  };

  const accentObj = useMemo(() => ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0], [accent]);
  const bannerObj = useMemo(() => BANNERS.find((b) => b.id === banner) ?? BANNERS[0], [banner]);
  const liveAvatar = useMemo(() => avatarUrl(avatarStyle, avatarSeed), [avatarStyle, avatarSeed]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    const updated = await updateProfile(user.id, {
      display_name: displayName.trim(),
      sl_username: slUsername.trim() || null,
      roblox_username: robloxUsername.trim() || null,
      bio: bio.trim().slice(0, 280),
      accent_color: accent,
      banner_gradient: banner,
      avatar_style: avatarStyle,
      avatar_seed: avatarSeed.trim() || "default",
      avatar_url: liveAvatar,
    });
    if (updated) {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert("Failed to save profile. Please try again.");
    }
    setSaving(false);
  };

  const copyApiKey = () => {
    if (profile?.api_key) {
      navigator.clipboard.writeText(profile.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const rollSeed = () =>
    setAvatarSeed(
      SEEDS[Math.floor(Math.random() * SEEDS.length)] + Math.floor(Math.random() * 999),
    );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/10">
        <div className="glass">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="font-semibold">
                  {profile?.is_owner ? "Unlimited" : (profile?.credits ?? 0)}
                </span>
              </div>
              <button
                onClick={() => signOut().then(() => navigate({ to: "/" }))}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* ===== Hero / Live Preview Card ===== */}
        <section
          className="relative overflow-hidden rounded-3xl border border-white/10 animate-slide-up"
          style={{ boxShadow: `0 30px 80px -30px ${accentObj.glow}` }}
        >
          <div className="h-44 w-full" style={{ background: bannerObj.css }} />
          <div className="bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col gap-4 px-6 pb-6 pt-0 sm:flex-row sm:items-end sm:gap-6">
              <div
                className="relative -mt-14 grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-background bg-background shadow-xl transition"
                style={{
                  boxShadow: `0 0 0 2px ${accentObj.hex}, 0 20px 50px -10px ${accentObj.glow}`,
                }}
              >
                <img src={liveAvatar} alt="avatar" className="h-full w-full" />
              </div>
              <div className="flex-1 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">
                    {displayName || "Your name"}
                  </h1>
                  {profile?.is_owner && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                      style={{
                        color: accentObj.hex,
                        borderColor: `${accentObj.hex}55`,
                        background: `${accentObj.hex}1a`,
                      }}
                    >
                      <Shield className="h-3 w-3" /> OWNER
                    </span>
                  )}
                  {profile?.is_manager && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                      <Shield className="h-3 w-3" /> MANAGER
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {bio && <p className="mt-2 max-w-xl text-sm text-foreground/80">{bio}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {slUsername && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      SL: {slUsername}
                    </span>
                  )}
                  {robloxUsername && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      Roblox: {robloxUsername}
                    </span>
                  )}
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Joined{" "}
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex h-11 items-center gap-2 self-start rounded-xl px-5 text-sm font-medium text-white shadow-lg transition hover:opacity-95 disabled:opacity-50 sm:self-end"
                style={{
                  background: `linear-gradient(135deg, ${accentObj.hex}, ${accentObj.hex}cc)`,
                }}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save profile
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ===== Stats ===== */}
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            {
              icon: Coins,
              color: "text-amber-400",
              label: "Credits",
              value: profile?.is_owner ? "∞" : (profile?.credits ?? 0),
            },
            {
              icon: CreditCard,
              color: "text-emerald-400",
              label: "Purchased",
              value: userStats?.total_purchased ?? 0,
            },
            {
              icon: TrendingUp,
              color: "text-purple-400",
              label: "Used",
              value: userStats?.total_used ?? 0,
            },
            {
              icon: Box,
              color: "text-pink-400",
              label: "Generations",
              value: userStats?.total_generations ?? 0,
            },
          ].map((s, i) => (
            <div
              key={s.label}
              className="glass rounded-2xl p-5 animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="font-display text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* ===== Avatar Picker ===== */}
          <section className="glass rounded-2xl p-6 animate-slide-up">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold mb-1">
              <Wand2 className="h-5 w-5" style={{ color: accentObj.hex }} />
              Choose your avatar
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pick a style, then roll a look you love.
            </p>

            <div className="grid grid-cols-4 gap-2">
              {AVATAR_STYLES.map((s) => {
                const active = avatarStyle === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setAvatarStyle(s.id)}
                    className="group relative flex flex-col items-center gap-1 rounded-xl border bg-white/5 p-2 text-xs transition hover:bg-white/10"
                    style={{
                      borderColor: active ? accentObj.hex : "rgba(255,255,255,0.1)",
                      boxShadow: active
                        ? `0 0 0 1px ${accentObj.hex}, 0 8px 24px -10px ${accentObj.glow}`
                        : undefined,
                    }}
                  >
                    <img
                      src={avatarUrl(s.id, avatarSeed)}
                      alt={s.label}
                      className="h-14 w-14 rounded-lg bg-black/30"
                    />
                    <span className="font-medium">
                      {s.emoji} {s.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">
                Avatar seed
              </label>
              <div className="flex gap-2">
                <input
                  value={avatarSeed}
                  onChange={(e) => setAvatarSeed(e.target.value)}
                  placeholder="Any text — your look is generated from this"
                  className="h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition"
                  style={{ ["--tw-ring-color" as string]: `${accentObj.hex}55` }}
                />
                <button
                  onClick={rollSeed}
                  className="flex h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 text-sm transition hover:bg-white/10"
                  title="Random"
                >
                  <Dices className="h-4 w-4" /> Roll
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setAvatarSeed(s)}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-muted-foreground transition hover:text-foreground hover:bg-white/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ===== 3D Backend (owner-only) ===== */}
          {profile?.is_owner && (
            <section className="glass rounded-2xl p-6 animate-slide-up animate-delay-100">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold mb-1">
                <Box className="h-5 w-5" />
                3D Backend
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choose which Hugging Face Space generates your meshes (TripoSR, TRELLIS, Hunyuan3D,
                or your own).
              </p>
              <Link
                to="/settings/backend"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/50 px-4 py-2 text-sm font-medium hover:bg-background"
              >
                Open backend settings →
              </Link>
            </section>
          )}

          {/* ===== Theme ===== */}
          <section className="glass rounded-2xl p-6 animate-slide-up animate-delay-100">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold mb-1">
              <Palette className="h-5 w-5" style={{ color: accentObj.hex }} />
              Theme
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pick an accent and banner — preview updates live above.
            </p>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Accent color
              </label>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((a) => {
                  const active = accent === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setAccent(a.id)}
                      className="grid h-10 w-10 place-items-center rounded-xl border transition hover:scale-105"
                      style={{
                        background: a.hex,
                        borderColor: active ? "#fff" : "transparent",
                        boxShadow: active
                          ? `0 0 0 2px ${a.hex}, 0 8px 24px -8px ${a.glow}`
                          : undefined,
                      }}
                      title={a.label}
                    >
                      {active && <CheckCircle2 className="h-4 w-4 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Banner
              </label>
              <div className="grid grid-cols-3 gap-2">
                {BANNERS.map((b) => {
                  const active = banner === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setBanner(b.id)}
                      className="relative h-16 rounded-xl border transition hover:scale-[1.02]"
                      style={{
                        background: b.css,
                        borderColor: active ? accentObj.hex : "rgba(255,255,255,0.1)",
                        boxShadow: active ? `0 0 0 1px ${accentObj.hex}` : undefined,
                      }}
                      title={b.label}
                    >
                      <span className="absolute bottom-1 left-2 text-[10px] font-medium uppercase tracking-wider text-white/90 drop-shadow">
                        {b.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* ===== Profile Info ===== */}
        <section className="mt-6 glass rounded-2xl p-6 animate-slide-up">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold mb-6">
            <User className="h-5 w-5" style={{ color: accentObj.hex }} />
            Profile information
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">
                Display name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition"
                style={{ ["--tw-ring-color" as string]: `${accentObj.hex}55` }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={user.email ?? ""}
                  readOnly
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">
                Bio <span className="text-muted-foreground">({bio.length}/280)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 280))}
                rows={3}
                placeholder="Tell people who you are and what you build…"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition resize-none"
                style={{ ["--tw-ring-color" as string]: `${accentObj.hex}55` }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">
                Second Life Username
              </label>
              <input
                value={slUsername}
                onChange={(e) => setSlUsername(e.target.value)}
                placeholder="Your Second Life legacy name"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition"
                style={{ ["--tw-ring-color" as string]: `${accentObj.hex}55` }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground/80">
                Roblox Username
              </label>
              <input
                value={robloxUsername}
                onChange={(e) => setRobloxUsername(e.target.value)}
                placeholder="Your Roblox username"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition"
                style={{ ["--tw-ring-color" as string]: `${accentObj.hex}55` }}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${accentObj.hex}, ${accentObj.hex}cc)`,
              }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save changes
                </>
              )}
            </button>
          </div>
        </section>

        {/* ===== Purchase History ===== */}
        <section className="mt-6 glass rounded-2xl p-6 animate-slide-up">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold mb-4">
            <History className="h-5 w-5" style={{ color: accentObj.hex }} />
            Purchase history
          </h2>
          {loadingPurchases ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">No purchases yet</p>
              <Link
                to="/credits"
                className="mt-3 inline-block text-sm hover:underline"
                style={{ color: accentObj.hex }}
              >
                Buy credits →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20">
                      <CreditCard className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.credits} credits</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${p.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"}`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== Referrals ===== */}
        <section className="mt-6 glass rounded-2xl p-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Gift className="h-5 w-5" style={{ color: accentObj.hex }} />
                Refer friends, earn credits
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You both get <span className="font-semibold text-foreground">+50 credits</span> when
                a friend signs up with your code.
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3 shrink-0">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center min-w-[88px]">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Referrals
                </p>
                <p className="text-lg font-display font-semibold">{referrals.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center min-w-[88px]">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Earned</p>
                <p className="text-lg font-display font-semibold flex items-center justify-center gap-1">
                  <Coins className="h-4 w-4 text-amber-400" />
                  {totalReferralCredits}
                </p>
              </div>
            </div>
          </div>

          {/* Code + link */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Your code
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-base tracking-[0.2em] text-center"
                  style={{ color: accentObj.hex }}
                >
                  {profile?.referral_code || "—"}
                </div>
                <button
                  onClick={() => profile?.referral_code && copyRef(profile.referral_code, "code")}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="Copy code"
                >
                  {refCopied === "code" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Share link
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-xs text-muted-foreground truncate">
                  {referralLink || "—"}
                </div>
                <button
                  onClick={() => referralLink && copyRef(referralLink, "link")}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  title="Copy link"
                >
                  {refCopied === "link" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Apply a code (if not yet referred) */}
          {!profile?.referred_by && (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5" /> Got a friend's code or promo?
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={refCodeInput}
                  onChange={(e) => setRefCodeInput(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  maxLength={32}
                  className="flex-1 h-10 rounded-xl border border-white/10 bg-black/30 px-4 text-sm uppercase tracking-[0.15em] placeholder:text-muted-foreground placeholder:tracking-normal focus:border-primary/50 focus:outline-none"
                />
                <button
                  onClick={handleApplyReferral}
                  disabled={refApplying || !refCodeInput.trim()}
                  className="h-10 px-5 rounded-xl bg-[var(--gradient-primary)] text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {refApplying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Gift className="h-4 w-4" /> Apply
                    </>
                  )}
                </button>
              </div>
              {refMsg && (
                <p
                  className={`mt-2 text-xs ${refMsg.kind === "ok" ? "text-emerald-400" : "text-destructive"}`}
                >
                  {refMsg.text}
                </p>
              )}
            </div>
          )}

          {/* Referral list */}
          {referrals.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                People you've referred
              </p>
              <div className="space-y-1.5">
                {referrals.slice(0, 8).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-500/15">
                        <User className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground truncate">
                        {r.referred_user_id.slice(0, 8)}…
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
                        <Coins className="h-3 w-3" /> +{r.referrer_bonus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ===== API Key ===== */}
        <section className="mt-6 glass rounded-2xl p-6 animate-slide-up">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold mb-2">
            <Key className="h-5 w-5" style={{ color: accentObj.hex }} />
            API key
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Use this key to connect your Second Life HUD or external tools.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-sm text-muted-foreground">
              {profile?.api_key
                ? `${profile.api_key.slice(0, 8)}${"•".repeat(20)}${profile.api_key.slice(-6)}`
                : "Loading…"}
            </div>
            <button
              onClick={copyApiKey}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 text-sm transition hover:bg-white/10"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </section>

        {/* ===== Account ===== */}
        <section className="mt-6 glass rounded-2xl p-6 animate-slide-up">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold mb-4">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Account
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-xs text-muted-foreground">
                {user.id.slice(0, 8)}…
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
