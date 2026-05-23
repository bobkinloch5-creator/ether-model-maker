import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ArrowLeft, Globe, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/integrations/web")({
  head: () => ({
    meta: [
      { title: "Three.js & Web — Stream AI 3D Models in the Browser | KingDavez Studios" },
      { name: "description", content: "Use KingDavez Studios GLB models with <model-viewer>, react-three-fiber, Three.js, or Babylon.js — straight in the browser." },
      { property: "og:title", content: "Three.js / web — AI text-to-3D guide" },
      { property: "og:description", content: "GLB stream into model-viewer, R3F, Babylon.js." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/integrations/web" }],
  }),
  component: WebPage,
});

const MV = `<!-- model-viewer (easiest) -->
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
<model-viewer
  src="https://kingdavez.click/path/to/model.glb"
  camera-controls auto-rotate
  style="width:100%;height:480px"></model-viewer>`;

const R3F = `// react-three-fiber + drei
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

function Model() {
  const { scene } = useGLTF("https://kingdavez.click/path/to/model.glb");
  return <primitive object={scene} />;
}

export default () => (
  <Canvas camera={{ position: [0, 1, 3] }}>
    <ambientLight intensity={0.6} />
    <directionalLight position={[5, 5, 5]} />
    <Model />
    <OrbitControls />
  </Canvas>
);`;

function WebPage() {
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied"); };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-400/30 mb-4">
          <Globe className="h-6 w-6 text-violet-300" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">AI 3D models in Three.js &amp; the web</h1>
        <p className="mt-3 text-muted-foreground">
          GLB is the web's native 3D format. KingDavez Studios models load directly into
          <code> &lt;model-viewer&gt;</code>, react-three-fiber, raw Three.js, and Babylon.js — no conversion.
        </p>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">&lt;model-viewer&gt; (1 line)</h2>
            <button onClick={() => copy(MV)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10"><Copy className="h-3.5 w-3.5" /> Copy</button>
          </div>
          <pre className="mt-3 rounded-xl border border-white/10 bg-black/60 p-4 text-xs leading-relaxed overflow-x-auto font-mono text-emerald-200">{MV}</pre>
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">react-three-fiber</h2>
            <button onClick={() => copy(R3F)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10"><Copy className="h-3.5 w-3.5" /> Copy</button>
          </div>
          <pre className="mt-3 rounded-xl border border-white/10 bg-black/60 p-4 text-xs leading-relaxed overflow-x-auto font-mono text-emerald-200">{R3F}</pre>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-lg font-semibold">Compatible loaders</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li><strong>Three.js</strong> — <code>GLTFLoader</code> from <code>three/examples/jsm/loaders/GLTFLoader</code></li>
            <li><strong>Babylon.js</strong> — <code>SceneLoader.Append</code> with the GLTF plugin (default)</li>
            <li><strong>PlayCanvas</strong> — drop GLB into Assets, instantiate at runtime</li>
            <li><strong>A-Frame</strong> — <code>&lt;a-entity gltf-model="url(./model.glb)"&gt;</code></li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
