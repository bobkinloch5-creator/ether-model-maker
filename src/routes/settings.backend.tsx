import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Save, Server, CheckCircle2, Loader2, ExternalLink, Power, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BACKEND_PRESETS,
  getBackendConfig,
  saveBackendConfig,
  resolveExtraArgs,
  type BackendConfig,
  type BackendPreset,
} from "@/lib/backend-settings";
import { useAuth } from "@/lib/auth-context";

type ServerStatus = "unknown" | "checking" | "online" | "sleeping" | "starting" | "error";

type ServerState = {
  status: ServerStatus;
  detail?: string;
  checkedAt?: number;
};

async function pingSpace(spaceUrl: string, signal?: AbortSignal): Promise<{ ok: boolean; status: number; detail: string }> {
  const url = spaceUrl.replace(/\/$/, "");
  // Different Gradio versions expose the schema at different paths.
  // Try modern (/gradio_api/info), then legacy (/info), then /config.
  const paths = ["/gradio_api/info", "/info", "/config"];
  let lastStatus = 0;
  for (const p of paths) {
    try {
      const res = await fetch(`${url}${p}`, { method: "GET", signal });
      if (res.ok) return { ok: true, status: res.status, detail: "online" };
      lastStatus = res.status;
      if (res.status === 503) return { ok: false, status: 503, detail: "sleeping" };
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        return { ok: false, status: 0, detail: "aborted" };
      }
      // try next path
    }
  }
  return { ok: false, status: lastStatus, detail: lastStatus ? `HTTP ${lastStatus}` : "unreachable" };
}

function StatusDot({ status }: { status: ServerStatus }) {
  const map: Record<ServerStatus, string> = {
    unknown: "text-muted-foreground",
    checking: "text-sky-400 animate-pulse",
    online: "text-emerald-400",
    sleeping: "text-amber-400",
    starting: "text-amber-400 animate-pulse",
    error: "text-red-400",
  };
  return <Circle className={`w-3 h-3 fill-current ${map[status]}`} />;
}

function hfRestartUrl(spaceUrl: string): string {
  // https://dave1010101-trellis-2.hf.space  ->  https://huggingface.co/spaces/dave1010101/trellis-2/settings
  try {
    const host = new URL(spaceUrl).host; // dave1010101-trellis-2.hf.space
    const sub = host.split(".")[0]; // dave1010101-trellis-2
    const idx = sub.indexOf("-");
    if (idx < 0) return "https://huggingface.co/spaces";
    const user = sub.slice(0, idx);
    const name = sub.slice(idx + 1);
    return `https://huggingface.co/spaces/${user}/${name}`;
  } catch {
    return "https://huggingface.co/spaces";
  }
}

async function openExternalUrl(url: string, label: string) {
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (popup) {
    popup.opener = null;
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.info(`${label} link copied`, {
      description: "Paste it into a new browser tab.",
    });
  } catch {
    toast.error(`Couldn't open ${label.toLowerCase()}`, {
      description: url,
    });
  }
}

