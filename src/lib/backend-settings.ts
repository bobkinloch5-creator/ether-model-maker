export type BackendPreset = {
  id: string;
  label: string;
  spaceUrl: string;
  apiName: string;
  extraArgs: string; // JSON string
  notes: string;
};

// Provider priority (default = "auto"):
//   1. Stable Fast 3D (stabilityai/stable-fast-3d) — DEFAULT cloud provider
//   2. Official TripoSR (stabilityai/TripoSR)       — explicit override only
//   3. RBX-CREATOR/3DGenTripoSR                     — explicit override only
//   4. Local ComfyUI (only if LOCAL_3D_ENABLED=true)
export const BACKEND_PRESETS: BackendPreset[] = [
  {
    id: "auto",
    label: "Auto (Stable Fast 3D)",
    spaceUrl: "https://stabilityai-stable-fast-3d.hf.space",
    apiName: "/run_button",
    extraArgs: "",
    notes:
      "Default cloud generation via Stability AI's Stable Fast 3D Space on Hugging Face. Image-to-3D only. Requires HF_TOKEN and accepted model terms on Hugging Face.",
  },
  {
    id: "stable-fast-3d",
    label: "Stable Fast 3D (stabilityai/stable-fast-3d)",
    spaceUrl: "https://stabilityai-stable-fast-3d.hf.space",
    apiName: "/run_button",
    extraArgs: "",
    notes:
      "Stability AI's official Stable Fast 3D Space. Image-to-3D, returns GLB. Gated — accept terms on the Space page first.",
  },
  {
    id: "triposr-official",
    label: "TripoSR (stabilityai/TripoSR)",
    spaceUrl: "https://stabilityai-triposr.hf.space",
    apiName: "/generate",
    extraArgs: "",
    notes:
      "Stability AI's official TripoSR Space. Use only if it's confirmed running.",
  },
  {
    id: "triposr",
    label: "RBX-CREATOR/3DGenTripoSR",
    spaceUrl: "https://rbx-creator-3dgentriposr.hf.space",
    apiName: "/generate",
    extraArgs: "",
    notes:
      "Personal TripoSR Space. May need ~30s to wake from sleep on first use.",
  },
  {
    id: "local-comfyui",
    label: "Local ComfyUI (optional)",
    spaceUrl: "",
    apiName: "/generate",
    extraArgs: "",
    notes:
      "Your own ComfyUI server. Only used when LOCAL_3D_ENABLED=true. Set COMFYUI_URL or LOCAL_3D_API_URL.",
  },
  {
    id: "local-pc-triposr",
    label: "Local PC TripoSR",
    spaceUrl: "",
    apiName: "/generate-3d",
    extraArgs: "",
    notes:
      "Use your own local TripoSR server exposed over Cloudflare Tunnel. Set LOCAL_3D_API_URL and LOCAL_3D_API_KEY in environment secrets.",
  },
  {
    id: "dataoorts_orion",
    label: "Dataoorts Orion / GPU Cloud",
    spaceUrl: "",
    apiName: "/run_button",
    extraArgs: "",
    notes:
      "Dataoorts Orion GPU server. Configured via DATAOORTS_3D_API_URL and DATAOORTS_3D_API_KEY environment variables.",
  },
];

export type BackendConfig = {
  presetId: string;
  spaceUrl: string;
  apiName: string;
  extraArgs: string;
};

const STORAGE_KEY = "kd_backend_config_v2";
const DEFAULT_PRESET = BACKEND_PRESETS[0]; // "auto"

function defaults(): BackendConfig {
  return {
    presetId: DEFAULT_PRESET.id,
    spaceUrl: DEFAULT_PRESET.spaceUrl,
    apiName: DEFAULT_PRESET.apiName,
    extraArgs: DEFAULT_PRESET.extraArgs,
  };
}

export function getBackendConfig(): BackendConfig {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BackendConfig>;
      const known = BACKEND_PRESETS.find((p) => p.id === parsed.presetId);
      if (known && (known.id === "local-comfyui" || known.id === "local-pc-triposr")) {
        return {
          presetId: known.id,
          spaceUrl: "",
          apiName: known.apiName,
          extraArgs: known.extraArgs,
        };
      }
      if (known && known.id === "dataoorts_orion") {
        return {
          presetId: known.id,
          spaceUrl: parsed.spaceUrl || "",
          apiName: parsed.apiName || known.apiName,
          extraArgs: parsed.extraArgs ?? known.extraArgs,
        };
      }
      if (known && (known.id === "auto" || known.id === "stable-fast-3d" || known.id === "triposr-official" || known.id === "triposr")) {
        return {
          presetId: known.id,
          spaceUrl: known.spaceUrl,
          apiName: known.apiName,
          extraArgs: known.extraArgs,
        };
      }
      return {
        presetId: known?.id ?? "custom",
        spaceUrl: parsed.spaceUrl || known?.spaceUrl || DEFAULT_PRESET.spaceUrl,
        apiName: parsed.apiName || known?.apiName || DEFAULT_PRESET.apiName,
        extraArgs: parsed.extraArgs ?? known?.extraArgs ?? DEFAULT_PRESET.extraArgs,
      };
    }
  } catch { /* ignore */ }
  return defaults();
}

export function saveBackendConfig(cfg: BackendConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function resolveExtraArgs(extraArgsJson: string): unknown[] {
  const raw = extraArgsJson?.trim();
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [v];
  } catch {
    return [];
  }
}
