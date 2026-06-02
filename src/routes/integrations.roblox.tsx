import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Copy, Download, ArrowLeft, Gamepad2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/integrations/roblox")({
  head: () => ({
    meta: [
      { title: "Roblox Studio — AI Text-to-3D Plugin | KingDavez" },
      {
        name: "description",
        content:
          "Install the KingDavez Studios Roblox Studio plugin and generate AI 3D models from a prompt without leaving Studio. One-file Luau script, free.",
      },
      { property: "og:title", content: "Roblox Studio plugin — AI text-to-3D" },
      {
        property: "og:description",
        content:
          "Generate 3D models from a text prompt directly inside Roblox Studio using the KingDavez Studios API.",
      },
      { property: "og:url", content: "https://kingdavez.click/integrations/roblox" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Roblox — Import AI 3D Models (GLB/FBX)" },
    { name: "twitter:description", content: "Import AI-generated GLB and FBX models into Roblox Studio with material conversion." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/integrations/roblox" }],
  }),
  component: RobloxPage,
});

const SCRIPT_URL = "/roblox/KingDavezStudios.lua";

const SNIPPET = `-- Quick one-off call from any Server Script
local HttpService = game:GetService("HttpService")

local function generate(prompt, apiKey)
    local res = HttpService:RequestAsync({
        Url = "https://kingdavez.click/api/public/v1/generations",
        Method = "POST",
        Headers = {
            ["Content-Type"]  = "application/json",
            ["Authorization"] = "Bearer " .. apiKey,
        },
        Body = HttpService:JSONEncode({
            prompt = prompt,
            type   = "text-to-3d",
            source = "roblox",
        }),
    })
    return HttpService:JSONDecode(res.Body)
end

print(generate("low-poly stylized fox", "kd_live_xxx"))`;

function RobloxPage() {
  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 mb-4">
          <Gamepad2 className="h-6 w-6 text-rose-300" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
          Generate AI 3D inside Roblox Studio
        </h1>
        <p className="mt-3 text-muted-foreground">
          A single-file Luau plugin that adds a dock widget to Roblox Studio.
          Type a prompt → get a 3D asset spawned in your Workspace, with the
          model URL ready for Asset Manager import.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={SCRIPT_URL}
            download="KingDavezStudios.lua"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--gradient-primary)] px-5 text-sm font-medium text-white glow"
          >
            <Download className="h-4 w-4" /> Download plugin (.lua)
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
            <li>Download <code className="text-foreground">KingDavezStudios.lua</code> above.</li>
            <li>In Roblox Studio: <code className="text-foreground">View → Plugins Folder</code>. Drop the file in.</li>
            <li>Restart Studio. Open the <strong>Plugins</strong> tab — click <strong>AI 3D Generator</strong>.</li>
            <li>Paste your API key from <Link to="/profile" className="underline">your profile</Link>, type a prompt, hit <strong>Generate</strong>.</li>
            <li>A MeshPart spawns in Workspace with the model URL stored as an Attribute.</li>
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Importing the mesh</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Roblox Studio doesn't support importing <code>.glb</code> at runtime via script —
            that's an engine limitation. The plugin therefore:
          </p>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>spawns a placeholder MeshPart so the asset is selectable in Workspace,</li>
            <li>saves the <code>model_url</code>, <code>image_url</code>, and prompt as Attributes,</li>
            <li>copies the <code>.glb</code> URL to your clipboard so you can paste it in your browser, drop the file into Blender (or any DCC) to convert to <code>.fbx</code>, and bulk-import via Asset Manager.</li>
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
            Works in any Roblox server script with HTTP Requests enabled
            (<code>Game Settings → Security → Allow HTTP Requests</code>).
          </p>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-lg font-semibold">Endpoint reference</h3>
          <dl className="mt-3 grid grid-cols-[120px_1fr] gap-y-2 text-xs">
            <dt className="text-muted-foreground">POST</dt><dd className="font-mono">/api/public/v1/generations</dd>
            <dt className="text-muted-foreground">Auth</dt><dd className="font-mono">Authorization: Bearer kd_live_…</dd>
            <dt className="text-muted-foreground">Body</dt><dd className="font-mono">{`{ prompt, type, source? }`}</dd>
            <dt className="text-muted-foreground">Poll</dt><dd className="font-mono">GET /api/public/v1/generations?limit=1</dd>
          </dl>
        </section>
      </main>
      <Footer />
    </div>
  );
}
