export type BackendPreset = {
  id: string;
  label: string;
  spaceUrl: string;
  apiName: string;
  extraArgs: string; // JSON string
  notes: string;
};

// Only one provider: the user's own local TripoSR server, exposed via
// Cloudflare/ngrok tunnel and configured through LOCAL_3D_API_URL + LOCAL_3D_API_KEY.
export const BACKEND_PRESETS: BackendPreset[] = [
  {
    id: "local-pc-triposr",
    label: "Local PC TripoSR",
    spaceUrl: "",
    apiName: "/generate-3d",
    extraArgs: "",
    notes:
      "Use your own local TripoSR server exposed over an ngrok / Cloudflare Tunnel. Set LOCAL_3D_API_URL and LOCAL_3D_API_KEY in environment secrets.",
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
