export type BackendPreset = {
  id: string;
  label: string;
  spaceUrl: string;
  apiName: string;
  extraArgs: string; // JSON string, e.g. "[256]"
  notes: string;
};

export const BACKEND_PRESETS: BackendPreset[] = [
  {
    id: "triposr",
    label: "TripoSR (fast, image-to-3D)",
    spaceUrl: "https://dave1010101-dust3r-triposr.hf.space",
    apiName: "/generate",
    extraArgs: "[256]",
    notes: "Fastest. Image-to-3D only. mc_resolution=256.",
  },
  {
    id: "trellis-3d-api",
    label: "TRELLIS 3D API (dave1010101)",
    spaceUrl: "https://dave1010101-trellis-3d-api.hf.space",
    apiName: "/handle_image_to_3d",
    extraArgs: "",
    notes: "New TRELLIS API Space. Image-to-3D (requires 18 parameters).",
  },
];

export type BackendConfig = {
  presetId: string; // "custom" or one of BACKEND_PRESETS ids
  spaceUrl: string;
  apiName: string;
  extraArgs: string; // JSON string
};

const STORAGE_KEY = "kd_backend_config_v1";
const DEFAULT_PRESET = BACKEND_PRESETS[0];

export function getBackendConfig(): BackendConfig {
  if (typeof window === "undefined") {
    return {
      presetId: DEFAULT_PRESET.id,
      spaceUrl: DEFAULT_PRESET.spaceUrl,
      apiName: DEFAULT_PRESET.apiName,
      extraArgs: DEFAULT_PRESET.extraArgs,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BackendConfig>;
      return {
        presetId: parsed.presetId || DEFAULT_PRESET.id,
        spaceUrl: parsed.spaceUrl || DEFAULT_PRESET.spaceUrl,
        apiName: parsed.apiName || DEFAULT_PRESET.apiName,
        extraArgs: parsed.extraArgs ?? DEFAULT_PRESET.extraArgs,
      };
    }
  } catch { /* ignore */ }
  return {
    presetId: DEFAULT_PRESET.id,
    spaceUrl: DEFAULT_PRESET.spaceUrl,
    apiName: DEFAULT_PRESET.apiName,
    extraArgs: DEFAULT_PRESET.extraArgs,
  };
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
