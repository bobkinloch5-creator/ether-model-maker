export type BackendPreset = {
  id: string;
  label: string;
  spaceUrl: string;
  apiName: string;
  extraArgs: string; // JSON string
  notes: string;
};

export const BACKEND_PRESETS: BackendPreset[] = [
  {
    id: "local3d",
    label: "Local 3D API (TRELLIS pipeline)",
    spaceUrl: "https://gdtharusha-3d-modle-generator.hf.space",
    apiName: "/generate",
    extraArgs: "",
    notes:
      "TRELLIS-style /preprocess → /generate pipeline. Override at runtime via the LOCAL_3D_API_URL secret (e.g. your Cloudflare Tunnel).",
  },
];

export type BackendConfig = {
  presetId: string;
  spaceUrl: string;
  apiName: string;
  extraArgs: string;
};

const STORAGE_KEY = "kd_backend_config_v1";
const DEFAULT_PRESET = BACKEND_PRESETS[0];

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
      // Migrate any older preset/custom selection to Pixal3D — it's the only
      // supported backend now.
      const known = BACKEND_PRESETS.find((p) => p.id === parsed.presetId);
      if (!known) return defaults();
      return {
        presetId: known.id,
        spaceUrl: parsed.spaceUrl || known.spaceUrl,
        apiName: parsed.apiName || known.apiName,
        extraArgs: parsed.extraArgs ?? known.extraArgs,
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
