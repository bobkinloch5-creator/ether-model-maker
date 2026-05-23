import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Client, handle_file } from "@gradio/client";

/**
 * Calls a Hugging Face Gradio Space to generate a 3D model.
 *
 * Required secrets:
 *   - HF_SPACE_URL: e.g. https://your-user-triposr.hf.space
 *   - HF_API_NAME:  e.g. "/generate" (the named Gradio endpoint — check the Space's "Use via API")
 *   - HF_TOKEN:     optional, only for private Spaces
 *
 * The Space's endpoint must return a file (a GLB/OBJ) as one of its outputs.
 */

const INPUT = z.object({
  prompt: z.string().min(1).max(2000).optional(),
  imageDataUrl: z.string().max(15_000_000).optional(),
  kind: z.enum(["text-to-3d", "image-to-3d"]),
  // Optional per-call overrides from the client (settings page)
  spaceUrl: z.string().url().max(500).optional(),
  apiName: z.string().min(1).max(200).optional(),
  extraArgs: z.array(z.unknown()).max(20).optional(),
});

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string; filename: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Invalid image data URL");
  const mime = m[1];
  const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const ext = mime.split("/")[1] || "png";
  const filename = `input.${ext}`;
  const blob = new Blob([bin], { type: mime });
  return { blob, mime, filename };
}

function buildPayload(apiName: string, firstInput: unknown, extraArgs: unknown[]): unknown[] {
  const normApi = apiName.toLowerCase();
  if (normApi.includes("handle_image_to_3d") || normApi.includes("handle_text_to_3d")) {
    // Trellis requires 18 positional arguments in Gradio array
    const defaultArgs = [
      0,      // seed
      true,   // randomize_seed
      "512",  // resolution
      7.5,    // ss_guidance_strength
      0.0,    // ss_guidance_rescale
      12,     // ss_sampling_steps
      0.0,    // ss_rescale_t
      7.5,    // shape_slat_guidance_strength
      0.0,    // shape_slat_guidance_rescale
      12,     // shape_slat_sampling_steps
      0.0,    // shape_slat_rescale_t
      7.5,    // tex_slat_guidance_strength
      0.0,    // tex_slat_guidance_rescale
      12,     // tex_slat_sampling_steps
      0.0,    // tex_slat_rescale_t
      30000,  // decimation_target
      1024,   // texture_size
    ];
    
    const mergedArgs = [...extraArgs];
    for (let i = mergedArgs.length; i < defaultArgs.length; i++) {
      mergedArgs.push(defaultArgs[i]);
    }
    return [firstInput, ...mergedArgs];
  }
  return [firstInput, ...extraArgs];
}

async function gradioCall(
  spaceUrl: string,
  apiName: string,
  payload: unknown[],
  token?: string
): Promise<unknown[]> {
  try {
    console.log(`[HF 3D] Connecting to Space: ${spaceUrl} (API: ${apiName})`);
    const app = await Client.connect(spaceUrl, { token });
    console.log(`[HF 3D] Connected successfully. Invoking prediction...`);
    
    const firstInput = payload[0];
    const extraArgs = payload.slice(1);
    const finalPayload = buildPayload(apiName, firstInput, extraArgs);
    
    console.log(`[HF 3D] Payload size: ${finalPayload.length}`);
    const result = await app.predict(apiName, finalPayload);
    console.log(`[HF 3D] Prediction succeeded. Output data:`, JSON.stringify(result.data).slice(0, 300));
    return result.data as unknown[];
  } catch (err: any) {
    console.error(`[HF 3D] Error in gradioCall for Space ${spaceUrl} (${apiName}):`, err);
    throw new Error(`HF Space call failed: ${err?.message || String(err)}`);
  }
}

function extractFileUrl(spaceUrl: string, output: unknown): string | null {
  // Gradio file outputs come as { path, url } or { name, data } or a plain url string
  if (!output) return null;
  if (typeof output === "string") {
    if (output.startsWith("http")) return output;
    if (output.startsWith("/")) return `${spaceUrl}${output}`;
    return null;
  }
  if (typeof output === "object") {
    const o = output as Record<string, unknown>;
    if (typeof o.url === "string") return o.url as string;
    if (typeof o.path === "string") return `${spaceUrl}/gradio_api/file=${o.path}`;
    if (typeof o.name === "string") return `${spaceUrl}/gradio_api/file=${o.name}`;
  }
  return null;
}

