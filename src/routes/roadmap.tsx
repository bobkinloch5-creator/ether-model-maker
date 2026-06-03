import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Map,
  Rocket,
  Wrench,
  Calendar,
  CheckCircle2,
  Hourglass,
  ArrowRight,
  Flame,
  Sparkles,
  Zap,
  Users,
  Globe,
  Gamepad2,
  Image,
  Layers,
  MessageSquare,
  Crown,
  Code2,
  Cpu,
  ChevronUp,
} from "lucide-react";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap — KingDavez Studios (Beta)" },
      {
        name: "description",
        content:
          "See what's coming next to KingDavez Studios. Upcoming features, active development, and recently shipped updates for our AI 3D generation platform.",
      },
      { property: "og:title", content: "Roadmap — KingDavez Studios" },
      {
        property: "og:description",
        content: "Upcoming features and what's next for KingDavez Studios.",
      },
      { property: "og:url", content: "https://kingdavez.click/roadmap" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Product Roadmap — KingDavez Studios" },
      {
        name: "twitter:description",
        content: "See what's next for KingDavez Studios AI 3D generation platform.",
      },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/roadmap" }],
  }),
  component: RoadmapPage,
});

type Status = "shipped" | "progress" | "planned";
type Quarter = "Q2 2026" | "Q3 2026" | "Q4 2026" | "Q1 2027";

interface RoadmapItem {
  title: string;
  description: string;
  status: Status;
  quarter: Quarter;
  category: string;
  icon: typeof Rocket;
  votes?: number;
}

const STATUS_CONFIG: Record<
  Status,
  { label: string; icon: typeof CheckCircle2; color: string; badge: string }
