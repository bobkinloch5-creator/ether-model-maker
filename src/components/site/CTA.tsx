import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useScrollAnimate } from "@/hooks/useScrollAnimate";

export function CTA() {
  const { ref, isVisible } = useScrollAnimate<HTMLDivElement>();

  return (
    <section className="relative py-16 sm:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div
          ref={ref}
          className={`glow relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--gradient-primary)] p-8 text-center sm:p-20 transition-all duration-700 ${
            isVisible ? "opacity-100 scale-100" : "opacity-0 scale-[0.95]"
          }`}
        >
          <div className="grid-bg absolute inset-0 opacity-30" />
          {/* Animated floating orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-pulse-glow" />
            <div
              className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-pulse-glow"
              style={{ animationDelay: "1.5s" }}
            />
          </div>

          <h2 className="relative font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Your next 3D asset is <br className="hidden sm:block" /> one prompt away.
          </h2>

          <p className="relative mx-auto mt-4 max-w-xl text-white/85">
            Join thousands of creators using KingDavez Studios to ship faster.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-black/80 hover:scale-105 active:scale-95"
            >
              <Sparkles className="h-4 w-4" /> Start creating free
            </Link>
            <Link
              to="/generate"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 hover:scale-105 active:scale-95"
            >
              Try it now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
