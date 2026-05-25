import heroBg from "@/assets/hero-bg.jpg";
import { ArrowRight, Wand2, ImageIcon, Box } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SparkleField } from "@/components/SparkleField";
import { FloatingOrbs } from "@/components/site/FloatingOrbs";

const SUGGESTIONS = [
  "cyberpunk helmet with neon trim",
  "low-poly stylized fox",
  "ornate treasure chest, glowing runes",
  "stylized broadsword, battle worn",
];

export function Hero() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [value, setValue] = useState("An ornate elven longbow with glowing runes");
  const [mode] = useState<"image-to-3d">("image-to-3d");

  const go = (prompt?: string) => {
    const p = (prompt ?? value).trim();
    navigate({
      to: "/generate",
      search: { type: mode, ...(p ? { prompt: p } : {}) } as never,
    });
  };

  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-48 sm:pb-32">
      <FloatingOrbs />
      <SparkleField />
      <div className="grid-bg absolute inset-0 -z-10" />
      <div
        className="absolute inset-x-0 -top-32 -z-10 h-[700px] opacity-60"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 40%, black, transparent 75%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-4 text-center">
        <a
          href="#features"
          className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground transition animate-fade-in"
        >
          <span className="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-glow mr-1">
            Beta
          </span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          New · Image-to-3D v2 is here
          <ArrowRight className="h-3.5 w-3.5" />
        </a>

        <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-[88px] animate-slide-up animate-delay-100">
          {t("hero.titleA")} <br className="hidden sm:block" />
          <span className="text-shine">{t("hero.titleB")}</span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:mt-6 sm:text-lg animate-slide-up animate-delay-200">
          {t("hero.subtitle")}
        </p>


        {/* Interactive prompt */}
        <form
          className="mx-auto mt-8 max-w-2xl animate-scale-in animate-delay-300 sm:mt-10"

          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <div className="glass rounded-2xl p-2 shadow-[var(--shadow-elegant)]">
            <div className="flex flex-col items-stretch gap-2 rounded-xl bg-black/40 p-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1 text-xs self-start sm:self-auto">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--gradient-primary)] px-3 py-1.5 font-medium text-white">
                  <ImageIcon className="h-3.5 w-3.5" /> {t("hero.image")}
                </span>
              </div>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                placeholder={t("hero.placeholder")}
                aria-label="Describe your 3D model"
              />
              <button
                type="submit"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--gradient-primary)] px-4 text-sm font-medium text-white hover:opacity-95 transition"
              >
                <Box className="h-4 w-4" /> {t("hero.generate")}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground">
              <span>{t("hero.try")}</span>
              {SUGGESTIONS.map((tt) => (
                <button
                  type="button"
                  key={tt}
                  onClick={() => {
                    setValue(tt);
                    go(tt);
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 hover:bg-white/15 hover:text-foreground cursor-pointer transition"
                >
                  {tt}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground animate-fade-in animate-delay-400">
            {t("hero.noCard")}
          </p>
        </form>
      </div>
    </section>
  );
}
