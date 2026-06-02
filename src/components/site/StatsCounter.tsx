import { useEffect, useRef, useState } from "react";
import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import { Zap, Box, Users, Globe } from "lucide-react";

const STATS = [
  { icon: Box, value: 48000, suffix: "+", label: "Models generated" },
  { icon: Users, value: 3200, suffix: "+", label: "Active creators" },
  { icon: Zap, value: 42, suffix: "s", label: "Avg. generation time" },
  { icon: Globe, value: 99, suffix: "%", label: "SL-ready exports" },
];

function useCountUp(target: number, run: boolean, duration = 1600) {
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!run || started.current) return;
    started.current = true;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, target, duration]);
  return n;
}

function Stat({
  icon: Icon,
  value,
  suffix,
  label,
  run,
  delay,
}: {
  icon: typeof Box;
  value: number;
  suffix: string;
  label: string;
  run: boolean;
  delay: number;
}) {
  const n = useCountUp(value, run);
  return (
    <div
      className={`glass group relative overflow-hidden rounded-2xl p-6 text-center transition-all duration-700 hover-lift ${
        run ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--gradient-primary)] shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.6)] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="font-display text-4xl font-semibold tracking-tight tabular-nums">
        <span className="text-shine">
          {n.toLocaleString()}
          {suffix}
        </span>
      </div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export function StatsCounter() {
  const { ref, isVisible } = useScrollAnimate<HTMLDivElement>({ threshold: 0.25 });
  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div ref={ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Stat key={s.label} {...s} run={isVisible} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}