async function uploadDataUrlToGradio(
  spaceUrl: string,
  dataUrl: string,
  token?: string
): Promise<{ path: string; orig_name: string; mime_type: string }> {
  // data:image/png;base64,XXXX
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Invalid image data URL");
  const mime = m[1];
  const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const ext = mime.split("/")[1] || "png";
  const filename = `input.${ext}`;

  const form = new FormData();
  form.append("files", new Blob([bin], { type: mime }), filename);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${spaceUrl}/gradio_api/upload`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Gradio upload failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const paths = (await res.json()) as string[];
  if (!paths?.[0]) throw new Error("Gradio upload returned no path");
  return { path: paths[0], orig_name: filename, mime_type: mime };
}

export const generateHF3D = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const envSpaceId = process.env.HF_3D_SPACE_ID?.trim() || process.env.HF_SPACE_URL?.trim();
    const envApiName = process.env.HF_3D_API_NAME?.trim() || process.env.HF_API_NAME?.trim();
    const token = process.env.HF_TOKEN?.trim();

    const rawUrl = data.spaceUrl?.trim() || envSpaceId || "";
    if (!rawUrl) {
      return { ok: false as const, error: "HF_SPACE_URL not configured" };
    }
    // Normalize: if user pasted huggingface.co/spaces/<user>/<name>, convert to the gradio host
    let spaceUrl = rawUrl.replace(/\/$/, "");
    const hfMatch = spaceUrl.match(/huggingface\.co\/spaces\/([^/]+)\/([^/?#]+)/i);
    if (hfMatch) {
      const user = hfMatch[1].toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const name = hfMatch[2].toLowerCase().replace(/[^a-z0-9-]/g, "-");
      spaceUrl = `https://${user}-${name}.hf.space`;
    }
    try {
      spaceUrl = assertSafeSpaceUrl(spaceUrl);
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Invalid Space URL" };
    }

    const apiName = data.apiName?.trim() || envApiName || "/predict";

    // 1. Health check before connection
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 4000);
      const healthRes = await fetch(`${spaceUrl}/gradio_api/info`, { signal: ctl.signal });
      clearTimeout(t);
      if (!healthRes.ok) {
        return { ok: false as const, error: `Space health check failed (HTTP ${healthRes.status})` };
      }
    } catch (e: any) {
      return { ok: false as const, error: `Space health check failed: ${e?.message || String(e)}` };
    }

    try {
      // Extra positional args appended to payload (e.g. [256] for TripoSR mc_resolution)
      const extraArgs: unknown[] = data.extraArgs && data.extraArgs.length > 0
        ? data.extraArgs
        : (() => {
            const raw = process.env.HF_EXTRA_ARGS?.trim();
            if (!raw) return [];
            try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [v]; } catch { return []; }
          })();

      let payload: unknown[];
      if (data.kind === "text-to-3d") {
        payload = [data.prompt ?? "", ...extraArgs];
      } else {
        if (!data.imageDataUrl) {
          return { ok: false as const, error: "No image provided for image-to-3D" };
        }
        
        // Convert base64 data URL to Blob, wrap with handle_file
        const { blob } = dataUrlToBlob(data.imageDataUrl);
        const uploadedFile = handle_file(blob);
        payload = [uploadedFile, ...extraArgs];
      }

      const output = await gradioCall(spaceUrl, apiName, payload, token);
      let fileUrl: string | null = null;
      for (const item of output) {
        const u = extractFileUrl(spaceUrl, item);
        if (u) { fileUrl = u; break; }
      }
      if (!fileUrl) {
        return { ok: false as const, error: `No file in HF output: ${JSON.stringify(output).slice(0, 200)}` };
      }

      const fileRes = await fetch(fileUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!fileRes.ok) {
        return { ok: false as const, error: `HF file fetch failed: ${fileRes.status}` };
      }

      const buf = new Uint8Array(await fileRes.arrayBuffer());
      const ext = fileUrl.toLowerCase().endsWith(".obj") ? "obj" : "glb";
      const path = `hf/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabaseAdmin.storage.from("models").upload(path, buf, {
        contentType: ext === "glb" ? "model/gltf-binary" : "text/plain",
        upsert: false,
      });
      if (up.error) {
        return { ok: false as const, error: `Storage upload failed: ${up.error.message}` };
      }
      const { data: pub } = supabaseAdmin.storage.from("models").getPublicUrl(path);
      return { ok: true as const, modelUrl: pub.publicUrl };
    } catch (err: any) {
      console.error(`[HF 3D Error Log] Full Error Response:`, err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      return { ok: false as const, error: msg };
    }
  });


// =============================================================================
// Async job pattern: start + poll
// Allows the UI to show progress and gate preview/download until completion.
// =============================================================================

function normalizeSpaceUrl(raw: string): string {
  let u = raw.replace(/\/$/, "");
  const m = u.match(/huggingface\.co\/spaces\/([^/]+)\/([^/?#]+)/i);
  if (m) {
    const user = m[1].toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const name = m[2].toLowerCase().replace(/[^a-z0-9-]/g, "-");
    u = `https://${user}-${name}.hf.space`;
  }
  return u;
}

