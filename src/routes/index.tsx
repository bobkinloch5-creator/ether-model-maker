import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { Marquee } from "@/components/site/Marquee";
import { Features } from "@/components/site/Features";

import { Workflow } from "@/components/site/Workflow";
import { Integrations } from "@/components/site/Integrations";
import { SecondLife } from "@/components/site/SecondLife";

import { CTA } from "@/components/site/CTA";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KingDavez Studios — AI 3D Model & Texture Generator for Blender, Unity, Roblox & More (Beta)" },
      {
        name: "description",
        content:
          "AI text-to-3D, image-to-3D, and PBR texture generation. Export GLB / OBJ / FBX / DAE to Blender, Unity, Unreal, Godot, Roblox, Three.js, and Second Life — anywhere you build.",
      },
      { property: "og:title", content: "KingDavez Studios — AI 3D for Blender, Unity, Roblox, Second Life & more" },
      {
        property: "og:description",
        content: "Text-to-3D, image-to-3D, and PBR textures in seconds. Plug straight into Blender, Unity, Unreal, Godot, Roblox, Three.js, Second Life.",
      },
      { property: "og:url", content: "https://kingdavez.click/" },
      { name: "twitter:title", content: "KingDavez Studios — AI 3D for every engine" },
      { name: "twitter:description", content: "Text-to-3D, image-to-3D, and PBR texture generation that exports to Blender, Unity, Unreal, Godot, Roblox & Second Life." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Marquee />
        <Features />


        <Workflow />

        <Integrations />

        <SecondLife />

        <CTA />
      </main>
      <Footer />
    </div>
  );
}
