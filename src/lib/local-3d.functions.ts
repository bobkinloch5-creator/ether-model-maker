import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Owner-only: returns the configured LOCAL_3D_API_URL secret so the
 * backend-settings form can auto-fill with the live ngrok URL.
 */
export const getLocal3DUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "owner")
      .maybeSingle();
    if (!roleRow) return { ok: false as const, error: "Forbidden" };
    const url = process.env.LOCAL_3D_API_URL?.trim().replace(/\/+$/, "") || "";
    return { ok: true as const, url };
  });

/**
 * Owner-only health check for the local Image-to-3D server.
 * Hits `${LOCAL_3D_API_URL}/config` and verifies it returns Gradio JSON.
 *
 * The `/config` path is appended here — the env var must contain only the
 * base URL (e.g. https://mower-habitant-latitude.ngrok-free.dev), no path.
 */
export const testLocal3DServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Owner check via user_roles
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "owner")
      .maybeSingle();
    if (!roleRow) {
      return { ok: false as const, error: "Forbidden: owner only" };
    }

    const base = process.env.LOCAL_3D_API_URL?.trim().replace(/\/+$/, "");
    if (!base) {
      return { ok: false as const, error: "LOCAL_3D_API_URL is not set" };
    }

    let parsed: URL;
    try {
      parsed = new URL(base);
    } catch {
      return { ok: false as const, error: `Invalid LOCAL_3D_API_URL: ${base}` };
    }
    if (parsed.protocol !== "https:") {
      return { ok: false as const, error: "LOCAL_3D_API_URL must use https" };
    }

    const url = `${base}/config`;
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      // ngrok free tier injects an interstitial unless this header is present.
      const res = await fetch(url, {
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true", Accept: "application/json" },
        signal: ctl.signal,
      });
      clearTimeout(timer);

      const text = await res.text();
      if (!res.ok) {
        return {
          ok: false as const,
          error: `HTTP ${res.status} from ${url}: ${text.slice(0, 240)}`,
        };
      }

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return {
          ok: false as const,
          error: `Non-JSON response from ${url} (got ${text.slice(0, 120)}…)`,
        };
      }

      const o = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
      const looksGradio =
        "version" in o ||
        "components" in o ||
        "dependencies" in o ||
        "app_id" in o ||
        "root" in o;
      if (!looksGradio) {
        return {
          ok: false as const,
          error: `Reachable but ${url} did not return Gradio JSON`,
        };
      }

      return {
        ok: true as const,
        url,
        version: typeof o.version === "string" ? (o.version as string) : null,
        message: "Local 3D server online.",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false as const, error: `Failed to reach ${url}: ${msg}` };
    }
  });

/**
 * Owner-only generic Gradio Space connection test.
 * Proxies the request server-side so we can attach `ngrok-skip-browser-warning`
 * (browsers can't include it cross-origin without CORS preflight pain) and
 * dodge mixed-content / CORS rejections.
 */
export const testGradioSpace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { spaceUrl: string; apiName?: string }) => input)
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "owner")
      .maybeSingle();
    if (!roleRow) return { ok: false as const, error: "Forbidden: owner only" };

    const base = (data.spaceUrl || "").trim().replace(/\/+$/, "");
    if (!base) return { ok: false as const, error: "Space URL is required" };
    let parsed: URL;
    try { parsed = new URL(base); } catch { return { ok: false as const, error: `Invalid URL: ${base}` }; }
    if (parsed.protocol !== "https:") return { ok: false as const, error: "URL must use https" };

    const headers = { "ngrok-skip-browser-warning": "true", Accept: "application/json" };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10_000);

    try {
      // Try /gradio_api/info first (HF Spaces), fall back to /config (local Gradio).
      let res = await fetch(`${base}/gradio_api/info`, { headers, signal: ctl.signal }).catch(() => null);
      let usedPath = "/gradio_api/info";
      if (!res || !res.ok) {
        usedPath = "/config";
        res = await fetch(`${base}/config`, { headers, signal: ctl.signal });
      }
      clearTimeout(timer);

      const text = await res.text();
      if (!res.ok) {
        return { ok: false as const, error: `HTTP ${res.status} from ${base}${usedPath}: ${text.slice(0, 220)}` };
      }
      let json: any;
      try { json = JSON.parse(text); } catch {
        return { ok: false as const, error: `Non-JSON response from ${base}${usedPath}` };
      }

      const apiName = data.apiName?.trim();
      // Collect endpoint names from either shape
      const namedEndpoints = json?.named_endpoints && typeof json.named_endpoints === "object"
        ? Object.keys(json.named_endpoints) : [];
      const deps = Array.isArray(json?.dependencies) ? json.dependencies : [];
      const depNames = deps
        .map((d: any) => (typeof d?.api_name === "string" ? (d.api_name.startsWith("/") ? d.api_name : `/${d.api_name}`) : null))
        .filter(Boolean) as string[];
      const endpoints = Array.from(new Set([...namedEndpoints, ...depNames]));

      if (apiName) {
        const has = endpoints.includes(apiName);
        return {
          ok: has,
          message: has
            ? `Connected. Found ${endpoints.length} endpoints, including ${apiName}.`
            : `Server is up but ${apiName} not found. Available: ${endpoints.join(", ") || "(none)"}`,
          endpoints,
        } as const;
      }
      return { ok: true as const, message: `Connected. Found ${endpoints.length} endpoints.`, endpoints };
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false as const, error: `Failed to reach ${base}: ${msg}` };
    }
  });