function ServersPanel({ isOwner }: { isOwner: boolean }) {
  const [states, setStates] = useState<Record<string, ServerState>>(() =>
    Object.fromEntries(BACKEND_PRESETS.map((p) => [p.id, { status: "unknown" as ServerStatus }]))
  );
  const [busy, setBusy] = useState(false);

  const openExternal = useCallback(async (url: string, label: string) => {
    await openExternalUrl(url, label);
  }, []);

  const checkOne = useCallback(async (preset: BackendPreset) => {
    setStates((s) => ({ ...s, [preset.id]: { ...s[preset.id], status: "checking" } }));
    const r = await pingSpace(preset.spaceUrl);
    setStates((s) => ({
      ...s,
      [preset.id]: {
        status: r.ok ? "online" : r.status === 503 ? "sleeping" : "error",
        detail: r.detail,
        checkedAt: Date.now(),
      },
    }));
    return r.ok;
  }, []);

  const checkAll = useCallback(async () => {
    setBusy(true);
    await Promise.all(BACKEND_PRESETS.map((p) => checkOne(p)));
    setBusy(false);
  }, [checkOne]);

  const wakeOne = useCallback(async (preset: BackendPreset) => {
    const base = preset.spaceUrl.replace(/\/$/, "");
    // Hit multiple endpoints: HF wakes a Space on any inbound request, but
    // hitting the gradio API path is more reliable than the root HTML page.
    const urls = [
      `${base}/`,
      `${base}/gradio_api/info`,
      `${base}/config`,
      `${base}/api/predict`,
    ];
    await Promise.all(
      urls.map((u) =>
        fetch(u, { method: "GET", mode: "no-cors" as RequestMode }).catch(() => {})
      )
    );
  }, []);

  const startAll = useCallback(async () => {
    if (!isOwner) return;
    setBusy(true);
    toast.info("Waking servers…", { description: "This can take 30–90s. Spaces in error state need a manual restart on Hugging Face." });
    setStates((s) => {
      const next = { ...s };
      for (const p of BACKEND_PRESETS) next[p.id] = { ...next[p.id], status: "starting" };
      return next;
    });
    // Fire wake pings to every sleeping Space
    await Promise.all(BACKEND_PRESETS.map((p) => wakeOne(p)));

    // Poll every 8s for up to ~3 min; re-ping any still down at each tick
    let allUp = false;
    for (let i = 0; i < 22; i++) {
      await new Promise((r) => setTimeout(r, 8_000));
      const results = await Promise.all(BACKEND_PRESETS.map((p) => checkOne(p)));
      allUp = results.every(Boolean);
      if (allUp) break;
      // Re-ping the still-down ones to keep nudging HF
      const down = BACKEND_PRESETS.filter((_, idx) => !results[idx]);
      await Promise.all(down.map((p) => wakeOne(p)));
    }
    setBusy(false);
    if (allUp) {
      toast.success("All servers online");
    } else {
      toast.warning("Some Spaces couldn't be woken", {
        description: "They're likely in HF error state — click the Restart link next to each.",
      });
    }
  }, [isOwner, checkOne, wakeOne]);

  useEffect(() => { checkAll(); }, [checkAll]);

  const labelFor = (st: ServerStatus) => ({
    unknown: "Unknown",
    checking: "Checking…",
    online: "Online",
    sleeping: "Sleeping",
    starting: "Starting…",
    error: "Offline",
  })[st];

  return (
    <div className="mb-6 space-y-4 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Server status</h2>
          <p className="text-xs text-muted-foreground">
            Live status of all Hugging Face Spaces. {isOwner ? "Use Start to wake any that are sleeping. Spaces stuck in error need a Restart on HF." : "Only owners can wake sleeping servers."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={checkAll} variant="outline" size="sm" disabled={busy} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Refresh
          </Button>
          {isOwner && (
            <Button onClick={startAll} size="sm" disabled={busy} className="gap-2">
              <Power className="w-4 h-4" />
              Start servers
            </Button>
          )}
        </div>
      </div>

      <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
        {BACKEND_PRESETS.map((p) => {
          const st = states[p.id]?.status ?? "unknown";
          const needsRestart = st === "sleeping" || st === "error";
          return (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex items-center gap-3">
                <StatusDot status={st} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.spaceUrl}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{labelFor(st)}</span>
                {needsRestart && isOwner && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 h-7 px-2 text-xs"
                    title="Open Space page on Hugging Face in a new tab — click 'Restart this Space' there"
                    onClick={() => void openExternal(hfRestartUrl(p.spaceUrl), "Restart")}
                  >
                    Restart on HF <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-7 px-2"
                  onClick={() => void openExternal(p.spaceUrl, p.label)}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LocalServerPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const runTest = useCallback(async () => {
    setBusy(true);
    setResult(null);
    try {
      const { testLocal3DServer } = await import("@/lib/local-3d.functions");
      const res = await testLocal3DServer();
      if (res.ok) {
        setResult({ ok: true, msg: `${res.message}${res.version ? ` (Gradio ${res.version})` : ""}` });
        toast.success("Local 3D server online");
      } else {
        setResult({ ok: false, msg: res.error });
        toast.error("Local 3D server check failed", { description: res.error.slice(0, 220) });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ ok: false, msg });
      toast.error("Local 3D server check failed", { description: msg.slice(0, 220) });
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Local 3D server (ngrok)</h2>
          <p className="text-xs text-muted-foreground">
            Pings <code>LOCAL_3D_API_URL/config</code> to verify your local Gradio Image-to-3D server is reachable.
          </p>
        </div>
        <Button onClick={runTest} size="sm" disabled={busy} className="gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Test Local 3D Server
        </Button>
      </div>
      {result && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            result.ok
              ? "border-green-500/40 bg-green-500/10 text-green-200"
              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          {result.msg}
        </div>
      )}
    </div>
  );
}


export const Route = createFileRoute("/settings/backend")({
  head: () => ({
    meta: [
      { title: "3D Backend Settings — KingDavez Studios" },
      { name: "description", content: "Switch between TripoSR, TRELLIS, Hunyuan3D, and other AI 3D generation backends. Owner-only infrastructure configuration panel." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BackendSettingsPage,
});

function BackendSettingsPage() {
  const { profile, loading: authLoading } = useAuth();
  const isOwner = profile?.is_owner === true;
  const [cfg, setCfg] = useState<BackendConfig>(() => getBackendConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const handleOpenSpace = useCallback(() => {
    if (!cfg.spaceUrl) return;
    void openExternalUrl(cfg.spaceUrl, "Space");
  }, [cfg.spaceUrl]);

  useEffect(() => { setCfg(getBackendConfig()); }, []);

  // Auto-fill the Space URL from the live LOCAL_3D_API_URL secret on first
  // load IF the user hasn't customized it yet (or it's still the old preset
  // default). Saved overrides always win.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getLocal3DUrl } = await import("@/lib/local-3d.functions");
        const res = await getLocal3DUrl();
        if (cancelled || !res.ok || !res.url) return;
        setCfg((c) => {
          const stored = getBackendConfig();
          // Only overwrite when nothing has been explicitly saved for spaceUrl,
          // or the saved URL still matches the original hard-coded preset
          // default (i.e. user hasn't changed it themselves).
          const presetDefault = BACKEND_PRESETS.find((p) => p.id === stored.presetId)?.spaceUrl;
          const untouched = !stored.spaceUrl || stored.spaceUrl === presetDefault;
          if (!untouched) return c;
          const next = { ...c, spaceUrl: res.url };
          saveBackendConfig(next);
          return next;
        });
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Owner access only</h1>
          <p className="text-muted-foreground mb-6">
            This page configures the underlying 3D generation infrastructure and is restricted to the workspace owner.
          </p>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to profile
          </Link>
        </div>
      </div>
    );
  }

  const applyPreset = (id: string) => {
    if (id === "custom") {
      setCfg((c) => ({ ...c, presetId: "custom" }));
      return;
    }
    const p = BACKEND_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setCfg({ presetId: p.id, spaceUrl: p.spaceUrl, apiName: p.apiName, extraArgs: p.extraArgs });
  };

  const save = () => {
    try {
      // validate extraArgs JSON
      if (cfg.extraArgs.trim()) JSON.parse(cfg.extraArgs);
    } catch {
      toast.error("Extra args must be a JSON array, e.g. [256]");
      return;
    }
    saveBackendConfig(cfg);
    toast.success("Backend saved", { description: "Next generation will use this Space." });
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { testGradioSpace } = await import("@/lib/local-3d.functions");
      // Map preset → provider so the test hits the right probe endpoint:
      //   HF presets → /gradio_api/info only (never /config)
      //   ComfyUI    → /system_stats / /queue / /
      //   Local      → /gradio_api/info → /config
      const provider: "hf" | "comfyui" | "local" =
        cfg.presetId === "auto" || cfg.presetId === "stable-fast-3d" || cfg.presetId === "triposr-official" || cfg.presetId === "triposr"
          ? "hf"
          : cfg.presetId === "local-comfyui"
          ? "comfyui"
          : "local";
      const res = await testGradioSpace({
        data: { spaceUrl: cfg.spaceUrl, apiName: cfg.apiName, provider },
      });
      if (res.ok) {
        setTestResult({ ok: true, msg: res.message });
      } else {
        setTestResult({ ok: false, msg: ("error" in res && res.error) ? res.error : ("message" in res ? res.message : "Connection failed") });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : "Connection failed" });
    } finally {
      setTesting(false);
    }
  };

  const activePreset = BACKEND_PRESETS.find((p) => p.id === cfg.presetId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Server className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">3D Backend</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Pick which Hugging Face Space generates your 3D models. Settings are stored on this device.
        </p>

        <ServersPanel isOwner={isOwner} />

        <LocalServerPanel />





        <div className="space-y-6 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur">
          <div className="space-y-2">
            <Label>Preset</Label>
            <Select value={cfg.presetId} onValueChange={applyPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a backend" />
              </SelectTrigger>
              <SelectContent>
                {BACKEND_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
                <SelectItem value="custom">Custom Space…</SelectItem>
              </SelectContent>
            </Select>
            {activePreset && (
              <p className="text-xs text-muted-foreground">{activePreset.notes}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="spaceUrl">Hugging Face Space URL</Label>
            <Input
              id="spaceUrl"
              placeholder="https://username-spacename.hf.space"
              value={cfg.spaceUrl}
              onChange={(e) => setCfg({ ...cfg, spaceUrl: e.target.value, presetId: "custom" })}
            />
            <p className="text-xs text-muted-foreground">
              Either the gradio host (<code>https://user-space.hf.space</code>) or the page URL
              (<code>https://huggingface.co/spaces/user/space</code>).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiName">API endpoint name</Label>
            <Input
              id="apiName"
              placeholder="/generate"
              value={cfg.apiName}
              onChange={(e) => setCfg({ ...cfg, apiName: e.target.value, presetId: "custom" })}
            />
            <p className="text-xs text-muted-foreground">
              Find this in the Space's <strong>Use via API</strong> panel — must start with <code>/</code>.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extraArgs">Extra args (JSON array, optional)</Label>
            <Input
              id="extraArgs"
              placeholder="[256]"
              value={cfg.extraArgs}
              onChange={(e) => setCfg({ ...cfg, extraArgs: e.target.value, presetId: "custom" })}
            />
            <p className="text-xs text-muted-foreground">
              Appended after the image/prompt. Example: <code>[256]</code> for TripoSR mc_resolution.
              {cfg.extraArgs && (
                <> Parsed as: <code>{JSON.stringify(resolveExtraArgs(cfg.extraArgs))}</code></>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={save} className="gap-2">
              <Save className="w-4 h-4" /> Save
            </Button>
            <Button onClick={testConnection} variant="outline" className="gap-2" disabled={testing || !cfg.spaceUrl}>
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Test connection
            </Button>
            {cfg.spaceUrl && (
              <Button type="button" onClick={handleOpenSpace} variant="ghost" className="gap-2">
                Open Space <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>

          {testResult && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                testResult.ok
                  ? "border-green-500/40 bg-green-500/10 text-green-200"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-200"
              }`}
            >
              {testResult.msg}
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          Tip: duplicate a Space under your own account so it doesn't sleep unexpectedly.
        </div>
      </div>
    </div>
  );
}
