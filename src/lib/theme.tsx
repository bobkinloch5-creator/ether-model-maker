import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import summerWp from "@/assets/themes/summer.jpg";
import winterWp from "@/assets/themes/winter.jpg";
import springWp from "@/assets/themes/spring.jpg";
import autumnWp from "@/assets/themes/autumn.jpg";
import halloweenWp from "@/assets/themes/halloween.jpg";
import cyberpunkWp from "@/assets/themes/cyberpunk.jpg";
import galaxyWp from "@/assets/themes/galaxy.jpg";
import tropicalWp from "@/assets/themes/tropical.jpg";
import auroraWp from "@/assets/themes/aurora.jpg";
import cherryWp from "@/assets/themes/cherryblossom.jpg";
import mountainWp from "@/assets/themes/mountain.jpg";
import crystalWp from "@/assets/themes/crystal.jpg";
import enchantedWp from "@/assets/themes/enchanted.jpg";

export type ThemePreset = {
  id: string;
  name: string;
  // OKLCH triplets (L C H)
  background: string;
  card: string;
  primary: string;
  primaryGlow: string;
  accent: string;
  // Optional seasonal wallpaper (URL). When set, the body shows it as a fixed bg.
  wallpaper?: string;
  // Optional emoji/icon shown in picker
  icon?: string;
  // Group label
  group?: "Core" | "Seasonal" | "Scenic";
};

