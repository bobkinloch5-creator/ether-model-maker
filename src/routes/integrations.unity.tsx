import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ArrowLeft, Cuboid, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/integrations/unity")({
  head: () => ({
    meta: [
      { title: "Unity — Import AI 3D Models (GLB/FBX) | KingDavez" },
      { name: "description", content: "Drop GLB or FBX exports from KingDavez Studios straight into your Unity Assets folder. Materials, normals, and AO maps wire up automatically." },
      { property: "og:title", content: "Unity — AI text-to-3D import guide" },
      { property: "og:description", content: "Use AI-generated GLB / FBX models in Unity in seconds." },
      { property: "og:url", content: "https://kingdavez.click/integrations/unity" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/integrations/unity" }],
  }),
  component: UnityPage,
});

const SNIPPET = `// C# — runtime GLB import via UnityGLTF or glTFast
// 1) Install glTFast from Package Manager: com.unity.cloud.gltfast
using GLTFast;

var gltf = new GltfImport();
bool ok = await gltf.Load("https://kingdavez.click/path/to/model.glb");
if (ok) gltf.InstantiateMainSceneAsync(transform);`;

function UnityPage() {
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied"); };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-400/15 border border-slate-300/30 mb-4">
          <Cuboid className="h-6 w-6 text-slate-200" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">Use AI 3D models in Unity</h1>
        <p className="mt-3 text-muted-foreground">
          Every KingDavez Studios generation exports as standard <code>.glb</code> or <code>.fbx</code> — formats
          Unity imports natively. No plugin required for design-time use.
        </p>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Design-time (drag &amp; drop)</h2>
          <ol className="mt-4 space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
            <li>Open a generation in <Link to="/dashboard" className="underline">your dashboard</Link> and download the <strong>FBX</strong> (recommended for Unity) or GLB.</li>
            <li>Drag the file into your project's <code className="text-foreground">Assets/</code> folder.</li>
            <li>Unity auto-imports the mesh, materials, normals, and AO maps. Drag the prefab into your scene.</li>
            <li>For PBR: select the material, switch shader to <strong>URP/Lit</strong> or <strong>HDRP/Lit</strong> and the maps stay wired.</li>
          </ol>
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Runtime GLB loading</h2>
            <button onClick={() => copy(SNIPPET)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
          <pre className="mt-3 rounded-xl border border-white/10 bg-black/60 p-4 text-xs leading-relaxed overflow-x-auto font-mono text-emerald-200">{SNIPPET}</pre>
          <p className="mt-2 text-xs text-muted-foreground">Combine with the <Link to="/docs" className="underline">REST API</Link> to generate models on-demand from your game.</p>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-lg font-semibold">Recommended settings</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li><strong>Model:</strong> Scale Factor 1, Mesh Compression Off, Read/Write Enabled if you modify at runtime.</li>
            <li><strong>Materials:</strong> Location → Use External Materials (Legacy) to edit them as assets.</li>
            <li><strong>Animation:</strong> None (static meshes).</li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
