import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/integrations/godot")({
  head: () => ({
    meta: [
      { title: "Godot — Import AI 3D Models (GLB) | KingDavez" },
      {
        name: "description",
        content:
          "Native GLB import for Godot 4. Drop AI-generated models into your project — zero conversion needed.",
      },
      { property: "og:title", content: "Godot — AI text-to-3D guide" },
      { property: "og:description", content: "Native GLB for indie & open-source pipelines." },
      { property: "og:url", content: "https://kingdavez.click/integrations/godot" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Godot — Import AI 3D Models (GLB/FBX)" },
      {
        name: "twitter:description",
        content: "Use AI-generated GLB and FBX models in Godot 4 with automatic material import.",
      },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/integrations/godot" }],
  }),
  component: GodotPage,
});

function GodotPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/30 mb-4">
          <Sparkles className="h-6 w-6 text-emerald-300" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
          Use AI 3D models in Godot
        </h1>
        <p className="mt-3 text-muted-foreground">
          Godot 4 has first-class GLB / glTF 2.0 support. Drop a KingDavez Studios <code>.glb</code>{" "}
          into your project — Godot reads materials, normals, and PBR maps out of the box.
        </p>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Import</h2>
          <ol className="mt-4 space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
            <li>
              Download the <strong>GLB</strong> from{" "}
              <Link to="/dashboard" className="underline">
                your dashboard
              </Link>
              .
            </li>
            <li>
              Drop the file into your project's <code className="text-foreground">res://</code>{" "}
              filesystem.
            </li>
            <li>Godot creates a Scene resource automatically. Instance it into your level.</li>
            <li>
              Optional: open the import dock and toggle <strong>Generate → LODs</strong>.
            </li>
          </ol>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-lg font-semibold">Runtime loading (GDScript)</h3>
          <pre className="mt-3 rounded-xl border border-white/10 bg-black/60 p-4 text-xs leading-relaxed overflow-x-auto font-mono text-emerald-200">{`var gltf := GLTFDocument.new()
var state := GLTFState.new()
var err := gltf.append_from_file("user://model.glb", state)
if err == OK:
    var scene := gltf.generate_scene(state)
    add_child(scene)`}</pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Pair with the{" "}
            <Link to="/docs" className="underline">
              REST API
            </Link>{" "}
            to download fresh models at runtime.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
