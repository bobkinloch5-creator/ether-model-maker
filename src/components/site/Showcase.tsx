import s1 from "@/assets/showcase-1.jpg";
import s2 from "@/assets/showcase-2.jpg";
import s3 from "@/assets/showcase-3.jpg";
import s4 from "@/assets/showcase-4.jpg";
import s5 from "@/assets/showcase-5.jpg";
import s6 from "@/assets/showcase-6.jpg";
import { Link } from "@tanstack/react-router";
import { Wand2 } from "lucide-react";

const items = [
  { src: s1, prompt: "Heroic fantasy warrior, ornate armor", author: "@nyxforge" },
  { src: s2, prompt: "Cute pink robot mascot, glowing eyes", author: "@pixelpop" },
  { src: s3, prompt: "Ornate sword with violet runes", author: "@arcblade" },
  { src: s4, prompt: "Sci-fi cruiser, neon underglow", author: "@stardrift" },
  { src: s5, prompt: "Iridescent dragon, stylized scales", author: "@scalelore" },
  { src: s6, prompt: "Low-poly treasure chest, magic glow", author: "@loothaus" },
];

export function Showcase() {
  return (
    <section id="showcase" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary-glow">Community showcase</p>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Made with <span className="gradient-text">KingDavez Studios</span>.
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            A glimpse of what creators ship every day — from stylized props to
            production-grade characters, all generated in seconds.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {items.map((it, i) => (
            <Link
              key={i}
            to="/generate"
              search={{ type: "image-to-3d", prompt: it.prompt } as never}
              className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-card aspect-square focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Try this prompt: ${it.prompt}`}
            >
              <img
                src={it.src}
                alt={it.prompt}
                loading="lazy"
                width={1024}
                height={1024}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                <p className="line-clamp-1 text-sm font-medium text-white">{it.prompt}</p>
                <p className="text-xs text-white/60">{it.author}</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                  <Wand2 className="h-3 w-3" /> Try this prompt
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
