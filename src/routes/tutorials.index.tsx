import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Box, Image as ImageIcon, Sparkles, Wand2 } from "lucide-react";

const GUIDES = [
  {
    slug: "second-life-mesh",
    title: "How to Make Mesh for Second Life (Full Guide)",
    blurb:
      "Build, rig, texture and upload mesh to Second Life — from AI-generated GLB to a finished in-world item.",
    icon: Box,
    tag: "Second Life",
    minutes: 8,
  },
  {
    slug: "ai-3d-models",
    title: "How to Generate 3D Models with AI (Beginner's Guide)",
    blurb:
      "Turn a text prompt or a single image into a game-ready 3D model in minutes. No modeling skills required.",
    icon: Sparkles,
    tag: "AI 3D",
    minutes: 6,
  },
  {
    slug: "pbr-textures",
    title: "How to Make PBR Textures with AI (Albedo, Normal, Roughness)",
    blurb:
      "Generate seamless PBR texture sets and plug them into Blender, Unity, Unreal or Second Life materials.",
    icon: ImageIcon,
    tag: "Textures",
    minutes: 5,
  },
  {
    slug: "retexture-models",
    title: "How to Retexture a 3D Model with AI",
    blurb:
      "Swap or restyle the textures on any 3D model with a text prompt. Keep the geometry, change the look.",
    icon: Wand2,
    tag: "AI 3D",
    minutes: 4,
  },
];

export const Route = createFileRoute("/tutorials/")({
  head: () => ({
    meta: [
      { title: "AI 3D & Second Life Tutorials — KingDavez Studios" },
      {
        name: "description",
        content:
          "Free tutorials: how to generate 3D models with AI, how to make and upload mesh for Second Life, how to create PBR textures, and how to retexture 3D models.",
      },
      { property: "og:title", content: "AI 3D & Second Life Tutorials — KingDavez Studios" },
      {
        property: "og:description",
        content: "Free guides on AI 3D, Second Life mesh, PBR textures and retexturing.",
      },
      { property: "og:url", content: "https://kingdavez.click/tutorials" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Tutorials — KingDavez Studios" },
    { name: "twitter:description", content: "Step-by-step tutorials for AI 3D model generation, Second Life mesh, and game asset workflows." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/tutorials" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: GUIDES.map((g, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `https://kingdavez.click/tutorials/${g.slug}`,
            name: g.title,
          })),
        }),
      },
    ],
  }),
  component: TutorialsIndex,
});

function TutorialsIndex() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-20">
      <header className="mb-12 text-center">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
          Tutorials
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
          Free, no-fluff guides for AI 3D generation, Second Life mesh, PBR textures and engine imports.
          Written for builders who just want results.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {GUIDES.map((g) => {
          const Icon = g.icon;
          return (
            <Link
              key={g.slug}
              to="/tutorials/$slug"
              params={{ slug: g.slug }}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-primary/50 hover:bg-white/[0.07]"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/30">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {g.tag} • {g.minutes} min read
                </span>
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold group-hover:text-primary transition">
                {g.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{g.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary">
                Read guide <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
