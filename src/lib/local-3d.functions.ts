import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
