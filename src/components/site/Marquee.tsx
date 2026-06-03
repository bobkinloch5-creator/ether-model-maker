import {
  Box,
  Sparkles,
  Palette,
  Layers,
  ImageIcon,
  Wand2,
  Globe,
  Zap,
  Package,
} from "lucide-react";

const ITEMS = [
  { icon: Box, text: "Text → 3D" },
  { icon: ImageIcon, text: "Image → 3D" },
  { icon: Palette, text: "AI Texturing" },
  { icon: Layers, text: "PBR Maps" },
  { icon: Wand2, text: "Prompt Edits" },
  { icon: Globe, text: "Second Life Ready" },
  { icon: Sparkles, text: "Low-LI Mesh" },
  { icon: Zap, text: "Under 60s" },
  { icon: Package, text: "GLB · FBX · DAE" },
];

export function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-white/5 py-6">
      <div className="marquee-mask">
        <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap text-sm text-muted-foreground">
          {row.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary-glow" />
              <span className="font-medium tracking-wide">{text}</span>
              <span className="mx-4 h-1 w-1 rounded-full bg-white/20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
