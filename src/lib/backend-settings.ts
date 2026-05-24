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
    spaceUrl: "", // empty → server resolves via LOCAL_3D_API_URL secret
    apiName: "/generate",
    extraArgs: "",
    notes:
      "TRELLIS-style /preprocess → /generate pipeline. Set the LOCAL_3D_API_URL secret to your live tunnel URL (e.g. ngrok / Cloudflare Tunnel).",
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
      const known = BACKEND_PRESETS.find((p) => p.id === parsed.presetId);
      // If the saved preset id is no longer in our list (e.g. we added/renamed
      // presets), keep the user's saved spaceUrl/apiName/extraArgs intact and
      // mark it as "custom" rather than wiping their config.
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
