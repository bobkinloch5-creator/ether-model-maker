import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ArrowLeft, Layers3 } from "lucide-react";

export const Route = createFileRoute("/integrations/unreal")({
  head: () => ({
    meta: [
      { title: "Unreal — Import AI 3D Models with PBR | KingDavez" },
      { name: "description", content: "Import KingDavez Studios FBX/GLB exports into Unreal Engine with PBR materials, Nanite-friendly LODs, and Lumen-ready normals." },
      { property: "og:title", content: "Unreal Engine — AI text-to-3D guide" },
      { property: "og:description", content: "FBX with PBR maps for instant use in your level." },
      { property: "og:url", content: "https://kingdavez.click/integrations/unreal" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Unreal Engine — Import AI 3D Models (GLB/FBX)" },
    { name: "twitter:description", content: "Use AI-generated GLB and FBX models in Unreal Engine 5 with nanite and lumen support." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/integrations/unreal" }],
  }),
  component: UnrealPage,
});

function UnrealPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-400/30 mb-4">
          <Layers3 className="h-6 w-6 text-sky-300" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">Use AI 3D models in Unreal Engine</h1>
        <p className="mt-3 text-muted-foreground">
          KingDavez Studios exports FBX with the full PBR set (base color, normal, roughness, metallic, AO),
          ready for Lumen and Nanite in UE5.
        </p>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Import (under 1 minute)</h2>
          <ol className="mt-4 space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
            <li>Download the <strong>FBX</strong> from <Link to="/dashboard" className="underline">your dashboard</Link>.</li>
            <li>In the Unreal Content Browser, drag the FBX into a content folder.</li>
            <li>In the FBX import dialog: <strong>Import Materials</strong> ✅, <strong>Import Textures</strong> ✅, <strong>Build Nanite</strong> ✅ (UE5).</li>
            <li>Drop the imported Static Mesh into your level. Materials auto-bind to the imported textures.</li>
          </ol>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-lg font-semibold">Tips</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li><strong>Nanite:</strong> KingDavez meshes are high-density — Nanite handles them efficiently without manual LODs.</li>
            <li><strong>Collision:</strong> Use <em>Auto Convex</em> in the Static Mesh editor for organic shapes, or a simple box for props.</li>
            <li><strong>Scale:</strong> Unreal uses centimeters. Set Import Uniform Scale to <code>100</code> if your scene looks tiny.</li>
            <li><strong>Lumen:</strong> Normal + roughness import unchanged — no extra setup needed.</li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Runtime loading</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            For in-game generation use the <Link to="/docs" className="underline">REST API</Link> from a C++ HTTP module or
            third-party plugin (e.g. <em>glTFRuntime</em>) to download and spawn GLBs at runtime.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
