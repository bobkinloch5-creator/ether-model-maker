import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Users, MapPin, ArrowRight, Sparkles, Zap, Box, Image as ImageIcon, Mail, MessageSquare } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SL_LINKS } from "@/lib/second-life";

const TITLE = "Second Life AI 3D Mesh, Textures & Builder Tools — KingDavez Studios";
const DESCRIPTION =
  "AI-generated mesh, textures, and full-perm builder kits for Second Life. Visit the KingDavez Studios SL Marketplace store, our in-world shop on Thranduil, and join the SL group for freebies, notices and member perks.";

export const Route = createFileRoute("/second-life")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "Second Life mesh, Second Life AI, SL mesh creator, Second Life Marketplace, Thranduil SL, Second Life builder tools, low-LI mesh, full-perm mesh, SL textures, AI mesh for Second Life, KingDavez Studios SL",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://kingdavez.click/second-life" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/second-life" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Store",
          name: "KingDavez Studios — Second Life",
          url: "https://kingdavez.click/second-life",
          description: DESCRIPTION,
          sameAs: [SL_LINKS.marketplace, SL_LINKS.inworld],
          address: {
            "@type": "PostalAddress",
            addressLocality: "Thranduil",
            addressRegion: "Second Life",
            addressCountry: "Virtual",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Can I use KingDavez Studios mesh in Second Life?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Every model is exported as GLB/OBJ/FBX that uploads cleanly into Second Life. We optimize for low land impact (low LI), prim-friendly silhouettes, baked AO and UV-unwrapped topology by default.",
              },
            },
            {
              "@type": "Question",
              name: "Where is the KingDavez Studios in-world Second Life store?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Our in-world store is on the Thranduil region at (169, 250, 21). Teleport directly via the SLurl on this page.",
              },
            },
            {
              "@type": "Question",
              name: "Do you sell on the Second Life Marketplace?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes — our SL Marketplace store at marketplace.secondlife.com/stores/269982 carries mesh, textures, and full-perm builder kits generated and finished by our AI pipeline.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: SecondLifePage,
});

function SecondLifePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" /> For Second Life creators, builders & shoppers
              </div>
              <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
                AI mesh & textures, <span className="gradient-text">built for Second Life</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
                KingDavez Studios is an active Second Life brand. Generate low-LI, prim-friendly mesh from text or photos, then visit our in-world store on <span className="text-foreground">Thranduil</span>, shop the SL Marketplace, or join our group for freebies and notices.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={SL_LINKS.inworld}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--gradient-primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-95"
                >
                  <MapPin className="h-4 w-4" /> Teleport to Thranduil
                </a>
                <a
                  href={SL_LINKS.marketplace}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                >
                  <ShoppingBag className="h-4 w-4" /> SL Marketplace store
                </a>
                <a
                  href={SL_LINKS.group}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                >
                  <Users className="h-4 w-4" /> Join our SL group
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Three ways to shop & connect
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: ShoppingBag,
                  title: "SL Marketplace",
                  desc: "Mesh, textures, and full-perm builder kits — instantly purchasable on the official Second Life Marketplace.",
                  href: SL_LINKS.marketplace,
                  cta: "Open Marketplace store",
                  external: true,
                },
                {
                  icon: MapPin,
                  title: "In-World — Thranduil (169, 250, 21)",
                  desc: "Walk the showroom, demo full builds, grab freebies and group gifts in person on the Thranduil region.",
                  href: SL_LINKS.inworld,
                  cta: "Teleport now",
                  external: true,
                },
                {
                  icon: Users,
                  title: "SL Group",
                  desc: "Member notices, drop alerts, AI generation credit giveaways, builder Q&A and release previews.",
                  href: SL_LINKS.group,
                  cta: "Join the group in-world",
                  external: false,
                },
              ].map((c) => (
                <a
                  key={c.title}
                  href={c.href}
                  target={c.external ? "_blank" : undefined}
                  rel={c.external ? "noreferrer" : undefined}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/40 hover:bg-white/[0.07]"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                    {c.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Optimized for SL upload
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              Every generation can be SL-tuned: low triangle count, sealed manifold, single-mesh silhouette, baked AO, prim-friendly footprint, and clean UV unwraps so your land impact stays low.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {[
                { icon: Box, title: "Low LI mesh", desc: "Triangle budgets and topology tuned for SL upload." },
                { icon: ImageIcon, title: "Baked PBR textures", desc: "Diffuse, normal, roughness — Materials-ready." },
                { icon: Zap, title: "Single manifold", desc: "Sealed bottoms, no internal geometry, no overlaps." },
                { icon: Sparkles, title: "Full-perm options", desc: "Builder kits and base meshes you can ship." },
              ].map((f) => (
                <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary-glow">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                to="/generate"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--gradient-primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-95"
              >
                Start generating for Second Life <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* In-world HUD generator */}
        <section className="border-t border-white/10 py-20">
          <div className="mx-auto max-w-4xl px-4">
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-12">
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-glow">
                  ⚡ New — In-world generator
                </span>
                <h2 className="mt-4 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                  Generate 3D from inside Second Life
                </h2>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  Drop our free LSL script into any prim. Touch it, type a
                  prompt in chat, and a new model is queued against your
                  KingDavez credits — no browser required.
                </p>
                <ol className="mt-6 space-y-2 text-sm text-muted-foreground list-decimal pl-5 marker:text-primary-glow">
                  <li>Grab your API key from the <a href="/dashboard" className="text-primary-glow hover:underline">dashboard</a>.</li>
                  <li>Paste it into the script's <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-foreground">API_KEY</code> field.</li>
                  <li>Drop the script into any in-world object and touch it.</li>
                  <li>Results land in your dashboard ready to download as GLB / FBX / DAE.</li>
                </ol>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/sl/kingdavez-generator.lsl"
                    download
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--gradient-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.6)] hover:opacity-95 transition"
                  >
                    Download the LSL script
                  </a>
                  <a
                    href="/docs#second-life"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm hover:bg-white/10 transition"
                  >
                    Setup guide
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Get in touch
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              Questions about mesh, textures, or custom builds? Reach out directly — I'm active in-world and happy to help.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 max-w-xl mx-auto">
              <a
                href="mailto:kinlochdavid8@gmail.com"
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-primary/40 hover:bg-white/[0.07]"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-glow">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">Email</h3>
                <p className="mt-2 text-sm text-muted-foreground">kinlochdavid8@gmail.com</p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-glow">
                  Send an email <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </a>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">Second Life</h3>
                <p className="mt-2 text-sm text-muted-foreground">In-world: Kingdavez</p>
                <p className="mt-1 text-xs text-muted-foreground">IM me anytime — I'm online daily.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
