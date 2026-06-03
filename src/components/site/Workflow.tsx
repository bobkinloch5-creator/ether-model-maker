import { useScrollAnimate } from "@/hooks/useScrollAnimate";

const steps = [
  {
    n: "01",
    title: "Prompt or upload",
    desc: "Describe the asset in plain English, or drop a reference image.",
  },
  {
    n: "02",
    title: "Generate & refine",
    desc: "AI returns a clean mesh with PBR materials. Iterate with edits and re-textures.",
  },
  {
    n: "03",
    title: "Export & ship",
    desc: "Download GLB / FBX / DAE optimized for Second Life, Unity or Unreal.",
  },
];

export function Workflow() {
  const { ref: leftRef, isVisible: leftVisible } = useScrollAnimate<HTMLDivElement>();
  const { ref: rightRef, isVisible: rightVisible } = useScrollAnimate<HTMLOListElement>();

  return (
    <section className="relative py-16 sm:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div
            ref={leftRef}
            className={`transition-all duration-700 ${
              leftVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
            }`}
          >
            <p className="text-sm font-medium text-primary-glow">Workflow</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              From idea to <span className="gradient-text">in-world</span> in three steps.
            </h2>
            <p className="mt-4 text-muted-foreground">
              No DCC software required. No retopology drudgery. Just describe, generate, and export
              — that simple.
            </p>
          </div>
          <ol ref={rightRef} className="space-y-3">
            {steps.map((s, i) => (
              <li
                key={s.n}
                className={`glass flex items-start gap-4 sm:gap-5 rounded-2xl p-5 sm:p-6 transition-all duration-500 hover:border-primary/30 hover-lift ${
                  rightVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
                }`}
                style={{ transitionDelay: rightVisible ? `${i * 150}ms` : "0ms" }}
              >
                <span className="gradient-text font-display text-3xl font-semibold transition-transform duration-300 hover:scale-110">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
