import { ShoppingBag, Users, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { SL_LINKS } from "@/lib/second-life";

export function SecondLife() {
  const cards = [
    {
      icon: ShoppingBag,
      title: "Marketplace Store",
      desc: "Browse and buy KingDavez Studios mesh, textures, and full-perm builder kits on the Second Life Marketplace.",
      href: SL_LINKS.marketplace,
      cta: "Visit our SL Marketplace store",
      external: true,
    },
    {
      icon: MapPin,
      title: "In-World Store — Thranduil",
      desc: "Teleport directly to our in-world showroom on the Thranduil region for live demos, freebies, and group gifts.",
      href: SL_LINKS.inworld,
      cta: "Teleport to Thranduil (169, 250, 21)",
      external: true,
    },
    {
      icon: Users,
      title: "Join the SL Group",
      desc: "Get notices on new releases, member-only discounts, AI generation freebies, and SL builder tutorials.",
      href: SL_LINKS.group,
      cta: "Join the KingDavez Studios SL group",
      external: false,
    },
  ];

  return (
    <section
      id="second-life"
      aria-labelledby="sl-heading"
      className="relative border-t border-white/10 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> Built for Second Life creators
          </div>
          <h2
            id="sl-heading"
            className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Find us <span className="gradient-text">in Second Life</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            KingDavez Studios is an active Second Life brand. Generate prim-friendly, low-LI mesh
            with our AI, then visit our in-world store, browse the SL Marketplace, or join our group
            for member perks.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 sm:mt-12">
          {cards.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noreferrer" : undefined}
              className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/40 hover:bg-white/[0.07]"
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

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
          Second Life is a trademark of Linden Research, Inc. KingDavez Studios is an independent
          creator brand operating on the SL platform.
        </p>
      </div>
    </section>
  );
}
