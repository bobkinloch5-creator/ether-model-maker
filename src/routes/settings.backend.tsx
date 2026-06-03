import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Save, Server, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
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
} from "@/lib/backend-settings";
import { useAuth } from "@/lib/auth-context";

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
        setResult({
          ok: true,
          msg: `${res.message}${res.version ? ` (Gradio ${res.version})` : ""}`,
        });
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
            Pings <code>LOCAL_3D_API_URL/config</code> or <code>LOCAL_3D_API_URL/health</code> to
            verify your local 3D server is reachable.
          </p>
        </div>
        <Button onClick={runTest} size="sm" disabled={busy} className="gap-2">
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
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
      { title: "3D Backend Settings — KingDavez Studios (Beta)" },
      {
        name: "description",
        content:
          "Switch between TripoSR, TRELLIS, Hunyuan3D, and other AI 3D generation backends. Owner-only infrastructure configuration panel.",
      },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "twitter:description",
        content: "Owner-only 3D generation backend configuration panel.",
      },
      { name: "twitter:title", content: "Backend Settings — KingDavez Studios" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://kingdavez.click/settings/backend" },
      {
        property: "og:description",
        content: "Owner-only 3D generation backend configuration panel.",
      },
      { property: "og:title", content: "Backend Settings — KingDavez Studios" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/settings/backend" }],
  }),
  component: BackendSettingsPage,
});

function BackendSettingsPage() {
  const { profile, session, loading: authLoading } = useAuth();
  const isOwner = profile?.is_owner === true;
  const [cfg, setCfg] = useState<BackendConfig>(() => getBackendConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const handleOpenSpace = useCallback(() => {
    if (!cfg.spaceUrl) return;
    void openExternalUrl(cfg.spaceUrl, "Space");
  }, [cfg.spaceUrl]);

  useEffect(() => {
    setCfg(getBackendConfig());
  }, []);

  // Auto-fill the Space URL from the live LOCAL_3D_API_URL secret. Gated on
  // `session` so the server fn call goes out with a bearer token — otherwise
  // requireSupabaseAuth 401s on first render before the session hydrates.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const { getLocal3DUrl } = await import("@/lib/local-3d.functions");
        const res = await getLocal3DUrl();
        if (cancelled || !res.ok || !res.url) return;
        setCfg((c) => {
          const stored = getBackendConfig();
          const presetDefault = BACKEND_PRESETS.find((p) => p.id === stored.presetId)?.spaceUrl;
          const untouched = !stored.spaceUrl || stored.spaceUrl === presetDefault;
          if (!untouched) return c;
          const next = { ...c, spaceUrl: res.url };
          saveBackendConfig(next);
          return next;
        });
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

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
            This page configures the underlying 3D generation infrastructure and is restricted to
            the workspace owner.
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
        cfg.presetId === "auto" ||
        cfg.presetId === "stable-fast-3d" ||
        cfg.presetId === "triposr-official" ||
        cfg.presetId === "triposr"
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
        setTestResult({
          ok: false,
          msg:
            "error" in res && res.error
              ? res.error
              : "message" in res
                ? res.message
                : "Connection failed",
        });
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
          Connect your own local TripoSR server via an ngrok / Cloudflare tunnel. Settings are
          stored on this device.
        </p>

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
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Space…</SelectItem>
              </SelectContent>
            </Select>
            {activePreset && <p className="text-xs text-muted-foreground">{activePreset.notes}</p>}
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
              Either the gradio host (<code>https://user-space.hf.space</code>) or the page URL (
              <code>https://huggingface.co/spaces/user/space</code>).
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
              Find this in the Space's <strong>Use via API</strong> panel — must start with{" "}
              <code>/</code>.
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
              Appended after the image/prompt. Example: <code>[256]</code> for TripoSR
              mc_resolution.
              {cfg.extraArgs && (
                <>
                  {" "}
                  Parsed as: <code>{JSON.stringify(resolveExtraArgs(cfg.extraArgs))}</code>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={save} className="gap-2">
              <Save className="w-4 h-4" /> Save
            </Button>
            <Button
              onClick={testConnection}
              variant="outline"
              className="gap-2"
              disabled={testing || !cfg.spaceUrl}
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
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
