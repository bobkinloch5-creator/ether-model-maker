import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Sparkles, Calendar, Tag, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — KingDavez Studios Updates & Releases" },
      { name: "description", content: "Latest KingDavez Studios releases: FBX exports, developer API, procedural previews, STL print export, and more." },
      { property: "og:title", content: "Changelog — KingDavez Studios" },
      { property: "og:description", content: "What's new in KingDavez Studios — AI 3D generation updates and feature releases." },
      { property: "og:url", content: "https://kingdavez.click/changelog" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/changelog" }],
  }),
  component: ChangelogPage,
});

function ChangelogPage() {
  const changelogs = [
    {
      version: "v1.6.0",
      date: "May 23, 2026",
      title: "Community, Integrations & AI Assistant",
      description: "A massive feature drop: share your creations in the new Community Hub, generate directly inside Roblox Studio and Blender, get help from an AI assistant, and polish models with Retexture.",
      changes: [
        { type: "Feature", text: "Launched Community Hub — publish generations, like, comment, and share your 3D work with other creators." },
        { type: "Feature", text: "Added Retexture — regenerate a model's textures and materials for 1 credit when the result isn't quite right." },
        { type: "Feature", text: "Built an AI Assistant Chatbot with onboarding tour to help new users navigate the platform." },
        { type: "Feature", text: "Roblox Studio integration — downloadable Lua plugin lets you generate 3D models directly inside Roblox Studio." },
        { type: "Feature", text: "Blender integration — downloadable Python addon generates and imports 3D models straight into Blender." },
        { type: "Feature", text: "Added DAE (Collada) exporter for universal animation and game-engine compatibility." },
        { type: "Feature", text: "New comprehensive Docs page (/docs) covering generation, exports, API, billing, and integrations." },
        { type: "Feature", text: "Idle auto-logout keeps accounts secure after extended inactivity." },
        { type: "Feature", text: "Automated test suite for ShareButtons and community URL generation ensures reliable sharing." },
        { type: "Improvement", text: "AI Chat Bot now renders clickable links to app pages so you can navigate directly from chat." },
        { type: "Improvement", text: "Full-site SEO overhaul — Open Graph tags, canonical URLs, and enriched meta descriptions on every route." },
        { type: "Design", text: "Added Integrations tab to the main navigation for quick access to Roblox and Blender plugins." },
      ]
    },
    {
      version: "v1.5.0",
      date: "May 23, 2026",
      title: "Referral System, Roadmap & Mobile Polish",
      description: "Major platform improvements including a fully-featured referral engine, public roadmap, site-wide animations, and deep mobile responsiveness.",
      changes: [
        { type: "Feature", text: "Launched a referral system — earn +50 credits for every friend who joins using your unique code." },
        { type: "Feature", text: "Added public Product Roadmap page showing shipped, in-progress, and planned features by quarter." },
        { type: "Feature", text: "Redesigned profile page as a mini-dashboard with display name, bio, and avatar selection (male, female, neutral)." },
        { type: "Feature", text: "Full site scroll-triggered animations, staggered entrances, hover micro-interactions, and ambient particle effects." },
        { type: "Improvement", text: "Complete mobile responsiveness: hamburger navigation, responsive generator toolbar, and touch-friendly layouts." },
        { type: "Design", text: "Added 'What's New' and Roadmap links in the main navigation and footer for easy discovery." },
      ]
    },
    {
      version: "v1.4.0",
      date: "May 22, 2026",
      title: "Autodesk FBX Exports & Developer API Access",
      description: "A major update for power users and builders, introducing flexible export pipelines and API controls directly on your profile.",
      changes: [
        { type: "Feature", text: "Added high-performance custom Autodesk FBX (.fbx) export format across all model views." },
        { type: "Feature", text: "Implemented live Developer API Access key manager with show, hide, copy, and secure regeneration options." },
        { type: "Design", text: "Integrated premium toast notifications (Sonner) replacing old system alert boxes." },
        { type: "Improvement", text: "Streamlined Vercel production deployment and auto-alias configuration to bloxsmith.pro." }
      ]
    },
    {
      version: "v1.3.0",
      date: "May 21, 2026",
      title: "Procedural Previews & Prompt Builders",
      description: "Visual enhancements to ensure you get exactly the 3D models you specify, paired with advanced prompt optimization utilities.",
      changes: [
        { type: "Feature", text: "Interactive 3D model previews now build custom procedural meshes matching the prompt (swords, helmets, shields, trees, etc.) rather than generic red bricks." },
        { type: "Feature", text: "Added AI Prompt Generator and Prompt Builder utilities inside the generation panel." },
        { type: "Feature", text: "Added option to delete custom generations from your dashboard to keep your workspace tidy." },
        { type: "Improvement", text: "Removed complex Linden payments from the Second Life Bot upload, keeping only the simplified credits option." }
      ]
    },
    {
      version: "v1.2.0",
      date: "May 15, 2026",
      title: "Top-Up Purchases & STL Print Export",
      description: "Providing users the capability to purchase custom credit packs and export meshes optimized for 3D printing.",
      changes: [
        { type: "Feature", text: "Integrated full PayPal credit purchasing sandbox in the dashboard modal." },
        { type: "Feature", text: "Added STL (.stl) file export support for model slicing and 3D printing." },
        { type: "Improvement", text: "Optimized database query speeds for retrieving projects and generations." }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-24">
        <div className="mb-16 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/20 shadow-[var(--shadow-glow)]">
            <Sparkles className="h-6 w-6 text-primary-glow" />
          </div>
          <h1 className="text-4xl font-bold font-display tracking-tight text-foreground sm:text-5xl">Changelog</h1>
          <p className="mt-4 text-lg text-muted-foreground">Keep track of the latest updates, features, and refinements to Magic Mesh Creator.</p>
        </div>

        <div className="relative border-l border-white/10 pl-6 ml-4 space-y-12">
          {changelogs.map((log, i) => (
            <div key={i} className="relative group">
              {/* Timeline dot */}
              <div className="absolute -left-[31px] top-1 grid h-4 w-4 place-items-center rounded-full border border-primary bg-background shadow-[0_0_8px_rgba(245,158,11,0.4)] transition-all group-hover:scale-125" />

              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-xs font-bold font-mono text-primary-glow bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {log.version}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {log.date}
                </span>
              </div>

              <div className="glass rounded-2xl p-6 backdrop-blur-sm transition border-white/10 hover:border-white/20">
                <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary-glow transition">{log.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{log.description}</p>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5 mb-2">
                    <Tag className="h-3 w-3" /> Changes in this release
                  </h4>
                  <ul className="space-y-2.5">
                    {log.changes.map((change, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2.5 text-sm text-foreground/90">
                        <ArrowRight className="h-3.5 w-3.5 text-primary-glow shrink-0 mt-0.5" />
                        <div>
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mr-2 ${
                            change.type === "Feature" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            change.type === "Design" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                            "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>
                            {change.type}
                          </span>
                          <span className="leading-relaxed">{change.text}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
