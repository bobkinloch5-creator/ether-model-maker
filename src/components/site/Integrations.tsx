import { Box, Gamepad2, Cuboid, Hammer, Globe, Layers3, Sparkles, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Integration = {
  name: string;
  icon: typeof Box;
  blurb: string;
  format: string;
  accent: string;
  href?: string;
  cta?: string;
};

const INTEGRATIONS: Integration[] = [
  {
    name: "Blender",
    icon: Hammer,
    blurb: "One-file Python add-on adds a panel in the 3D viewport — type a prompt, get a GLB imported into your scene.",
    format: "Add-on · GLB · OBJ · FBX",
    accent: "from-orange-500/30 to-amber-400/10",
    href: "/integrations/blender",
    cta: "Install add-on →",
  },
  {
    name: "Roblox Studio",
    icon: Gamepad2,
    blurb: "One-file Luau plugin lets you generate AI 3D models from a prompt without leaving Studio.",
    format: "Studio plugin · FBX · OBJ",
    accent: "from-rose-500/30 to-red-400/10",
    href: "/integrations/roblox",
    cta: "Install plugin →",
  },
  {
    name: "Unity",
    icon: Cuboid,
    blurb: "Drag GLB / FBX into your Assets folder. Materials, normals, AO maps wired automatically.",
    format: "GLB · FBX",
    accent: "from-slate-400/30 to-zinc-300/10",
    href: "/integrations/unity",
    cta: "Import guide →",
  },
  {
    name: "Unreal Engine",
    icon: Layers3,
    blurb: "FBX import with PBR maps for instant use in your level. Nanite-friendly LODs available.",
    format: "FBX · GLB",
    accent: "from-sky-500/30 to-blue-400/10",
    href: "/integrations/unreal",
    cta: "Import guide →",
  },
  {
    name: "Godot",
    icon: Sparkles,
    blurb: "Native GLB import, zero conversion needed. Perfect for indie & open-source pipelines.",
    format: "GLB",
    accent: "from-emerald-500/30 to-teal-400/10",
    href: "/integrations/godot",
    cta: "Import guide →",
  },
  {
    name: "Three.js / web",
    icon: Globe,
    blurb: "GLB models stream straight into <model-viewer>, react-three-fiber, Babylon.js.",
    format: "GLB · GLTF",
    accent: "from-violet-500/30 to-fuchsia-400/10",
    href: "/integrations/web",
    cta: "Web guide →",
  },
  {
    name: "Second Life",
    icon: Box,
    blurb: "Optional SL-optimized pipeline: low LI, watertight mesh, DAE export, in-world delivery.",
    format: "DAE · COLLADA",
    accent: "from-pink-500/30 to-purple-400/10",
    href: "/integrations/second-life",
    cta: "Upload guide →",
  },
  {
    name: "Anywhere else",
    icon: Package,
    blurb: "Any DCC, engine, or marketplace that reads standard 3D formats — Maya, 3ds Max, Houdini, Sketchfab.",
    format: "GLB · OBJ · FBX · DAE",
    accent: "from-cyan-500/30 to-teal-300/10",
    href: "/integrations/anywhere",
    cta: "See all →",
  },
];

export function Integrations() {
  return (
    <section id="integrations" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            Works everywhere
          </span>
          <h2 className="mt-4 font-display text-3xl sm:text-5xl font-semibold tracking-tight">
            Built for <span className="text-shine">every engine</span> & DCC
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Not just Second Life. Export standard 3D formats and use your assets in Blender,
            Unity, Unreal, Godot, Roblox, Three.js, web viewers — or anywhere that opens GLB,
            OBJ, FBX, or DAE.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INTEGRATIONS.map(({ name, icon: Icon, blurb, format, accent, href, cta }) => (
            <div
              key={name}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-white/20 transition"
            >
              <div
                className={`pointer-events-none absolute -inset-px bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition`}
              />
              <div className="relative">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/10 mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold tracking-tight">{name}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{blurb}</p>
                <div className="mt-3 inline-flex items-center rounded-full bg-black/30 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {format}
                </div>
                {href && cta && (
                  <Link
                    to={href}
                    className="mt-3 inline-flex text-xs font-medium text-primary-glow hover:underline"
                  >
                    {cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Every generation exports as standard mesh formats — no vendor lock-in, no proprietary tooling.
        </p>
      </div>
    </section>
  );
}