export const THEME_PRESETS: ThemePreset[] = [
  // Core
  {
    id: "midnight-violet",
    name: "Midnight Violet",
    background: "0.13 0.02 280",
    card: "0.17 0.025 282",
    primary: "0.7 0.22 305",
    primaryGlow: "0.78 0.2 330",
    accent: "0.78 0.18 200",
    group: "Core",
  },
  {
    id: "deep-ocean",
    name: "Deep Ocean",
    background: "0.14 0.03 240",
    card: "0.18 0.035 240",
    primary: "0.7 0.18 220",
    primaryGlow: "0.78 0.16 200",
    accent: "0.8 0.15 180",
    group: "Core",
  },
  {
    id: "noir-gold",
    name: "Noir & Gold",
    background: "0.11 0.005 60",
    card: "0.16 0.008 70",
    primary: "0.78 0.14 85",
    primaryGlow: "0.85 0.16 75",
    accent: "0.7 0.18 40",
    group: "Core",
  },
  {
    id: "emerald-dusk",
    name: "Emerald Dusk",
    background: "0.13 0.02 160",
    card: "0.17 0.025 160",
    primary: "0.72 0.18 160",
    primaryGlow: "0.8 0.16 150",
    accent: "0.78 0.16 120",
    group: "Core",
  },
  {
    id: "sunset-crimson",
    name: "Sunset Crimson",
    background: "0.14 0.02 20",
    card: "0.18 0.03 20",
    primary: "0.7 0.22 25",
    primaryGlow: "0.78 0.2 50",
    accent: "0.78 0.18 320",
    group: "Core",
  },
  {
    id: "arctic-light",
    name: "Arctic Light",
    background: "0.97 0.005 240",
    card: "0.99 0.005 240",
    primary: "0.55 0.18 240",
    primaryGlow: "0.65 0.16 220",
    accent: "0.6 0.15 200",
    group: "Core",
  },
  // Seasonal — with wallpapers
  {
    id: "summer-sunset",
    name: "Summer Sunset",
    icon: "☀️",
    background: "0.16 0.05 40",
    card: "0.19 0.06 35",
    primary: "0.78 0.2 40",
    primaryGlow: "0.85 0.18 60",
    accent: "0.78 0.15 200",
    wallpaper: summerWp,
    group: "Seasonal",
  },
  {
    id: "winter-holiday",
    name: "Winter Holiday",
    icon: "❄️",
    background: "0.12 0.025 250",
    card: "0.16 0.03 250",
    primary: "0.7 0.2 25",
    primaryGlow: "0.82 0.15 80",
    accent: "0.78 0.18 150",
    wallpaper: winterWp,
    group: "Seasonal",
  },
  {
    id: "spring-blossom",
    name: "Spring Blossom",
    icon: "🌸",
    background: "0.16 0.04 350",
    card: "0.2 0.045 350",
    primary: "0.78 0.18 350",
    primaryGlow: "0.85 0.14 200",
    accent: "0.8 0.14 150",
    wallpaper: springWp,
    group: "Seasonal",
  },
  {
    id: "autumn-ember",
    name: "Autumn Ember",
    icon: "🍂",
    background: "0.14 0.04 40",
    card: "0.18 0.05 40",
    primary: "0.7 0.2 45",
    primaryGlow: "0.78 0.18 65",
    accent: "0.7 0.18 25",
    wallpaper: autumnWp,
    group: "Seasonal",
  },
  {
    id: "halloween-night",
    name: "Halloween Night",
    icon: "🎃",
    background: "0.1 0.04 310",
    card: "0.14 0.05 310",
    primary: "0.7 0.22 35",
    primaryGlow: "0.78 0.22 315",
    accent: "0.78 0.2 60",
    wallpaper: halloweenWp,
    group: "Seasonal",
  },
  // Scenic — immersive wallpapers
  {
    id: "cyberpunk-neon",
    name: "Cyberpunk Neon",
    icon: "⚡",
    background: "0.1 0.04 300",
    card: "0.14 0.05 300",
    primary: "0.75 0.22 330",
    primaryGlow: "0.82 0.2 350",
    accent: "0.78 0.18 190",
    wallpaper: cyberpunkWp,
    group: "Scenic",
  },
  {
    id: "deep-galaxy",
    name: "Deep Galaxy",
    icon: "🌌",
    background: "0.08 0.03 280",
    card: "0.12 0.04 280",
    primary: "0.72 0.2 300",
    primaryGlow: "0.8 0.18 330",
    accent: "0.78 0.16 200",
    wallpaper: galaxyWp,
    group: "Scenic",
  },
  {
    id: "tropical-paradise",
    name: "Tropical Paradise",
    icon: "🏝️",
    background: "0.15 0.04 50",
    card: "0.19 0.05 45",
    primary: "0.75 0.18 45",
    primaryGlow: "0.82 0.16 60",
    accent: "0.7 0.16 190",
    wallpaper: tropicalWp,
    group: "Scenic",
  },
  {
    id: "aurora-borealis",
    name: "Aurora Borealis",
    icon: "✨",
    background: "0.1 0.03 250",
    card: "0.14 0.04 250",
    primary: "0.72 0.2 160",
    primaryGlow: "0.8 0.18 180",
    accent: "0.75 0.16 200",
    wallpaper: auroraWp,
    group: "Scenic",
  },
  {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    icon: "🌸",
    background: "0.15 0.04 340",
    card: "0.19 0.045 340",
    primary: "0.78 0.18 340",
    primaryGlow: "0.85 0.14 350",
    accent: "0.8 0.14 160",
    wallpaper: cherryWp,
    group: "Scenic",
  },
  {
    id: "mountain-sunrise",
    name: "Mountain Sunrise",
    icon: "🏔️",
    background: "0.13 0.03 30",
    card: "0.17 0.04 30",
    primary: "0.75 0.18 45",
    primaryGlow: "0.82 0.16 55",
    accent: "0.7 0.16 25",
    wallpaper: mountainWp,
    group: "Scenic",
  },
  {
    id: "holo-crystal",
    name: "Holo Crystal",
    icon: "💎",
    background: "0.1 0.03 280",
    card: "0.14 0.04 280",
    primary: "0.75 0.2 300",
    primaryGlow: "0.82 0.18 330",
    accent: "0.78 0.16 200",
    wallpaper: crystalWp,
    group: "Scenic",
  },
  {
    id: "enchanted-forest",
    name: "Enchanted Forest",
    icon: "🌲",
    background: "0.1 0.03 160",
    card: "0.14 0.04 160",
    primary: "0.72 0.18 160",
    primaryGlow: "0.8 0.16 180",
    accent: "0.75 0.18 120",
    wallpaper: enchantedWp,
    group: "Scenic",
  },
];

