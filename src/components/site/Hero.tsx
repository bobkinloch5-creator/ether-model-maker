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
  const [value, setValue] = useState("An ornate elven longbow with glowing runes");
  const [mode, setMode] = useState<"text-to-image" | "image-to-3d">("text-to-image");

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
          The fastest way to <br className="hidden sm:block" />
          <span className="text-shine">3D, from text or image.</span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:mt-6 sm:text-lg animate-slide-up animate-delay-200">
          Generate game-ready 3D models, PBR textures, and animations in under
          a minute. Export to Blender, Unity, Unreal, Godot, Roblox, Three.js,
          Second Life — anywhere you build.
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
                <button
                  type="button"
                  onClick={() => setMode("text-to-image")}
                  aria-pressed={mode === "text-to-image"}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                    mode === "text-to-image"
                      ? "bg-[var(--gradient-primary)] text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Wand2 className="h-3.5 w-3.5" /> Text
                </button>
                <button
                  type="button"
                  onClick={() => setMode("image-to-3d")}
                  aria-pressed={mode === "image-to-3d"}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                    mode === "image-to-3d"
                      ? "bg-[var(--gradient-primary)] text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Image
                </button>
              </div>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                placeholder="An ornate elven longbow with glowing runes…"
                aria-label="Describe your 3D model"
              />
              <button
                type="submit"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--gradient-primary)] px-4 text-sm font-medium text-white hover:opacity-95 transition"
              >
                <Box className="h-4 w-4" /> Generate
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground">
              <span>Try:</span>
              {SUGGESTIONS.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => {
                    setValue(t);
                    go(t);
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 hover:bg-white/15 hover:text-foreground cursor-pointer transition"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground animate-fade-in animate-delay-400">
            No credit card required · 25 free credits
          </p>
        </form>
      </div>
    </section>
  );
}