> = {
  shipped: {
    label: "Shipped",
    icon: CheckCircle2,
    color: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  progress: {
    label: "In Progress",
    icon: Wrench,
    color: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  planned: {
    label: "Planned",
    icon: Hourglass,
    color: "text-blue-400",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
};

const CATEGORY_ICONS: Record<string, typeof Rocket> = {
  "3D Generation": Cpu,
  Platform: Layers,
  Integrations: Zap,
  Community: Users,
  "Second Life": Globe,
  Gaming: Gamepad2,
  Visuals: Image,
  API: Code2,
  Monetization: Crown,
  AI: Sparkles,
  Social: MessageSquare,
};

const CATEGORY_COLORS: Record<string, string> = {
  "3D Generation": "text-purple-400",
  Platform: "text-cyan-400",
  Integrations: "text-amber-400",
  Community: "text-pink-400",
  "Second Life": "text-emerald-400",
  Gaming: "text-indigo-400",
  Visuals: "text-rose-400",
  API: "text-teal-400",
  Monetization: "text-yellow-400",
  AI: "text-orange-400",
  Social: "text-sky-400",
};

const roadmapItems: RoadmapItem[] = [
  // Shipped
  {
    title: "Full 3D Customization Panel",
    description:
      "Granular control over mesh generation: topology, resolution, material type, UV mapping, and export format selection.",
    status: "shipped",
    quarter: "Q2 2026",
    category: "3D Generation",
    icon: Cpu,
    votes: 89,
  },
  {
    title: "Profile Mini-Dashboard & Avatars",
    description:
      "Redesigned profile page with customizable display name, bio, avatar selection (male/female/neutral), and referral stats.",
    status: "shipped",
    quarter: "Q2 2026",
    category: "Platform",
    icon: Users,
    votes: 112,
  },
  {
    title: "Referral System",
    description:
      "Earn +50 bonus credits for every friend you refer. Track referrals, copy your code, and see total earnings.",
    status: "shipped",
    quarter: "Q2 2026",
    category: "Monetization",
    icon: Crown,
    votes: 76,
  },
  {
    title: "Scroll & Hover Animations",
    description:
      "Scroll-triggered reveals, staggered entrance animations, hover micro-interactions, and ambient particle effects site-wide.",
    status: "shipped",
    quarter: "Q2 2026",
    category: "Visuals",
    icon: Sparkles,
    votes: 54,
  },
  {
    title: "Mobile-Responsive Navigation",
    description:
      "Full mobile hamburger menu, responsive toolbar on the generator page, and touch-friendly layouts throughout.",
    status: "shipped",
    quarter: "Q2 2026",
    category: "Platform",
    icon: Layers,
    votes: 68,
  },
  {
    title: "FBX Export & Developer API",
    description:
      "Export Autodesk FBX format alongside GLB/OBJ/STL. Manage your personal API key for external integrations.",
    status: "shipped",
    quarter: "Q2 2026",
    category: "API",
    icon: Code2,
    votes: 95,
  },
  {
    title: "PayPal Credit Purchases",
    description:
      "Buy credit packs (50, 150, 300) securely via PayPal. Instant delivery with full transaction history.",
    status: "shipped",
    quarter: "Q2 2026",
    category: "Monetization",
    icon: Crown,
    votes: 82,
  },
  // In Progress
  {
    title: "AI Image-to-Texture Pipeline",
    description:
      "Upload any image and get AI-generated seamless PBR textures with normal, roughness, and metallic maps.",
    status: "progress",
    quarter: "Q2 2026",
    category: "3D Generation",
    icon: Image,
    votes: 156,
  },
  {
    title: "Team Collaboration Workspaces",
    description:
      "Create team workspaces with shared projects, role-based permissions, and pooled credit budgets.",
    status: "progress",
    quarter: "Q3 2026",
    category: "Community",
    icon: Users,
    votes: 134,
  },
  {
    title: "Discord Integration & Webhooks",
    description:
      "Get notified in Discord when generations complete. Share models directly to channels with rich embeds.",
    status: "progress",
    quarter: "Q3 2026",
    category: "Integrations",
    icon: Zap,
    votes: 78,
  },
  {
    title: "Real-time 3D Preview Engine",
    description:
      "Interactive WebGL preview with orbit controls, wireframe toggle, material editing, and lighting presets before export.",
    status: "progress",
    quarter: "Q3 2026",
    category: "3D Generation",
    icon: Cpu,
    votes: 201,
  },
  // Planned
  {
    title: "Second Life Bot In-World Upload",
    description:
      "One-click upload of generated models directly to Second Life via our in-world bot with auto-L$ pricing.",
    status: "planned",
    quarter: "Q3 2026",
    category: "Second Life",
    icon: Globe,
    votes: 245,
  },
  {
    title: "Unity & Unreal Engine Plugins",
    description:
      "Official editor plugins for Unity and Unreal Engine to import generated assets with one click.",
    status: "planned",
    quarter: "Q3 2026",
    category: "Gaming",
    icon: Gamepad2,
    votes: 189,
  },
  {
    title: "Batch Generation API",
    description:
      "Queue up to 50 generations at once via CSV/JSON upload. Perfect for content creators and studios.",
    status: "planned",
    quarter: "Q3 2026",
    category: "API",
    icon: Code2,
    votes: 67,
  },
  {
    title: "Subscription Tiers",
    description:
      "Monthly plans: Starter (free), Creator ($9/mo), Studio ($29/mo), and Enterprise with dedicated support.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Monetization",
    icon: Crown,
    votes: 91,
  },
  {
    title: "Community Model Marketplace",
    description: "Browse, buy, and sell community-generated 3D models. Revenue split for creators.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Community",
    icon: Users,
    votes: 178,
  },
  {
    title: "AI Rigging & Animation",
    description:
      "Auto-rig generated characters with skeletal systems and export with basic idle/walk animations.",
    status: "planned",
    quarter: "Q4 2026",
    category: "3D Generation",
    icon: Cpu,
    votes: 223,
  },
  {
    title: "VR/AR Preview Mode",
    description:
      "View generated models in augmented reality on mobile devices and in VR headset spatial environments.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Visuals",
    icon: Image,
    votes: 156,
  },
  {
    title: "Advanced Prompt Library",
    description:
      "Curated prompt templates organized by category (fantasy, sci-fi, architecture, characters). Community contributions accepted.",
    status: "planned",
    quarter: "Q1 2027",
    category: "AI",
    icon: Sparkles,
    votes: 88,
  },
  {
    title: "Social Sharing & Likes",
    description:
      "Public galleries for showcasing creations. Like, comment, and remix community models.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Social",
    icon: MessageSquare,
    votes: 143,
  },

  // ===== Q3 2026 — Creator Power Tools =====
  {
    title: "Multi-Model Variations",
    description:
      "Generate 4 variations per prompt in a single run. Pick the best, refine in place, or fuse traits from multiple results into one mesh.",
    status: "planned",
    quarter: "Q3 2026",
    category: "3D Generation",
    icon: Cpu,
    votes: 167,
  },
  {
    title: "Style Transfer Between Models",
    description:
      "Take the silhouette of one model and the material/style of another. Mix a sci-fi helmet's shape with a medieval armor's textures.",
    status: "planned",
    quarter: "Q3 2026",
    category: "AI",
    icon: Sparkles,
    votes: 142,
  },
  {
    title: "Sketch-to-3D",
    description:
      "Draw a rough doodle on a canvas and watch it turn into a fully textured 3D model. Powered by stroke-aware diffusion.",
    status: "planned",
    quarter: "Q3 2026",
    category: "3D Generation",
    icon: Image,
    votes: 198,
  },
  {
    title: "Voice-to-3D Prompts",
    description:
      "Hands-free creation: hit record, describe your idea out loud, and the generator transcribes + builds it instantly.",
    status: "planned",
    quarter: "Q3 2026",
    category: "AI",
    icon: Sparkles,
    votes: 84,
  },

  // ===== Q4 2026 — Second Life Domination =====
  {
    title: "Second Life HUD v2",
    description:
      "Redesigned in-world HUD with thumbnail previews, prompt history, and one-click rezz of finished mesh directly in your parcel.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Second Life",
    icon: Globe,
    votes: 211,
  },
  {
    title: "SL Texture Pack Generator",
    description:
      "Generate complete seamless texture packs (wood, stone, fabric, sci-fi panels) optimized for SL's 1024×1024 limit with diffuse + normal + spec.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Second Life",
    icon: Layers,
    votes: 176,
  },
  {
    title: "Auto Low-LI Optimizer",
    description:
      "Drop in any heavy mesh and we'll automatically rebuild it for ultra-low Land Impact while preserving silhouette and bake quality.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Second Life",
    icon: Cpu,
    votes: 234,
  },
  {
    title: "SL Avatar Accessory Generator",
    description:
      "Specialized mode for SL avatar attachments: hats, jewelry, weapons, wings. Auto-rigged to standard SL bone hierarchy.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Second Life",
    icon: Crown,
    votes: 189,
  },
  {
    title: "L$ Direct Payments",
    description:
      "Top up credits with Linden Dollars from the in-world store. No PayPal, no card — pay the way SL creators already pay.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Monetization",
    icon: Crown,
    votes: 167,
  },

  // ===== Q1 2027 — Worlds & Stories =====
  {
    title: "Scene & Diorama Builder",
    description:
      "Prompt entire scenes, not just single models. 'A medieval tavern interior with 12 props' generates the whole set, snapped to a grid.",
    status: "planned",
    quarter: "Q1 2027",
    category: "3D Generation",
    icon: Layers,
    votes: 256,
  },
  {
    title: "Character Studio",
    description:
      "Full character pipeline: face → body → outfit → accessories → rig → idle animation. Build a hero in 5 minutes.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Gaming",
    icon: Users,
    votes: 312,
  },
  {
    title: "World Kit Bundles",
    description:
      "Premade themed bundles (cyberpunk alley, fantasy village, sci-fi station). Buy once, drop the whole world into your project.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Gaming",
    icon: Gamepad2,
    votes: 178,
  },
  {
    title: "Procedural Environment Generator",
    description:
      "Prompt a biome ('frozen tundra with crashed spaceship') and get terrain, props, lighting, and skybox — all consistent.",
    status: "planned",
    quarter: "Q1 2027",
    category: "3D Generation",
    icon: Globe,
    votes: 224,
  },

  // ===== Q2 2027 — Community & Economy =====
  {
    title: "Creator Royalties",
    description:
      "If your community model is remixed or used in another generation, you earn a percentage automatically. Real residual income.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Monetization",
    icon: Crown,
    votes: 287,
  },
  {
    title: "Live Generation Streams",
    description:
      "Twitch-style live feeds of creators prompting in real time. Follow your favorites, watch their workflow, drop tips.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Social",
    icon: MessageSquare,
    votes: 134,
  },
  {
    title: "Weekly Prompt Challenges",
    description:
      "Themed contests every Monday with credit prizes, marketplace boosts, and featured spots on the homepage.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Community",
    icon: Flame,
    votes: 198,
  },
  {
    title: "Creator Verification & Badges",
    description:
      "Verified checkmark for established creators. Tiered badges for top sellers, featured artists, and beta testers.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Community",
    icon: CheckCircle2,
    votes: 92,
  },

  // ===== Bleeding Edge =====
  {
    title: "Physics-Aware Generation",
    description:
      "Models come out with auto-generated collision meshes, mass, and joint constraints. Drop straight into Unity/Unreal physics.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Gaming",
    icon: Gamepad2,
    votes: 145,
  },
  {
    title: "AI Co-Pilot Chat",
    description:
      "Conversational assistant inside the editor: 'make it more medieval', 'reduce poly count by half', 'export for Roblox'. It just does it.",
    status: "planned",
    quarter: "Q1 2027",
    category: "AI",
    icon: MessageSquare,
    votes: 267,
  },
  {
    title: "NeRF Photo Capture App",
    description:
      "Mobile app: walk around a real object, capture 30 photos, get a clean game-ready mesh back in under 2 minutes.",
    status: "planned",
    quarter: "Q1 2027",
    category: "3D Generation",
    icon: Image,
    votes: 203,
  },
  {
    title: "Generative Sound & Music Packs",
    description:
      "Pair every model with matching ambient audio. Prompt a forest scene, get the rustling leaves and bird calls baked in.",
    status: "planned",
    quarter: "Q1 2027",
    category: "AI",
    icon: Sparkles,
    votes: 121,
  },
  {
    title: "Mobile Generator App (iOS & Android)",
    description:
      "Full native apps with AR preview, push notifications, and on-the-go prompting. Your studio in your pocket.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Platform",
    icon: Layers,
    votes: 256,
  },
  {
    title: "Public REST + GraphQL API",
    description:
      "Versioned, documented, rate-limited API with SDKs in JS, Python, and C#. Build whatever you can imagine on top of us.",
    status: "planned",
    quarter: "Q1 2027",
    category: "API",
    icon: Code2,
    votes: 178,
  },

  // ===== Fresh Ideas — More Power, More Play =====
  {
    title: "Prompt Remix Wheel",
    description:
      "Spin a roulette of your past prompts mashed together. 'Cyberpunk + dragon + art deco' in one click — pure creative chaos for when you're stuck.",
    status: "planned",
    quarter: "Q3 2026",
    category: "AI",
    icon: Sparkles,
    votes: 119,
  },
  {
    title: "Reference Image Drop-In",
    description:
      "Drag any photo or concept art into the prompt box. The AI uses it as a visual seed for shape, palette, and mood — no prompt-writing needed.",
    status: "planned",
    quarter: "Q3 2026",
    category: "3D Generation",
    icon: Image,
    votes: 172,
  },
  {
    title: "Negative Prompts & Style Locks",
    description:
      "Tell the AI what NOT to make ('no spikes, no purple, no medieval'). Lock specific styles across a whole project for consistent collections.",
    status: "planned",
    quarter: "Q3 2026",
    category: "AI",
    icon: Sparkles,
    votes: 138,
  },
  {
    title: "One-Click Roblox Studio Upload",
    description:
      "Hit publish and your mesh lands in Roblox Studio with collision, MeshPart, and PBR textures pre-wired. No conversion, no fiddling.",
    status: "planned",
    quarter: "Q3 2026",
    category: "Gaming",
    icon: Gamepad2,
    votes: 215,
  },
  {
    title: "Blender Add-On",
    description:
      "Generate, refine, and re-import straight inside Blender. Sync your KingDavez credits and library with the N-panel.",
    status: "planned",
    quarter: "Q3 2026",
    category: "Integrations",
    icon: Zap,
    votes: 188,
  },
  {
    title: "ChatGPT & Claude Function Calling",
    description:
      "Plug our API into any LLM workflow. 'Hey GPT, design 5 fantasy swords' — and it builds them on KingDavez automatically.",
    status: "planned",
    quarter: "Q4 2026",
    category: "API",
    icon: Code2,
    votes: 161,
  },

  // ===== Personal & Vibe =====
  {
    title: "Daily Free Spin",
    description:
      "Log in every day, get a free generation roll on the house. Streaks unlock bonus credits, exclusive prompt packs, and badges.",
    status: "planned",
    quarter: "Q3 2026",
    category: "Community",
    icon: Flame,
    votes: 244,
  },
  {
    title: "Mood Board Workspaces",
    description:
      "Pinterest-style boards for collecting references, prompts, and finished models. Share boards publicly or keep them private for inspo.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Platform",
    icon: Layers,
    votes: 156,
  },
  {
    title: "Seasonal Theme Drops",
    description:
      "Limited-time prompt packs and UI themes for Halloween, Winter, Pride, and Summer. Some free, some unlocked with credits.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Visuals",
    icon: Sparkles,
    votes: 132,
  },
  {
    title: "Generation Replay Videos",
    description:
      "Auto-record a 5-second turntable + prompt overlay video for every finished model. Perfect for TikTok, Twitter, and Discord flexing.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Social",
    icon: MessageSquare,
    votes: 187,
  },
  {
    title: "Friend & Studio Activity Feed",
    description:
      "See what your friends and favorite creators are generating in real time. Like, comment, remix — your own creative timeline.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Social",
    icon: Users,
    votes: 168,
  },

  // ===== Pro / Studio Tools =====
  {
    title: "Version History & Undo",
    description:
      "Every generation auto-versioned. Roll back, branch, and compare side-by-side. Never lose that perfect early draft again.",
    status: "planned",
    quarter: "Q3 2026",
    category: "Platform",
    icon: Layers,
    votes: 152,
  },
  {
    title: "Mesh Cleanup & Retopology AI",
    description:
      "One-click quad retopo, weld duplicates, fix non-manifold edges. Hand the AI a messy mesh, get a clean production-ready one.",
    status: "planned",
    quarter: "Q4 2026",
    category: "3D Generation",
    icon: Cpu,
    votes: 207,
  },
  {
    title: "LOD Auto-Generator",
    description:
      "Spit out LOD0/1/2/3 versions automatically with smart polygon reduction. Game engines love it; performance loves it more.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Gaming",
    icon: Gamepad2,
    votes: 174,
  },
  {
    title: "Cloud Render Farm",
    description:
      "High-quality turntable renders, beauty shots, and product mockups rendered on our GPUs. Marketing-ready images in minutes.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Visuals",
    icon: Image,
    votes: 198,
  },
  {
    title: "Fine-Tune Your Own Style",
    description:
      "Upload 20+ of your own models and we'll fine-tune a private style model just for your studio. Brand consistency, locked in.",
    status: "planned",
    quarter: "Q1 2027",
    category: "AI",
    icon: Crown,
    votes: 289,
  },
  {
    title: "Watermark & License Tagging",
    description:
      "Embed invisible signature, license type (CC0, Commercial, Personal), and creator credit into every exported model file.",
    status: "planned",
    quarter: "Q4 2026",
    category: "Monetization",
    icon: CheckCircle2,
    votes: 96,
  },

  // ===== Bleeding Edge (more) =====
  {
    title: "4D Generation — Animated Meshes",
    description:
      "Not just a model — a moving model. Prompt 'a dragon breathing fire' and get a fully animated mesh with bone-baked motion.",
    status: "planned",
    quarter: "Q1 2027",
    category: "3D Generation",
    icon: Cpu,
    votes: 312,
  },
  {
    title: "Holographic Viewer Mode",
    description:
      "Preview your model as a lifelike hologram via Apple Vision Pro and Quest 3. Walk around it, scale it, share the spatial scene.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Visuals",
    icon: Sparkles,
    votes: 178,
  },
  {
    title: "Cross-Platform Asset Sync",
    description:
      "Generate once, syncs everywhere — your phone app, Blender, Unity, Roblox, and Second Life. One library, all your worlds.",
    status: "planned",
    quarter: "Q1 2027",
    category: "Platform",
    icon: Layers,
    votes: 221,
  },
];

const quarters: Quarter[] = ["Q2 2026", "Q3 2026", "Q4 2026", "Q1 2027"];

const VISION_PILLARS = [
  {
    icon: Globe,
    title: "Own Second Life AI",
    desc: "Be the default AI toolchain for every SL creator — from texture packs to full avatar attachments to one-click in-world upload.",
    accent: "from-emerald-500/20 to-cyan-500/10",
  },
  {
    icon: Gamepad2,
    title: "Game-Engine Native",
    desc: "First-class plugins for Unity, Unreal, Godot, and Roblox Studio. Generated assets feel native, not imported.",
    accent: "from-indigo-500/20 to-purple-500/10",
  },
  {
    icon: Users,
    title: "Creator Economy",
    desc: "A real marketplace with royalties, subscriptions, and verified storefronts. Indie creators making rent from prompts.",
    accent: "from-pink-500/20 to-rose-500/10",
  },
  {
    icon: Cpu,
    title: "Beyond Static Mesh",
    desc: "Rigged characters, full scenes, physics-ready props, NeRF capture, and generative audio. One platform, every asset type.",
    accent: "from-amber-500/20 to-orange-500/10",
  },
];

function RoadmapPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | Status>("all");
  const [activeQuarter, setActiveQuarter] = useState<"all" | Quarter>("all");
  const [userId, setUserId] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  const baseVotes = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of roadmapItems) m[slugify(it.title)] = it.votes ?? 0;
    return m;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      const { data: countsData } = await (supabase as any)
        .from("roadmap_vote_counts")
        .select("item_slug, vote_count");
      if (!active) return;
      const counts: Record<string, number> = {};
      (countsData ?? []).forEach((r: any) => {
        counts[r.item_slug] = r.vote_count ?? 0;
      });
      setVoteCounts(counts);

      if (uid) {
        const { data: mine } = await supabase
          .from("roadmap_votes")
          .select("item_slug")
          .eq("user_id", uid);
        if (!active) return;
        setMyVotes(new Set((mine ?? []).map((r: { item_slug: string }) => r.item_slug)));
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user) setMyVotes(new Set());
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const toggleVote = async (slug: string) => {
    if (!userId) {
      toast.error("Sign in to vote on roadmap items");
      return;
    }
    if (pending.has(slug)) return;
    setPending((p) => new Set(p).add(slug));
    const hasVoted = myVotes.has(slug);
    // optimistic
    setMyVotes((m) => {
      const n = new Set(m);
      if (hasVoted) n.delete(slug);
      else n.add(slug);
      return n;
    });
    setVoteCounts((c) => ({ ...c, [slug]: (c[slug] ?? 0) + (hasVoted ? -1 : 1) }));

    const { error } = hasVoted
      ? await supabase.from("roadmap_votes").delete().eq("item_slug", slug).eq("user_id", userId)
      : await supabase.from("roadmap_votes").insert({ item_slug: slug, user_id: userId });

    if (error) {
      // revert
      setMyVotes((m) => {
        const n = new Set(m);
        if (hasVoted) n.add(slug);
        else n.delete(slug);
        return n;
      });
      setVoteCounts((c) => ({ ...c, [slug]: (c[slug] ?? 0) + (hasVoted ? 1 : -1) }));
      toast.error(error.message || "Vote failed");
    }
    setPending((p) => {
      const n = new Set(p);
      n.delete(slug);
      return n;
    });
  };

  const filtered = roadmapItems.filter((item) => {
    const statusMatch = activeFilter === "all" || item.status === activeFilter;
    const quarterMatch = activeQuarter === "all" || item.quarter === activeQuarter;
    return statusMatch && quarterMatch;
  });

  const counts = {
    shipped: roadmapItems.filter((i) => i.status === "shipped").length,
    progress: roadmapItems.filter((i) => i.status === "progress").length,
    planned: roadmapItems.filter((i) => i.status === "planned").length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 text-center mb-16">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/20 shadow-[var(--shadow-glow)]">
            <Map className="h-6 w-6 text-primary-glow" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight mb-4">
            Product Roadmap
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See where we're headed. Track what's shipping now, what's in development, and what's
            planned for the future of AI 3D generation.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/changelog"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--gradient-primary)] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.6)] hover:opacity-95 transition"
            >
              <Flame className="h-4 w-4" />
              See What's New
            </Link>
            <a
              href="mailto:kinlochdavid8@gmail.com?subject=Feature Request"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
            >
              <Rocket className="h-4 w-4" />
              Suggest a Feature
            </a>
          </div>
        </section>

        {/* Vision Pillars */}
        <section className="mx-auto max-w-6xl px-4 mb-16">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-primary-glow uppercase tracking-wider">
              The North Star
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              Four pillars driving everything we build
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VISION_PILLARS.map(({ icon: Icon, title, desc, accent }, i) => (
              <div
                key={title}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-6 hover-lift transition`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="absolute inset-0 bg-card/60 backdrop-blur-xl -z-10" />
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--gradient-primary)] shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.6)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto max-w-4xl px-4 mb-12">
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              count={counts.shipped}
              label="Shipped"
              icon={CheckCircle2}
              color="text-emerald-400"
              bg="bg-emerald-500/10"
            />
            <StatCard
              count={counts.progress}
              label="In Progress"
              icon={Wrench}
              color="text-amber-400"
              bg="bg-amber-500/10"
            />
            <StatCard
              count={counts.planned}
              label="Planned"
              icon={Hourglass}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
          </div>
        </section>

        {/* Filters */}
        <section className="mx-auto max-w-6xl px-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground mr-1">Filter by status:</span>
            {(["all", "shipped", "progress", "planned"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition border ${
                  activeFilter === f
                    ? "bg-primary/20 text-primary-glow border-primary/40"
                    : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                }`}
              >
                {f === "all"
                  ? "All"
                  : f === "shipped"
                    ? "Shipped"
                    : f === "progress"
                      ? "In Progress"
                      : "Planned"}
              </button>
            ))}

            <div className="hidden sm:block w-px h-6 bg-white/10 mx-2" />
            <span className="text-sm text-muted-foreground mr-1">Quarter:</span>
            {(["all", ...quarters] as const).map((q) => (
              <button
                key={q}
                onClick={() => setActiveQuarter(q)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition border ${
                  activeQuarter === q
                    ? "bg-primary/20 text-primary-glow border-primary/40"
                    : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                }`}
              >
                {q === "all" ? "All" : q}
              </button>
            ))}
          </div>
        </section>

        {/* Roadmap Grid */}
        <section className="mx-auto max-w-6xl px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, idx) => {
              const slug = slugify(item.title);
              const total = (baseVotes[slug] ?? 0) + (voteCounts[slug] ?? 0);
              return (
                <RoadmapCard
                  key={item.title}
                  item={item}
                  index={idx}
                  votes={total}
                  hasVoted={myVotes.has(slug)}
                  pending={pending.has(slug)}
                  signedIn={!!userId}
                  onVote={() => toggleVote(slug)}
                />
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Map className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No items match your filters.</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({
  count,
  label,
  icon: Icon,
  color,
  bg,
}: {
  count: number;
  label: string;
  icon: typeof CheckCircle2;
  color: string;
  bg: string;
}) {
  return (
    <div className="glass rounded-2xl p-6 text-center hover-lift border-white/10">
      <div className={`mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl ${bg} ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-3xl font-bold font-display">{count}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function RoadmapCard({
  item,
  index,
  votes,
  hasVoted,
  pending,
  signedIn,
  onVote,
}: {
  item: RoadmapItem;
  index: number;
  votes: number;
  hasVoted: boolean;
  pending: boolean;
  signedIn: boolean;
  onVote: () => void;
}) {
  const status = STATUS_CONFIG[item.status];
  const Icon = item.icon;
  const CatIcon = CATEGORY_ICONS[item.category] || Layers;
  const catColor = CATEGORY_COLORS[item.category] || "text-muted-foreground";

  return (
    <div
      className="glass rounded-2xl p-6 border-white/10 hover:border-white/20 hover-lift transition group scroll-reveal flex flex-col"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className={`grid h-10 w-10 place-items-center rounded-xl bg-white/5 ${catColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status.badge}`}
        >
          <status.icon className="h-3 w-3" />
          {status.label}
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {item.quarter}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CatIcon className="h-3 w-3" />
          {item.category}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold font-display text-foreground mb-2 group-hover:text-primary-glow transition">
        {item.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{item.description}</p>

      {/* Vote */}
      <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
        <button
          type="button"
          onClick={onVote}
          disabled={pending}
          aria-pressed={hasVoted}
          title={signedIn ? (hasVoted ? "Remove your vote" : "Vote for this") : "Sign in to vote"}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            hasVoted
              ? "bg-primary/20 text-primary-glow border-primary/40 shadow-[0_0_20px_-8px_oklch(0.7_0.22_305_/_0.8)]"
              : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-foreground"
          } ${pending ? "opacity-60 cursor-wait" : ""}`}
        >
          <ChevronUp className={`h-3.5 w-3.5 ${hasVoted ? "fill-current" : ""}`} />
          {hasVoted ? "Voted" : "Vote"}
        </button>
        <span className="text-xs text-muted-foreground/80 tabular-nums">
          {votes.toLocaleString()} {votes === 1 ? "vote" : "votes"}
        </span>
      </div>
    </div>
  );
}