type ThemeState = {
  presetId: string;
  customPrimary: string | null;
};

type ThemeContextValue = {
  preset: ThemePreset;
  state: ThemeState;
  setPreset: (id: string) => void;
  setCustomPrimary: (oklch: string | null) => void;
  reset: () => void;
  presets: ThemePreset[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "kd-theme-v1";
const DEFAULT_STATE: ThemeState = { presetId: "midnight-violet", customPrimary: null };

function applyTheme(state: ThemeState) {
  if (typeof document === "undefined") return;
  const preset = THEME_PRESETS.find((p) => p.id === state.presetId) ?? THEME_PRESETS[0];
  const root = document.documentElement;
  const isLight = parseFloat(preset.background.split(" ")[0]) > 0.5;

  const primary = state.customPrimary || preset.primary;

  root.style.setProperty("--background", `oklch(${preset.background})`);
  root.style.setProperty("--card", `oklch(${preset.card})`);
  root.style.setProperty("--popover", `oklch(${preset.card})`);
  root.style.setProperty("--secondary", `oklch(${preset.card})`);
  root.style.setProperty("--muted", `oklch(${preset.card})`);
  root.style.setProperty(
    "--foreground",
    isLight ? "oklch(0.15 0.02 280)" : "oklch(0.98 0.005 280)",
  );
  root.style.setProperty(
    "--muted-foreground",
    isLight ? "oklch(0.45 0.02 280)" : "oklch(0.68 0.02 282)",
  );
  root.style.setProperty("--primary", `oklch(${primary})`);
  root.style.setProperty("--primary-glow", `oklch(${preset.primaryGlow})`);
  root.style.setProperty("--ring", `oklch(${primary})`);
  root.style.setProperty("--accent", `oklch(${preset.accent})`);
  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, oklch(${primary}) 0%, oklch(${preset.primaryGlow}) 100%)`,
  );
  root.style.setProperty(
    "--gradient-hero",
    `radial-gradient(ellipse 80% 60% at 50% 0%, oklch(${primary} / 0.25), transparent 70%)`,
  );
  root.style.setProperty("--shadow-glow", `0 0 80px -10px oklch(${primary} / 0.45)`);

  // Wallpaper layer — applied to body as fixed background
  const body = document.body;
  if (body) {
    if (preset.wallpaper) {
      body.style.backgroundImage = `linear-gradient(to bottom, oklch(${preset.background} / 0.78), oklch(${preset.background} / 0.92)), url(${preset.wallpaper})`;
      body.style.backgroundSize = "cover";
      body.style.backgroundPosition = "center";
      body.style.backgroundAttachment = "fixed";
      body.style.backgroundRepeat = "no-repeat";
      body.classList.add("has-wallpaper");
    } else {
      body.style.backgroundImage = "";
      body.style.backgroundSize = "";
      body.style.backgroundPosition = "";
      body.style.backgroundAttachment = "";
      body.style.backgroundRepeat = "";
      body.classList.remove("has-wallpaper");
    }
  }

  if (isLight) {
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(DEFAULT_STATE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ThemeState;
        setState({ ...DEFAULT_STATE, ...parsed });
        applyTheme({ ...DEFAULT_STATE, ...parsed });
        return;
      }
    } catch {}
    applyTheme(DEFAULT_STATE);
  }, []);

  useEffect(() => {
    applyTheme(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const value: ThemeContextValue = {
    state,
    preset: THEME_PRESETS.find((p) => p.id === state.presetId) ?? THEME_PRESETS[0],
    presets: THEME_PRESETS,
    setPreset: (id) => setState((s) => ({ ...s, presetId: id })),
    setCustomPrimary: (oklch) => setState((s) => ({ ...s, customPrimary: oklch })),
    reset: () => setState(DEFAULT_STATE),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
