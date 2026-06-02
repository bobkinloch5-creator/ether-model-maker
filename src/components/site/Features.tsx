import { Box, ImageIcon, Palette, Layers, Globe, Sparkles } from "lucide-react";
import { useScrollAnimate } from "@/hooks/useScrollAnimate";

const features = [
  { icon: Box, title: "Text to 3D", desc: "Type a prompt, get a clean, retopologized mesh ready for rigging." },
  { icon: ImageIcon, title: "Image to 3D", desc: "Drop a reference image, reconstruct a faithful 3D model in seconds." },
  { icon: Palette, title: "AI Texturing", desc: "Re-texture any model with prompt-driven PBR materials." },
  { icon: Layers, title: "PBR Maps", desc: "Albedo, normal, roughness, AO — production-ready out of the box." },
  { icon: Globe, title: "Second Life Ready", desc: "Optimized exports compatible with SL mesh and collada workflows." },
  { icon: Sparkles, title: "In-world HUD", desc: "Generate assets directly from Second Life with our HUD integration." },
];

export function Features() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimate<HTMLDivElement>();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimate<HTMLDivElement>();

  return (
    <section id="features" className="relative py-16 sm:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div
          ref={headerRef}
          className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-glow">
              Beta
            </span>
            <p className="text-sm font-medium text-primary-glow">Everything you need</p>
          </div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            One platform. <span className="gradient-text">Every asset.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            From the first idea to the final upload — KingDavez Studios handles modeling,
            texturing and exports so you can ship faster.
          </p>
        </div>

        <div
          ref={gridRef}
          className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/5 sm:mt-14 sm:grid-cols-2 md:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className={`group relative bg-card p-6 sm:p-8 transition-all duration-500 hover:bg-card/60 hover-lift ${
                gridVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: gridVisible ? `${i * 100}ms` : "0ms" }}
            >

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--gradient-primary)] shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.6)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold transition-colors group-hover:text-primary-glow">
                {title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
