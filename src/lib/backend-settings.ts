export type BackendPreset = {
  id: string;
  label: string;
  spaceUrl: string;
  apiName: string;
  extraArgs: string; // JSON string
  notes: string;
};

// Provider priority (default = "auto"):
//   1. Hugging Face TripoSR (RBX-CREATOR/3DGenTripoSR) — free, always available
//   2. Local TripoSR (only if LOCAL_TRIPOSR_ENABLED=true)
//   3. Local ComfyUI (only if LOCAL_3D_ENABLED=true)
export const BACKEND_PRESETS: BackendPreset[] = [
  {
    id: "auto",
    label: "Auto Free (Hugging Face TripoSR)",
    spaceUrl: "https://rbx-creator-3dgentriposr.hf.space",
    apiName: "/generate",
    extraArgs: "",
    notes:
      "Free cloud generation via Hugging Face. No paid APIs, no local PC required. Falls back to local providers only if explicitly enabled in secrets.",
  },
  {
    id: "triposr",
    label: "Hugging Face TripoSR (RBX-CREATOR/3DGenTripoSR)",
    spaceUrl: "https://rbx-creator-3dgentriposr.hf.space",
    apiName: "/generate",
    extraArgs: "",
    notes:
      "Free cloud Space. Image-to-3D only. The Space may need ~30s to wake from sleep on first use.",
  },
  {
    id: "local-triposr",
    label: "Local TripoSR (optional)",
    spaceUrl: "",
    apiName: "/generate",
    extraArgs: "",
    notes:
      "Your own GPU running TripoSR. Only used when LOCAL_TRIPOSR_ENABLED=true. Set LOCAL_TRIPOSR_URL to your tunnel URL.",
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
      if (known && (known.id === "local-triposr" || known.id === "local-comfyui")) {
        return {
          presetId: known.id,
          spaceUrl: "",
          apiName: known.apiName,
          extraArgs: known.extraArgs,
        };
      }
      if (known?.id === "auto") {
        return {
          presetId: "auto",
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
