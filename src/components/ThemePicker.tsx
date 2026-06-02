import { useState } from "react";
import { Palette, Check, RotateCcw, X } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { DraggableFab } from "@/components/DraggableFab";

// Hex -> OKLCH triplet ("L C H") via a quick sRGB->OKLab conversion
function hexToOklch(hex: string): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m2 = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m2 - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m2 + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m2 - 0.808675766 * s;
  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return `${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)}`;
}

export function ThemePicker() {
  const { presets, preset, state, setPreset, setCustomPrimary, reset } = useTheme();
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState("#a855f7");

  return (
    <>
      <DraggableFab storageKey="fab-pos:theme" defaultRight={20} defaultBottom={20} size={48} zIndex={40}>
        {({ onClickGuard }) => (
          <button
            onClick={onClickGuard(() => setOpen(true))}
            aria-label="Customize theme (drag to move)"
            className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-card/90 shadow-lg backdrop-blur hover:scale-105 transition"
          >
            <Palette className="h-5 w-5 text-primary-glow" />
          </button>
        )}
      </DraggableFab>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-3 right-3 left-3 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[340px] sm:max-w-[calc(100vw-2.5rem)] max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-card p-5 shadow-2xl animate-scale-in"
          >

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary-glow" />
                <h3 className="font-display text-sm font-semibold">Theme</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Core themes
            </p>
            <div className="grid grid-cols-2 gap-2">
              {presets.filter((p) => p.group !== "Seasonal").map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition ${
                    p.id === preset.id
                      ? "border-primary/60 bg-primary/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex -space-x-1">
                    <span className="h-5 w-5 rounded-full border border-black/20" style={{ background: `oklch(${p.background})` }} />
                    <span className="h-5 w-5 rounded-full border border-black/20" style={{ background: `oklch(${p.primary})` }} />
                    <span className="h-5 w-5 rounded-full border border-black/20" style={{ background: `oklch(${p.primaryGlow})` }} />
                  </div>
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === preset.id && <Check className="h-3.5 w-3.5 text-primary-glow" />}
                </button>
              ))}
            </div>

            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-5 mb-2 flex items-center gap-1.5">
              <span>Seasonal & holiday</span>
              <span className="text-[10px] normal-case tracking-normal text-primary-glow/80">— with wallpaper</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {presets.filter((p) => p.group === "Seasonal").map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`group relative overflow-hidden rounded-xl border text-left transition ${
                    p.id === preset.id
                      ? "border-primary/60 ring-2 ring-primary/40"
                      : "border-white/10 hover:border-white/30"
                  }`}
                  style={{
                    backgroundImage: p.wallpaper ? `url(${p.wallpaper})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    minHeight: 64,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="relative flex items-end justify-between gap-1 p-2 h-full min-h-[64px]">
                    <span className="text-[11px] font-medium text-white drop-shadow flex items-center gap-1">
                      <span className="text-sm">{p.icon}</span>
                      {p.name}
                    </span>
                    {p.id === preset.id && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-5 mb-2 flex items-center gap-1.5">
              <span>Scenic & atmosphere</span>
              <span className="text-[10px] normal-case tracking-normal text-primary-glow/80">— with wallpaper</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {presets.filter((p) => p.group === "Scenic").map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`group relative overflow-hidden rounded-xl border text-left transition ${
                    p.id === preset.id
                      ? "border-primary/60 ring-2 ring-primary/40"
                      : "border-white/10 hover:border-white/30"
                  }`}
                  style={{
                    backgroundImage: p.wallpaper ? `url(${p.wallpaper})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    minHeight: 64,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="relative flex items-end justify-between gap-1 p-2 h-full min-h-[64px]">
                    <span className="text-[11px] font-medium text-white drop-shadow flex items-center gap-1">
                      <span className="text-sm">{p.icon}</span>
                      {p.name}
                    </span>
                    {p.id === preset.id && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-5 mb-2">
              Custom accent color
            </p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-white/10 bg-transparent"
              />
              <button
                onClick={() => setCustomPrimary(hexToOklch(hex))}
                className="flex-1 rounded-md bg-primary/20 px-3 py-2 text-xs font-medium text-primary-glow hover:bg-primary/30 transition"
              >
                Apply {hex}
              </button>
            </div>
            {state.customPrimary && (
              <button
                onClick={() => setCustomPrimary(null)}
                className="mt-2 w-full rounded-md border border-white/10 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition"
              >
                Clear custom color
              </button>
            )}

            <button
              onClick={reset}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to default
            </button>
          </div>
        </div>
      )}
    </>
  );
}
