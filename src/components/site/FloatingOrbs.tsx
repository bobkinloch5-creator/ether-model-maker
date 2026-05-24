import { useEffect, useRef } from "react";

/**
 * Decorative parallax orbs that follow the mouse subtly.
 * Pure CSS transforms — GPU-cheap.
 */
export function FloatingOrbs() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0;

    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      tx = x * 30;
      ty = y * 30;
    };

    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.setProperty("--mx", `${cx}px`);
      el.style.setProperty("--my", `${cy}px`);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{ ["--mx" as string]: "0px", ["--my" as string]: "0px" }}
    >
      <div
        className="absolute h-[520px] w-[520px] rounded-full opacity-40 blur-3xl animate-blob"
        style={{
          top: "-10%",
          left: "8%",
          background:
            "radial-gradient(circle at 30% 30%, oklch(0.7 0.22 305 / 0.7), transparent 70%)",
          transform: "translate3d(var(--mx), var(--my), 0)",
        }}
      />
      <div
        className="absolute h-[460px] w-[460px] rounded-full opacity-40 blur-3xl animate-blob"
        style={{
          top: "5%",
          right: "5%",
          animationDelay: "-7s",
          background:
            "radial-gradient(circle at 60% 40%, oklch(0.78 0.18 200 / 0.7), transparent 70%)",
          transform: "translate3d(calc(var(--mx) * -1), var(--my), 0)",
        }}
      />
      <div
        className="absolute h-[420px] w-[420px] rounded-full opacity-30 blur-3xl animate-blob"
        style={{
          bottom: "-10%",
          left: "30%",
          animationDelay: "-14s",
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.78 0.2 330 / 0.7), transparent 70%)",
          transform: "translate3d(var(--mx), calc(var(--my) * -1), 0)",
        }}
      />
    </div>
  );
}