/**
 * SSRF guard: restrict outbound fetches to Hugging Face Space hosts only.
 * Rejects internal/private/link-local IPs and arbitrary hosts.
 */
function assertSafeSpaceUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid Space URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Space URL must use https");
  }
  const host = parsed.hostname.toLowerCase();
  // Allow only Hugging Face Spaces hosts.
  const allowed =
    host === "huggingface.co" ||
    host.endsWith(".hf.space") ||
    host.endsWith(".huggingface.co");
  if (!allowed) {
    throw new Error("Space URL host not allowed (must be a *.hf.space host)");
  }
  // Block any literal IP addresses just in case.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
    throw new Error("Space URL must be a hostname, not an IP");
  }
  return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/$/, "")}`;
}


const START_INPUT = z.object({
  prompt: z.string().min(1).max(2000).optional(),
  imageDataUrl: z.string().max(15_000_000).optional(),
  kind: z.enum(["text-to-3d", "image-to-3d"]),
  spaceUrl: z.string().url().max(500).optional(),
  apiName: z.string().min(1).max(200).optional(),
  extraArgs: z.array(z.unknown()).max(20).optional(),
});

export const startHF3DJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => START_INPUT.parse(d))
  .handler(async ({ data }) => {
    const rawUrl = (data.spaceUrl?.trim() || process.env.HF_SPACE_URL?.trim()) ?? "";
    if (!rawUrl) return { ok: false as const, error: "HF_SPACE_URL not configured" };
    let spaceUrl: string;
    try {
      spaceUrl = assertSafeSpaceUrl(normalizeSpaceUrl(rawUrl));
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Invalid Space URL" };
    }
    const apiName = data.apiName?.trim() || process.env.HF_API_NAME || "/predict";
    const token = process.env.HF_TOKEN?.trim();

    try {
      const extraArgs: unknown[] = data.extraArgs && data.extraArgs.length > 0
        ? data.extraArgs
        : (() => {
            const raw = process.env.HF_EXTRA_ARGS?.trim();
            if (!raw) return [];
            try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [v]; } catch { return []; }
          })();

      let payload: unknown[];
      if (data.kind === "text-to-3d") {
        payload = [data.prompt ?? "", ...extraArgs];
      } else {
        if (!data.imageDataUrl) return { ok: false as const, error: "No image provided for image-to-3D" };
        const uploaded = await uploadDataUrlToGradio(spaceUrl, data.imageDataUrl, token);
        payload = [uploaded, ...extraArgs];
      }

      // Ensure proper argument list format for the specific endpoint
      const firstInput = payload[0];
      const payloadRest = payload.slice(1);
      payload = buildPayload(apiName, firstInput, payloadRest);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const postRes = await fetch(`${spaceUrl}/gradio_api/call${apiName}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ data: payload }),
      });
      if (!postRes.ok) {
        return {
          ok: false as const,
          error: `HF Space POST failed: ${postRes.status} ${(await postRes.text()).slice(0, 200)}`,
        };
      }
      const { event_id } = (await postRes.json()) as { event_id: string };
      return { ok: true as const, eventId: event_id, spaceUrl, apiName, startedAt: Date.now() };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  });

const POLL_INPUT = z.object({
  eventId: z.string().min(1).max(200),
  spaceUrl: z.string().url().max(500),
  apiName: z.string().min(1).max(200),
  startedAt: z.number().optional(),
});

export type HF3DJobStatus = "queued" | "running" | "complete" | "error";

/**
 * Polls the Gradio SSE stream for a job. Reads up to ~6s of events per call,
 * then returns the latest status. On `complete`, downloads the file and uploads
 * to Supabase storage, returning the public URL.
 */
