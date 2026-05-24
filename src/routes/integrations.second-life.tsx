import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ArrowLeft, Box } from "lucide-react";

export const Route = createFileRoute("/integrations/second-life")({
  head: () => ({
    meta: [
      { title: "Second Life — SL-Optimized AI Mesh (DAE/COLLADA) | KingDavez Studios" },
      { name: "description", content: "SL-ready pipeline: low Land Impact, watertight mesh, DAE/COLLADA export, in-world delivery. Generate, optimize, and upload to Second Life." },
      { property: "og:title", content: "Second Life — AI mesh upload guide" },
      { property: "og:description", content: "Low-LI, watertight mesh, DAE export." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/integrations/second-life" }],
  }),
  component: SecondLifePage,
});

function SecondLifePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/15 border border-pink-400/30 mb-4">
          <Box className="h-6 w-6 text-pink-300" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">AI mesh built for Second Life</h1>
        <p className="mt-3 text-muted-foreground">
          Generations exported through our SL pipeline are watertight, low-LI, and shipped as
          DAE / COLLADA — the format the Firestorm and official SL viewers expect.
        </p>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Upload to Second Life</h2>
          <ol className="mt-4 space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
            <li>Generate a model, then click <strong>Export → DAE (Second Life)</strong> on the result.</li>
            <li>In the SL viewer: <code className="text-foreground">Build → Upload → Model…</code> and pick the DAE.</li>
            <li>On the Physics tab, choose <strong>Lowest</strong> for furniture / props, or upload our generated low-poly physics shape.</li>
            <li>Calculate weights &amp; fees — typical KingDavez exports come in under 1.0 LI for a single-link prop.</li>
            <li>Upload, then rez in-world.</li>
          </ol>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-lg font-semibold">SL-optimized defaults</h3>
          <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li><strong>Geometry:</strong> watertight, manifold, &lt; 21,844 verts per face (SL limit).</li>
            <li><strong>UVs:</strong> single channel, 0–1 space, no overlaps.</li>
            <li><strong>Textures:</strong> 1024² or 512² PBR baked to diffuse + normal for classic SL materials.</li>
            <li><strong>Scale:</strong> meters — matches SL's world unit, no rescaling on upload.</li>
            <li><strong>LODs:</strong> 4 levels auto-generated to keep Land Impact low.</li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">In-world delivery</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            We're piloting in-world delivery via a CasperVend-compatible script. If you want early access,
            head to <Link to="/community" className="underline">the community hub</Link> and ping us.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
