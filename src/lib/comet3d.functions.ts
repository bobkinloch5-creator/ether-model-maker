import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * CometAPI Hunyuan3D-2 cloud 3D generation.
 *
 * This runs entirely on CometAPI's servers — the user's PC does NOT need to be
 * on. Supports both text-to-3D (prompt) and image-to-3D (image URL).
 *
 * Secrets:
 *   - COMET_API_KEY  (required)  the sk-... token from cometapi.com
 *   - COMET_BASE_URL (optional)  defaults to https://api.cometapi.com/v1
 */

const INPUT = z.object({
  prompt: z.string().min(1).max(2000).optional(),
  imageDataUrl: z.string().max(15_000_000).optional(),
  kind: z.enum(["text-to-3d", "image-to-3d"]),
});

function getBaseUrl(): string {
  const raw = process.env.COMET_BASE_URL?.trim() || "https://api.cometapi.com/v1";
  return raw.replace(/\/+$/, "");
}

/** Upload a base64 data URL to public storage and return a fetchable URL. */
async function dataUrlToPublicUrl(dataUrl: string, userId: string): Promise<string> {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Please upload a valid image.");
  const mime = m[1];
  if (!/^image\//i.test(mime)) throw new Error("Please upload a valid image.");
  const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const ext = (mime.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "");
  const path = `comet-inputs/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabaseAdmin.storage.from("models").upload(path, bin, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  const { data: pub } = supabaseAdmin.storage.from("models").getPublicUrl(path);
  if (!pub.publicUrl) throw new Error("Could not resolve public image URL");
  return pub.publicUrl;
}

/** Recursively scan an arbitrary JSON value for the first 3D-model file URL. */
function findModelUrl(value: unknown): string | null {
  const isModelUrl = (s: string) =>
    /^https?:\/\//i.test(s) && /\.(glb|gltf|obj|ply|fbx|usdz|zip)(\?|#|$)/i.test(s);

  if (typeof value === "string") {
    return isModelUrl(value) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findModelUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    // Prefer obvious model fields first.
    for (const key of ["model_url", "glb", "glb_url", "file_url", "result_url", "download_url", "url"]) {
      const v = o[key];
      if (typeof v === "string" && isModelUrl(v)) return v;
    }
    for (const v of Object.values(o)) {
      const found = findModelUrl(v);
      if (found) return found;
    }
  }
  return null;
}

/** Find any http(s) URL as a last-resort fallback (e.g. a result link). */
function findAnyUrl(value: unknown): string | null {
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const f = findAnyUrl(item);
      if (f) return f;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const key of ["model_url", "file_url", "result_url", "download_url", "url"]) {
      const v = (value as Record<string, unknown>)[key];
      if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
    }
    for (const v of Object.values(value as Record<string, unknown>)) {
      const f = findAnyUrl(v);
      if (f) return f;
    }
  }
  return null;
}

export const getCometStatus = createServerFn({ method: "GET" }).handler(async () => {
  const configured = !!process.env.COMET_API_KEY?.trim();
  return { configured, provider: "comet-hunyuan3d-2" as const };
});

export const generateComet3D = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const apiKey = process.env.COMET_API_KEY?.trim();
    if (!apiKey) {
      return { ok: false as const, error: "CometAPI is not configured (COMET_API_KEY missing)." };
    }

    try {
      const body: Record<string, unknown> = { model: "Hunyuan3D-2" };
      if (data.kind === "image-to-3d") {
        if (!data.imageDataUrl) {
          return { ok: false as const, error: "Please upload an image first." };
        }
        body.image = await dataUrlToPublicUrl(data.imageDataUrl, userId);
        if (data.prompt) body.prompt = data.prompt;
      } else {
        if (!data.prompt) {
          return { ok: false as const, error: "No prompt provided for text-to-3D." };
        }
        body.prompt = data.prompt;
      }

      const endpoint = `${getBaseUrl()}/images/generations`;
      console.log("[COMET 3D] POST", endpoint, "kind=", data.kind);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(290_000),
      });

      const text = await res.text();
      if (!res.ok) {
        console.error("[COMET 3D] error", res.status, text.slice(0, 500));
        if (res.status === 401 || res.status === 403) {
          return { ok: false as const, error: "CometAPI rejected the API key. Check COMET_API_KEY." };
        }
        if (res.status === 402) {
          return { ok: false as const, error: "CometAPI account is out of credit. Please top up your CometAPI balance." };
        }
        if (res.status === 429) {
          return { ok: false as const, error: "CometAPI is rate-limiting requests. Please wait a moment and try again." };
        }
        return { ok: false as const, error: `CometAPI failed (${res.status}): ${text.slice(0, 300)}` };
      }

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return { ok: false as const, error: `CometAPI returned a non-JSON response: ${text.slice(0, 200)}` };
      }
      console.log("[COMET 3D] response", JSON.stringify(json).slice(0, 600));

      const sourceUrl = findModelUrl(json) || findAnyUrl(json);
      if (!sourceUrl) {
        return { ok: false as const, error: `CometAPI did not return a model URL: ${text.slice(0, 300)}` };
      }

      // Rehost the model to Supabase storage so it survives and serves over CDN.
      let modelUrl = sourceUrl;
      try {
        const fileRes = await fetch(sourceUrl, { signal: AbortSignal.timeout(120_000) });
        if (fileRes.ok) {
          const buf = Buffer.from(await fileRes.arrayBuffer());
          const lower = sourceUrl.toLowerCase();
          const ext = lower.includes(".obj")
            ? "obj"
            : lower.includes(".ply")
            ? "ply"
            : lower.includes(".fbx")
            ? "fbx"
            : lower.includes(".zip")
            ? "zip"
            : "glb";
          const storagePath = `comet-outputs/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
          const { error: upErr } = await supabaseAdmin.storage.from("models").upload(storagePath, buf, {
            contentType: ext === "glb" ? "model/gltf-binary" : "application/octet-stream",
            upsert: false,
          });
          if (!upErr) {
            const { data: pub } = supabaseAdmin.storage.from("models").getPublicUrl(storagePath);
            if (pub.publicUrl) modelUrl = pub.publicUrl;
          } else {
            console.warn("[COMET 3D] storage upload failed, using source URL:", upErr.message);
          }
        } else {
          console.warn("[COMET 3D] model fetch failed, using source URL:", fileRes.status);
        }
      } catch (rehostErr) {
        console.warn("[COMET 3D] rehost threw, using source URL:", rehostErr);
      }

      return { ok: true as const, modelUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === "TimeoutError") {
        return { ok: false as const, error: "CometAPI took too long to generate the model. Please try again." };
      }
      console.error("[COMET 3D] threw:", message);
      return { ok: false as const, error: message };
    }
  });
