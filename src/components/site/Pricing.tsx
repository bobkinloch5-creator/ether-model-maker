import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: 9.99,
    credits: 100,
    desc: "Quick test runs for new ideas and small texture jobs.",
    features: ["100 generation credits", "Text-to-3D tests", "Texture prompt experiments", "Community support"],
  },
  {
    name: "Creator",
    price: 39.99,
    credits: 500,
    desc: "The best fit for active SL creators building weekly.",
    features: ["500 generation credits", "Image-to-3D workflows", "PBR material generation", "Priority queue"],
    popular: true,
  },
  {
    name: "Studio",
    price: 99.99,
    credits: 1500,
    desc: "Higher-volume production for full asset packs and launches.",
    features: ["1,500 generation credits", "Full SL asset sessions", "Marketplace-ready iteration", "Dedicated support"],
  },
];

const paypalHref = (price: number, credits: number) => {
  const note = encodeURIComponent(`KingDavez Studios ${credits} credits`);
  return `https://paypal.me/kinloch930/${price.toFixed(2)}?note=${note}`;
};

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary-glow">Pricing</p>
          <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Pay only for <span className="gradient-text">what you create.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Credit packs never expire. Use them on text-to-3D, image-to-3D,
            re-texturing — anything on the platform.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-3xl p-8 transition ${
                t.popular
                  ? "bg-[var(--gradient-primary)] text-white shadow-[var(--shadow-glow)]"
                  : "glass hover:border-primary/30"
              }`}
            >
              {t.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-black px-3 py-1 text-[11px] font-medium uppercase tracking-wider">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-xl font-semibold">{t.name}</h3>
              <p className={`mt-1 text-sm ${t.popular ? "text-white/80" : "text-muted-foreground"}`}>{t.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl font-semibold">${t.price}</span>
                <span className={`text-sm ${t.popular ? "text-white/70" : "text-muted-foreground"}`}>
                  / {t.credits} credits
                </span>
              </div>
              <a
                href={paypalHref(t.price, t.credits)}
                target="_blank"
                rel="noreferrer"
                className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-medium transition ${
                  t.popular
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-[var(--gradient-primary)] text-white hover:opacity-95"
                }`}
              >
                Buy {t.name}
              </a>
              <ul className="mt-8 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${t.popular ? "text-white" : "text-primary-glow"}`} />
                    <span className={t.popular ? "text-white/90" : "text-foreground/90"}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
