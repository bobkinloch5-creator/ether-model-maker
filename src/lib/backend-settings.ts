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
    label: "ComfyUI / Local 3D server",
    spaceUrl: "", // empty → server resolves via LOCAL_3D_API_URL / COMFYUI_URL secret
    apiName: "/generate",
    extraArgs: "",
    notes:
      "Your own GPU. TRELLIS / TripoSR / Stable-Fast-3D pipeline at /preprocess → /generate. Set the LOCAL_3D_API_URL (or COMFYUI_URL) secret to your live tunnel URL (ngrok / Cloudflare Tunnel).",
  },
  {
    id: "triposr",
    label: "Hugging Face TripoSR (AleenDG/3DGenTripoSR)",
    spaceUrl: "https://aleendg-3dgentriposr.hf.space",
    apiName: "/generate",
    extraArgs: "",
    notes:
      "Cloud fallback. Hosted Hugging Face Space — slower than local but always available. The Space may need ~30s to wake from sleep.",
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
      // For the local3d preset, always use the empty spaceUrl so the server
      // resolves it from the LOCAL_3D_API_URL secret. This also clears any
      // stale hardcoded URL saved from a previous version.
      if (known?.id === "local3d") {
        return {
          presetId: "local3d",
          spaceUrl: "",
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
