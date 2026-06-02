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
  // Speed levers. texture=false skips the expensive Hunyuan3D-Paint stage
  // (much faster, returns a bare mesh). faceCount caps geometry density —
  // lower = faster generation + lighter file (good for Second Life upload).
  texture: z.boolean().optional(),
  faceCount: z.number().int().min(1000).max(300000).optional(),
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

      // Speed levers. Only send when explicitly set so we don't override
      // Comet's sensible defaults. Skipping texture is the single biggest
      // time saving (it bypasses the Hunyuan3D-Paint stage entirely).
      if (typeof data.texture === "boolean") body.texture = data.texture;
      if (typeof data.faceCount === "number") body.face_count = data.faceCount;

      const endpoint = `${getBaseUrl()}/images/generations`;
      console.log("[COMET 3D] POST", endpoint, "kind=", data.kind);

      // CometAPI fronts Hunyuan3D with a Cloudflare gateway that can return
      // 524/502/503. We retry transient errors, but with two hard guards so a
      // slow service can never make the user wait forever:
      //   1. OVERALL_DEADLINE caps total wall-clock across ALL attempts.
      //   2. We only retry an error that came back FAST. A 524 after a long
      //      hang means the job is genuinely slow — retrying just repeats the
      //      wait, so we give up and report it instead.
      const TRANSIENT = new Set([429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);
      const PER_ATTEMPT_TIMEOUT = 240_000; // 4 min cap per single attempt
      const OVERALL_DEADLINE = Date.now() + 300_000; // 5 min total, hard ceiling
      const FAST_FAIL_MS = 20_000; // only retry errors that arrive within 20s
      const MAX_ATTEMPTS = 4;
      let res: Response | null = null;
      let text = "";
      let lastTransientStatus = 0;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const remaining = OVERALL_DEADLINE - Date.now();
        if (remaining <= 0) break; // out of total budget
        const attemptStarted = Date.now();
        try {
          res = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(Math.min(PER_ATTEMPT_TIMEOUT, remaining)),
          });
        } catch (fetchErr) {
          // Network/timeout failure. Only retry if it failed FAST and we still
          // have budget — a slow timeout means the job itself is slow.
          const elapsed = Date.now() - attemptStarted;
          if (attempt < MAX_ATTEMPTS && elapsed < FAST_FAIL_MS && Date.now() < OVERALL_DEADLINE) {
            console.warn(`[COMET 3D] fetch threw fast (attempt ${attempt}, ${elapsed}ms), retrying`, fetchErr);
            await new Promise((r) => setTimeout(r, 1500 * attempt));
            continue;
          }
          throw fetchErr;
        }

        text = await res.text();
        if (res.ok) break;

        const elapsed = Date.now() - attemptStarted;
        const fastFail = elapsed < FAST_FAIL_MS;
        if (TRANSIENT.has(res.status) && attempt < MAX_ATTEMPTS && fastFail && Date.now() < OVERALL_DEADLINE) {
          lastTransientStatus = res.status;
          console.warn(
            `[COMET 3D] transient ${res.status} after ${elapsed}ms (attempt ${attempt}/${MAX_ATTEMPTS}), retrying`,
            text.slice(0, 200)
          );
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        break; // non-transient error, slow failure, or out of attempts/budget
      }

      if (!res) {
        return { ok: false as const, error: "CometAPI could not be reached. Please try again." };
      }

      if (!res.ok) {
        console.error("[COMET 3D] error", res.status, text.slice(0, 500));
        const lower = text.toLowerCase();
        if (res.status === 401 || res.status === 403) {
          return { ok: false as const, error: "CometAPI rejected the API key. Check COMET_API_KEY." };
        }
        // Quota / billing — CometAPI returns these as 402 OR as a 200/4xx body
        // containing "quota"/"insufficient". Detect the message too.
        if (
          res.status === 402 ||
          lower.includes("quota") ||
          lower.includes("insufficient") ||
          lower.includes("out of credit") ||
          lower.includes("balance")
        ) {
          return {
            ok: false as const,
            error:
              "CometAPI model quota reached / out of credit. Your plan's baseline quota refreshes on its renewal date, or you can top up your CometAPI balance at cometapi.com to continue now.",
          };
        }
        if (res.status === 429) {
          return { ok: false as const, error: "CometAPI is rate-limiting requests. Please wait a moment and try again." };
        }
        if (TRANSIENT.has(res.status)) {
          return {
            ok: false as const,
            error:
              `CometAPI's gateway timed out (${res.status}) before Hunyuan3D finished. This is a connection limit on their side — the 3D job can take longer than their gateway allows, especially with textures on. Try again, or turn texture OFF for a faster, more reliable result.`,
          };
        }
        return { ok: false as const, error: `CometAPI failed (${res.status}): ${text.slice(0, 300)}` };
      }

      void lastTransientStatus;

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

      // Rehost the model to Supabase storage so it survives and serves over
      // CDN (Comet's result URLs can expire). Capped tightly: if the rehost is
      // slow we fall back to the source URL rather than make the user wait.
      let modelUrl = sourceUrl;
      try {
        const fileRes = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
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