export const pollHF3DJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => POLL_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const token = process.env.HF_TOKEN?.trim();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    let safeSpaceUrl: string;
    try {
      safeSpaceUrl = assertSafeSpaceUrl(data.spaceUrl);
    } catch (e) {
      return {
        ok: true as const,
        status: "error" as HF3DJobStatus,
        progress: 0,
        message: e instanceof Error ? e.message : "Invalid Space URL",
        error: e instanceof Error ? e.message : "Invalid Space URL",
      };
    }
    const url = `${safeSpaceUrl}/gradio_api/call${data.apiName}/${data.eventId}`;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok || !res.body) {
        return {
          ok: true as const,
          status: "error" as HF3DJobStatus,
          progress: 0,
          message: `Stream HTTP ${res.status}`,
          error: `Stream HTTP ${res.status}`,
        };
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      const start = Date.now();
      let lastEvent = "";
      let lastMessage = "";
      let progress = 5;
      let completeData: unknown[] | null = null;
      let errorData = "";

      // Read for up to ~6 seconds per poll, or until we see complete/error.
      while (Date.now() - start < 6000) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          let event = "";
          let dataLine = "";
          for (const l of part.split("\n")) {
            if (l.startsWith("event:")) event = l.slice(6).trim();
            else if (l.startsWith("data:")) dataLine = l.slice(5).trim();
          }
          if (event) lastEvent = event;
          if (event === "estimation") {
            // e.g. {"rank":2,"queue_size":5,"rank_eta":12.3}
            try {
              const o = JSON.parse(dataLine) as { rank?: number; queue_size?: number; rank_eta?: number };
              if (typeof o.rank === "number" && typeof o.queue_size === "number" && o.queue_size > 0) {
                const pct = Math.max(0, Math.min(20, 20 - (o.rank / o.queue_size) * 20));
                progress = Math.max(progress, Math.round(pct));
                lastMessage = `Queued (rank ${o.rank}/${o.queue_size}${o.rank_eta ? `, ~${Math.round(o.rank_eta)}s` : ""})`;
              }
            } catch { /* ignore */ }
          } else if (event === "process_starts") {
            progress = Math.max(progress, 25);
            lastMessage = "Generating mesh…";
          } else if (event === "process_generating" || event === "heartbeat") {
            // Crawl progress up to 90% as we receive activity
            progress = Math.min(90, progress + 3);
            if (!lastMessage) lastMessage = "Generating mesh…";
          } else if (event === "complete") {
            try { completeData = JSON.parse(dataLine) as unknown[]; } catch { /* ignore */ }
            progress = 95;
          } else if (event === "error") {
            errorData = dataLine.slice(0, 300);
          }
        }
        if (lastEvent === "complete" || lastEvent === "error") break;
      }
      try { await reader.cancel(); } catch { /* ignore */ }

      if (lastEvent === "error") {
        return {
          ok: true as const,
          status: "error" as HF3DJobStatus,
          progress: 0,
          message: errorData || "HF Space error",
          error: errorData || "HF Space error",
        };
      }

      if (lastEvent === "complete" && completeData) {
        let fileUrl: string | null = null;
        for (const item of completeData) {
          const u = extractFileUrl(safeSpaceUrl, item);
          if (u) { fileUrl = u; break; }
        }
        if (!fileUrl) {
          return {
            ok: true as const,
            status: "error" as HF3DJobStatus,
            progress: 0,
            message: "No file in HF output",
            error: `No file in HF output: ${JSON.stringify(completeData).slice(0, 200)}`,
          };
        }
        const fileRes = await fetch(fileUrl, { headers });
        if (!fileRes.ok) {
          return {
            ok: true as const,
            status: "error" as HF3DJobStatus,
            progress: 0,
            message: `File fetch failed (${fileRes.status})`,
            error: `HF file fetch failed: ${fileRes.status}`,
          };
        }
        const buf2 = new Uint8Array(await fileRes.arrayBuffer());
        const ext = fileUrl.toLowerCase().endsWith(".obj") ? "obj" : "glb";
        const path = `hf/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabaseAdmin.storage.from("models").upload(path, buf2, {
          contentType: ext === "glb" ? "model/gltf-binary" : "text/plain",
          upsert: false,
        });
        if (up.error) {
          return {
            ok: true as const,
            status: "error" as HF3DJobStatus,
            progress: 0,
            message: `Upload failed: ${up.error.message}`,
            error: `Storage upload failed: ${up.error.message}`,
          };
        }
        const { data: pub } = supabaseAdmin.storage.from("models").getPublicUrl(path);
        return {
          ok: true as const,
          status: "complete" as HF3DJobStatus,
          progress: 100,
          message: "Done",
          modelUrl: pub.publicUrl,
        };
      }

      // Still running — fall through with whatever we have
      const elapsed = data.startedAt ? Math.round((Date.now() - data.startedAt) / 1000) : null;
      if (!lastMessage) lastMessage = elapsed != null ? `Working… ${elapsed}s elapsed` : "Working…";
      return {
        ok: true as const,
        status: (lastEvent === "process_starts" || lastEvent === "process_generating" || lastEvent === "heartbeat" ? "running" : "queued") as HF3DJobStatus,
        progress,
        message: lastMessage,
      };
    } catch (err) {
      return {
        ok: true as const,
        status: "error" as HF3DJobStatus,
        progress: 0,
        message: err instanceof Error ? err.message : String(err),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

