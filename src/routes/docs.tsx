import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  BookOpen,
  Rocket,
  Sparkles,
  Image as ImageIcon,
  Box,
  Key,
  Code2,
  Coins,
  Users,
  Globe,
  ShieldCheck,
  ArrowRight,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — AI 3D Generation Guides & API Reference | KingDavez Studios (Beta)" },
      {
        name: "description",
        content:
          "Complete documentation for KingDavez Studios: text-to-3D, image-to-3D, PBR textures, REST API, Second Life integration, credits, teams and more.",
      },
      { name: "keywords", content: "AI 3D documentation, text to 3D guide, image to 3D tutorial, PBR texture guide, Second Life API, 3D model API reference, GLB export guide" },
      { property: "og:title", content: "Docs — AI 3D Generation Guides & API Reference | KingDavez Studios" },
      {
        property: "og:description",
        content:
          "Guides, API reference and integrations for the KingDavez AI 3D generation platform.",
      },
      { property: "og:url", content: "https://kingdavez.click/docs" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/docs" }],
  }),
  component: DocsPage,
});

type Section = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  blurb: string;
  body: React.ReactNode;
};

const sections: Section[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    blurb: "Create an account, claim free credits, generate your first asset.",
    body: (
      <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-5 marker:text-primary-glow">
        <li>
          Create a free account on{" "}
          <Link to="/signup" className="text-primary-glow hover:underline">
            /signup
          </Link>
          . New creators get starter credits automatically.
        </li>
        <li>
          Open the{" "}
          <Link to="/generate" className="text-primary-glow hover:underline">
            Generate
          </Link>{" "}
          page, pick <b>Text → 3D</b> or <b>Image → 3D</b>, and describe what you want.
        </li>
        <li>
          When the job finishes, download <b>.GLB</b>, <b>.FBX</b> and the PBR
          texture pack from your{" "}
          <Link to="/dashboard" className="text-primary-glow hover:underline">
            dashboard
          </Link>
          .
        </li>
        <li>
          Need more credits? Top up on the{" "}
          <Link to="/credits" className="text-primary-glow hover:underline">
            credits page
          </Link>{" "}
          — pay via PayPal.
        </li>
      </ol>
    ),
  },
  {
    id: "text-to-image",
    title: "Text → Image",
    icon: Sparkles,
    blurb: "Generate concept art and textures from a single prompt.",
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Write a clear, descriptive prompt. Mention <b>style</b> (stylized,
          realistic, low-poly), <b>material</b> (metal, wood, fabric) and{" "}
          <b>lighting</b> for best results.
        </p>
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-foreground/80">
          stylized fantasy potion bottle, glowing teal liquid, brass cap,
          carved wooden base, product photography, plain background
        </div>
        <p>Outputs a high-res concept image you can use directly or send to Image → 3D.</p>
      </div>
    ),
  },
  {
    id: "image-to-3d",
    title: "Image → 3D",
    icon: ImageIcon,
    blurb: "Turn a single reference photo into a 3D model.",
    body: (
      <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 marker:text-primary-glow">
        <li>Use a clean, centered subject on a neutral background.</li>
        <li>Square aspect ratio works best (1:1, 1024×1024).</li>
        <li>Avoid heavy shadows or motion blur — the AI bakes lighting into the texture.</li>
        <li>Front-facing views give the most predictable topology.</li>
      </ul>
    ),
  },
  {
    id: "formats",
    title: "Export Formats",
    icon: Box,
    blurb: "GLB, FBX, OBJ + PBR texture pack on every generation.",
    body: (
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        {[
          { f: "GLB", d: "Web, Three.js, AR, Babylon, Unity, Unreal." },
          { f: "FBX", d: "Maya, Blender, 3ds Max, Unity, Unreal." },
          { f: "OBJ", d: "Universal, no rig — great for sculpting." },
          { f: "PBR Pack", d: "Albedo, Normal, Roughness, Metallic, AO @ 2K." },
        ].map((x) => (
          <div key={x.f} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="font-display font-semibold text-foreground">{x.f}</div>
            <div className="text-muted-foreground text-xs mt-1">{x.d}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "second-life",
    title: "Second Life Integration",
    icon: Globe,
    blurb: "Generate from inside Second Life with one touch — uses your API key.",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Every model is optimized for the SL upload pipeline: low Land Impact,
          collapsed LODs, square 1024 textures and clean UVs.
        </p>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="font-display text-sm font-semibold text-foreground">
            In-world generator HUD
          </p>
          <p className="mt-1 text-xs">
            Drop our LSL script into any prim. Touch it, type a prompt in chat,
            and the model is queued against <b>your</b> KingDavez credits.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="/sl/kingdavez-generator.lsl"
              download
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gradient-primary)] px-3 py-1.5 text-xs font-medium text-white"
            >
              Download .lsl script
            </a>
            <a
              href="#api"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition"
            >
              View API reference
            </a>
          </div>
          <ol className="mt-3 space-y-1.5 list-decimal pl-5 marker:text-primary-glow text-xs">
            <li>Create a new script inside any in-world object.</li>
            <li>Paste the contents of <code className="text-foreground">kingdavez-generator.lsl</code>.</li>
            <li>
              Replace <code className="text-foreground">API_KEY</code> with your key from the{" "}
              <Link to="/dashboard" className="text-primary-glow hover:underline">
                dashboard
              </Link>
              .
            </li>
            <li>Touch the object and type your prompt — the job appears in your dashboard within seconds.</li>
          </ol>
        </div>

        <ul className="space-y-2 list-disc pl-5 marker:text-primary-glow">
          <li>In-world store: <b>Thranduil 169, 250, 21</b></li>
          <li>
            Marketplace:{" "}
            <a
              href="https://marketplace.secondlife.com/stores/269982"
              target="_blank"
              rel="noopener"
              className="text-primary-glow hover:underline"
            >
              marketplace.secondlife.com/stores/269982
            </a>
          </li>
          <li>
            Full guide on the{" "}
            <Link to="/second-life" className="text-primary-glow hover:underline">
              Second Life
            </Link>{" "}
            page.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "api",
    title: "REST API",
    icon: Code2,
    blurb: "Programmatic access to generation, billing and SL uploads.",
    body: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          All endpoints live under{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-foreground">
            https://kingdavez.click/api/public/v1/
          </code>
          . Authenticate with a Bearer API key from your{" "}
          <Link to="/dashboard" className="text-primary-glow hover:underline">
            dashboard
          </Link>
          .
        </p>
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-foreground/80 overflow-x-auto">
{`curl https://kingdavez.click/api/public/v1/me \\
  -H "Authorization: Bearer kd_live_xxxxxxxx"`}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { m: "GET", p: "/v1/me", d: "Your account, credits, plan." },
            { m: "POST", p: "/v1/generations", d: "Create a 3D generation." },
            { m: "POST", p: "/v1/sl/upload", d: "Push a model to your SL inventory." },
          ].map((x) => (
            <div key={x.p} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary-glow">
                  {x.m}
                </span>
                <code className="text-xs text-foreground">{x.p}</code>
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">{x.d}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "api-keys",
    title: "API Keys",
    icon: Key,
    blurb: "Create, rotate and revoke keys from the dashboard.",
    body: (
      <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 marker:text-primary-glow">
        <li>Keys are prefixed with <code className="text-foreground">kd_live_</code>.</li>
        <li>Treat them as secrets — never commit to git or expose in client code.</li>
        <li>Each call consumes credits from the key owner's balance.</li>
        <li>Rate-limited per key; bursts return HTTP 429 with a Retry-After header.</li>
      </ul>
    ),
  },
  {
    id: "credits",
    title: "Credits & Billing",
    icon: Coins,
    blurb: "Pay-as-you-go credits, no subscription required.",
    body: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Each generation consumes credits based on complexity and resolution.
          Top up any time on the{" "}
          <Link to="/credits" className="text-primary-glow hover:underline">
            credits page
          </Link>{" "}
          via PayPal. Receipts are sent to your account email.
        </p>
        <p>
          See the{" "}
          <Link to="/credits/history" className="text-primary-glow hover:underline">
            credit history
          </Link>{" "}
          page for a full transaction log.
        </p>
      </div>
    ),
  },
  {
    id: "teams",
    title: "Teams",
    icon: Users,
    blurb: "Share a credit pool with collaborators.",
    body: (
      <p className="text-sm text-muted-foreground">
        Invite members to a team to share credits, assets and API keys. Manage
        roles on the{" "}
        <Link to="/teams" className="text-primary-glow hover:underline">
          teams page
        </Link>
        .
      </p>
    ),
  },
  {
    id: "security",
    title: "Security & Privacy",
    icon: ShieldCheck,
    blurb: "Your prompts and assets stay yours.",
    body: (
      <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5 marker:text-primary-glow">
        <li>All traffic uses TLS 1.3.</li>
        <li>API keys are hashed at rest; raw values are only shown once on creation.</li>
        <li>Generated assets are private to your account by default.</li>
        <li>Full terms on the <Link to="/tos" className="text-primary-glow hover:underline">Terms of Service</Link> page.</li>
      </ul>
    ),
  },
];

function DocsPage() {
  return (
    <div className="relative min-h-screen">
      <Header />

      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary-glow" />
              Documentation
            </div>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight">
              Build with KingDavez
            </h1>
            <p className="mt-4 text-muted-foreground">
              Everything you need to generate, integrate and ship 3D assets —
              from your first prompt to a production-grade API integration.
            </p>
          </div>

          {/* Quick nav */}
          <div className="mt-12 grid md:grid-cols-[220px_minmax(0,1fr)] gap-8">
            <aside className="md:sticky md:top-28 self-start">
              <div className="rounded-2xl border border-white/10 bg-card/60 backdrop-blur p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 mb-2">
                  On this page
                </p>
                <nav className="flex flex-col gap-0.5">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
                    >
                      <s.icon className="h-3.5 w-3.5 text-primary-glow" />
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="space-y-8">
              {sections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-28 rounded-2xl border border-white/10 bg-card/60 backdrop-blur p-6 sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--gradient-primary)] glow">
                      <s.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-display text-xl font-semibold tracking-tight">
                        {s.title}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">{s.blurb}</p>
                    </div>
                  </div>
                  <div className="mt-5">{s.body}</div>
                </section>
              ))}

              {/* Help footer */}
              <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  Still need help?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Reach out and we'll get back to you fast.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="mailto:kinlochdavid8@gmail.com"
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--gradient-primary)] px-4 py-2 text-sm font-medium text-white"
                  >
                    <Mail className="h-4 w-4" /> kinlochdavid8@gmail.com
                  </a>
                  <Link
                    to="/faq"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                  >
                    Read the FAQ <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
                    Second Life: <b className="text-foreground">Kingdavez</b>
                  </span>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
