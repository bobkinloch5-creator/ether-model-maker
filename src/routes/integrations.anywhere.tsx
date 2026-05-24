import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ArrowLeft, Package } from "lucide-react";

export const Route = createFileRoute("/integrations/anywhere")({
  head: () => ({
    meta: [
      { title: "Use AI 3D Models Anywhere — Maya, 3ds Max, Houdini, Sketchfab | KingDavez Studios" },
      { name: "description", content: "Every KingDavez Studios generation exports as standard GLB / OBJ / FBX / DAE — open it in any DCC, engine, or marketplace." },
      { property: "og:title", content: "AI 3D for any DCC or engine" },
      { property: "og:description", content: "GLB · OBJ · FBX · DAE — no vendor lock-in." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/integrations/anywhere" }],
  }),
  component: AnywherePage,
});

const APPS = [
  { name: "Maya", format: "FBX / OBJ", notes: "File → Import. FBX preserves materials and normals." },
  { name: "3ds Max", format: "FBX", notes: "File → Import. Enable 'Import Materials' in the FBX options." },
  { name: "Cinema 4D", format: "FBX / GLB", notes: "File → Merge. R23+ has native GLB support." },
  { name: "Houdini", format: "FBX / OBJ", notes: "File SOP, or use the GLTF ROP for round-trip workflows." },
  { name: "ZBrush", format: "OBJ", notes: "Tool → Import. Use for sculpt-over of low-res AI base meshes." },
  { name: "Sketchfab", format: "GLB", notes: "Upload directly — Sketchfab recommends GLB with embedded textures." },
  { name: "Substance Painter", format: "FBX", notes: "New project → Select FBX. UVs and material slots come through clean." },
  { name: "Marmoset Toolbag", format: "FBX / GLB", notes: "Drag onto the viewport — PBR maps auto-assign." },
];

function AnywherePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-400/30 mb-4">
          <Package className="h-6 w-6 text-cyan-300" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">Use AI 3D models anywhere</h1>
        <p className="mt-3 text-muted-foreground">
          We don't lock you in. Every generation exports as the industry-standard formats
          — <strong>GLB</strong>, <strong>OBJ</strong>, <strong>FBX</strong>, <strong>DAE</strong> —
          so the same model opens in any DCC, engine, or marketplace.
        </p>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Quick-start for popular apps</h2>
          <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
            {APPS.map((a) => (
              <div key={a.name} className="grid grid-cols-[140px_120px_1fr] gap-3 px-5 py-4 text-sm">
                <div className="font-medium">{a.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{a.format}</div>
                <div className="text-muted-foreground">{a.notes}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-lg font-semibold">Format cheat-sheet</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li><strong>GLB</strong> — best for web, Godot, model-viewer, Sketchfab. Embedded textures.</li>
            <li><strong>FBX</strong> — best for Unity, Unreal, Maya, 3ds Max. Full PBR map set.</li>
            <li><strong>OBJ</strong> — universal, geometry-only. Pair with the texture pack for materials.</li>
            <li><strong>DAE / COLLADA</strong> — Second Life, older pipelines.</li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Don't see your tool?</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            If it reads GLB, FBX, OBJ, or DAE — it works. For automation, hit our
            <Link to="/docs" className="underline"> REST API</Link> from any language.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
