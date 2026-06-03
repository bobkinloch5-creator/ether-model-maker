import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Copy, Download, ArrowLeft, Hammer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/integrations/blender")({
  head: () => ({
    meta: [
      { title: "Blender Add-on — AI Text-to-3D | KingDavez" },
      {
        name: "description",
        content:
          "Install the KingDavez Studios Blender add-on. Generate AI 3D models from a prompt and import them straight into your scene as GLB.",
      },
      { property: "og:title", content: "Blender add-on — AI text-to-3D" },
      {
        property: "og:description",
        content:
          "One-file Python add-on. Type a prompt in Blender, get a fully-imported 3D model in your scene.",
      },
      { property: "og:url", content: "https://kingdavez.click/integrations/blender" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Blender — Import AI 3D Models (GLB/FBX)" },
      {
        name: "twitter:description",
        content:
          "Import AI-generated GLB and FBX models into Blender with full PBR material support.",
      },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/integrations/blender" }],
  }),
  component: BlenderPage,
});

const SCRIPT_URL = "/blender/kingdavez_studios_addon.py";

const SNIPPET = `# Quick one-off call from Blender's Scripting tab
import bpy, json, tempfile, urllib.request, time

API = "https://kingdavez.click/api/public/v1"
KEY = "kd_live_xxx"  # from https://kingdavez.click/profile

def post(path, body):
    req = urllib.request.Request(API + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "Authorization": "Bearer " + KEY})
    return json.loads(urllib.request.urlopen(req).read())

def get(path):
    req = urllib.request.Request(API + path,
        headers={"Authorization": "Bearer " + KEY})
    return json.loads(urllib.request.urlopen(req).read())

created = post("/generations",
    {"prompt": "low-poly stylized fox",
     "type": "text-to-3d", "source": "blender"})

# Poll until done
while True:
    items = get("/generations?limit=1")
    items = items if isinstance(items, list) else items.get("data", [])
    g = items[0]
    if (g.get("status") or "").lower() in ("complete","completed","done","success"):
        url = g["model_url"]; break
    time.sleep(5)

tmp = tempfile.mktemp(suffix=".glb")
urllib.request.urlretrieve(url, tmp)
bpy.ops.import_scene.gltf(filepath=tmp)`;

function BlenderPage() {
  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copied to clipboard");
  };

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

        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 border border-orange-500/30 mb-4">
          <Hammer className="h-6 w-6 text-orange-300" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
          Generate AI 3D inside Blender
        </h1>
        <p className="mt-3 text-muted-foreground">
          A single-file Python add-on that puts a panel in Blender's 3D viewport. Type a prompt →
          the generated GLB is downloaded and imported straight into your scene, ready to sculpt,
          retopo, or bake.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={SCRIPT_URL}
            download="kingdavez_studios_addon.py"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--gradient-primary)] px-5 text-sm font-medium text-white glow"
          >
            <Download className="h-4 w-4" /> Download add-on (.py)
          </a>
          <Link
            to="/profile"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm hover:bg-white/10"
          >
            Get your API key
          </Link>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Install (60 seconds)</h2>
          <ol className="mt-4 space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
            <li>
              Download <code className="text-foreground">kingdavez_studios_addon.py</code> above.
            </li>
            <li>
              In Blender:{" "}
              <code className="text-foreground">Edit → Preferences → Add-ons → Install…</code> and
              pick the file.
            </li>
            <li>
              Enable <strong>KingDavez Studios — AI 3D Generator</strong>, expand it, and paste your
              API key from{" "}
              <Link to="/profile" className="underline">
                your profile
              </Link>
              .
            </li>
            <li>
              In the 3D viewport press <code>N</code> to open the sidebar →{" "}
              <strong>KingDavez</strong> tab.
            </li>
            <li>
              Type a prompt, hit <strong>Generate 3D Model</strong>. The GLB imports automatically
              when ready.
            </li>
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">What you get</h2>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>
              Native <code>.glb</code> import — materials, normals, and PBR maps wired up.
            </li>
            <li>
              Non-blocking generation: Blender stays responsive while the model is queued,
              generated, and downloaded.
            </li>
            <li>Works with the same credits as the web app — no separate billing.</li>
          </ul>
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Or call the API directly</h2>
            <button
              onClick={() => copy(SNIPPET)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
          <pre className="mt-3 rounded-xl border border-white/10 bg-black/60 p-4 text-xs leading-relaxed overflow-x-auto font-mono text-emerald-200">
            {SNIPPET}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Paste into Blender's <strong>Scripting</strong> tab to test without installing the
            add-on.
          </p>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-lg font-semibold">Endpoint reference</h3>
          <dl className="mt-3 grid grid-cols-[120px_1fr] gap-y-2 text-xs">
            <dt className="text-muted-foreground">POST</dt>
            <dd className="font-mono">/api/public/v1/generations</dd>
            <dt className="text-muted-foreground">Auth</dt>
            <dd className="font-mono">Authorization: Bearer kd_live_…</dd>
            <dt className="text-muted-foreground">Body</dt>
            <dd className="font-mono">{`{ prompt, type, source? }`}</dd>
            <dt className="text-muted-foreground">Poll</dt>
            <dd className="font-mono">GET /api/public/v1/generations?limit=1</dd>
          </dl>
        </section>
      </main>
      <Footer />
    </div>
  );
}
