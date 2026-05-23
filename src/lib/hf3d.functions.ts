import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Client, handle_file } from "@gradio/client";

// Patch global fetch to skip ngrok browser warnings automatically
if (typeof globalThis.fetch === "function") {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function (input: any, init?: any) {
    let urlStr = "";
    if (typeof input === "string") {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else if (input && typeof input === "object" && "url" in input) {
      urlStr = (input as any).url;
    }

    if (urlStr && (urlStr.includes("ngrok-free.dev") || urlStr.includes("ngrok.io") || urlStr.includes("ngrok.app"))) {
      // 1. If the input is a Request object, set headers directly on it
      if (input && typeof input === "object" && "headers" in input && typeof input.headers?.set === "function") {
        try {
          input.headers.set("ngrok-skip-browser-warning", "true");
        } catch (e) {
          // Headers might be immutable, so we can fall back to init
        }
      }
      
      // 2. Set headers on the init object as well
      init = init || {};
      if (init.headers instanceof Headers) {
        init.headers.set("ngrok-skip-browser-warning", "true");
      } else if (Array.isArray(init.headers)) {
        if (!init.headers.some(([k]: any) => k.toLowerCase() === "ngrok-skip-browser-warning")) {
          init.headers.push(["ngrok-skip-browser-warning", "true"]);
        }
      } else if (init.headers && typeof init.headers === "object") {
        init.headers = {
          ...init.headers,
          "ngrok-skip-browser-warning": "true",
        };
      } else {
        init.headers = {
          "ngrok-skip-browser-warning": "true",
        };
      }
    }
    return originalFetch.call(this, input, init);
  };
}


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

/**
 * Generates a square reference image from a text prompt using Lovable AI's
 * Gemini image model. Returned as a data URL so it can be uploaded to Gradio
 * via the same path as user-supplied images. Used to bridge text-to-3D into
 * the image-to-3D pipeline (Trellis only accepts images).
 */
async function generateImageFromPrompt(prompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [
        {
          role: "user",
          content: `A clean studio photograph of: ${prompt}. Single subject, centered, plain neutral background, soft even lighting, no text, no watermark.`,
        },
      ],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    throw new Error(`Image generation failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
  };
  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url || !url.startsWith("data:")) {
    throw new Error("No image returned from Lovable AI");
  }
  return url;
}

function makeSessionHash(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildPayload(apiName: string, firstInput: unknown, extraArgs: unknown[]): unknown[] {
  const normApi = apiName.toLowerCase();
  if (normApi.endsWith("/generate_3d")) {
    // Pixal3D /generate_3d — image + 16 positional args (last is session_id)
    // NOTE: resolution must be one of the supported cascades: 1024 or 1536.
    const defaultArgs: unknown[] = [
      0,        // seed
      1024,     // resolution (Pixal3D supports 1024_cascade / 1536_cascade)
      7.5,      // ss_guidance_strength
      0.7,      // ss_guidance_rescale
      12,       // ss_sampling_steps
      5.0,      // ss_rescale_t
      7.5,      // shape_slat_guidance_strength
      0.5,      // shape_slat_guidance_rescale
      12,       // shape_slat_sampling_steps
      3.0,      // shape_slat_rescale_t
      1.0,      // tex_slat_guidance_strength
      0.0,      // tex_slat_guidance_rescale
      12,       // tex_slat_sampling_steps
      3.0,      // tex_slat_rescale_t
      -1.0,     // manual_fov
      makeSessionHash(), // session_id
    ];
    const merged = [...extraArgs];
    for (let i = merged.length; i < defaultArgs.length; i++) merged.push(defaultArgs[i]);
    return [firstInput, ...merged];
  }
  if (
    normApi.includes("image_to_3d") ||
    normApi.includes("handle_image_to_3d") ||
    normApi.includes("handle_text_to_3d")
  ) {
    const defaultArgs = [
      0, true, "512",
      7.5, 0.7, 12, 5.0,
      7.5, 0.5, 12, 3.0,
      1.0, 0.0, 12, 3.0,
      300000, 2048,
    ];
    const merged = [...extraArgs];
    for (let i = merged.length; i < defaultArgs.length; i++) merged.push(defaultArgs[i]);
    return [firstInput, ...merged];
  }
  return [firstInput, ...extraArgs];
}

function needsGlbExtraction(apiName: string): boolean {
  const normApi = apiName.toLowerCase();
  if (normApi.endsWith("/generate_3d")) return true;
  return normApi.endsWith("/image_to_3d") && !normApi.includes("handle_image_to_3d");
}

/**
 * The Pixal3D hub Space (kingdavezz-pixal3d-server.hf.space) is a landing
 * page; the actual workers run behind ephemeral *.gradio.live tunnels.
 * Parse the hub HTML and pick a reachable tunnel.
 */
async function resolvePixal3DTunnel(hubUrl: string): Promise<string> {
  // Tunnel URLs are embedded in the Gradio /config payload
  // (inside the landing-page HTML component), not in the bare HTML shell.
  const sources = [`${hubUrl.replace(/\/$/, "")}/config`, hubUrl];
  let body = "";
  for (const u of sources) {
    try {
      const res = await fetch(u, { method: "GET" });
      if (!res.ok) continue;
      body += "\n" + (await res.text());
    } catch { /* try next */ }
  }
  const tunnels = Array.from(
    new Set(Array.from(body.matchAll(/https:\/\/[a-z0-9]+\.gradio\.live/gi)).map((m) => m[0]))
  );
  if (tunnels.length === 0) throw new Error("Pixal3D hub listed no worker tunnels");
  for (const t of tunnels) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(`${t}/gradio_api/info`, { signal: ctl.signal });
      clearTimeout(timer);
      if (!r.ok) continue;
      const info = (await r.json()) as { named_endpoints?: Record<string, unknown> };
      if (info?.named_endpoints && Object.keys(info.named_endpoints).length > 0) return t;
    } catch { /* try next */ }
  }
  throw new Error("All Pixal3D worker tunnels are offline. Try again in a minute.");
}

function isPixal3DHub(spaceUrl: string): boolean {
  try {
    const host = new URL(spaceUrl).hostname.toLowerCase();
    return host === "kingdavezz-pixal3d-server.hf.space" || host.endsWith(".gradio.live");
  } catch { return false; }
}

async function startGradioJob(
  spaceUrl: string,
  apiName: string,
  payload: unknown[],
  token: string | undefined,
  sessionHash: string,
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const postRes = await fetch(`${spaceUrl}/gradio_api/call${apiName}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: payload, session_hash: sessionHash }),
  });
  if (!postRes.ok) {
    throw new Error(`HF Space POST failed: ${postRes.status} ${(await postRes.text()).slice(0, 200)}`);
  }
  const { event_id } = (await postRes.json()) as { event_id?: string };
  if (!event_id) throw new Error("HF Space did not return an event id");
  return event_id;
}

/**
 * Trellis-style spaces require /start_session to be called once with a
 * session_hash before /image_to_3d, otherwise the server crashes with a
 * KeyError on the per-session state dict.
 */
async function ensureStartSession(
  spaceUrl: string,
  token: string | undefined,
  sessionHash: string,
): Promise<void> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${spaceUrl}/gradio_api/call/start_session`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [], session_hash: sessionHash }),
    });
    if (!res.ok) return; // best-effort; many spaces don't have this endpoint
    const { event_id } = (await res.json()) as { event_id?: string };
    if (!event_id) return;
    // Drain the SSE stream briefly so the Space initializes session state.
    const stream = await fetch(`${spaceUrl}/gradio_api/call/start_session/${event_id}`, { headers });
    const reader = stream.body?.getReader();
    if (!reader) return;
    const start = Date.now();
    while (Date.now() - start < 3000) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = new TextDecoder().decode(value);
      if (text.includes("event: complete") || text.includes("event: error")) break;
    }
    try { await reader.cancel(); } catch { /* ignore */ }
  } catch {
    // best-effort
  }
}


async function runGradioJob(
  app: any,
  apiName: string,
  payload: unknown[]
): Promise<unknown[]> {
  console.log(`[HF 3D] Submitting job to ${apiName} with payload size ${payload.length}`);
  const job = app.submit(apiName, payload);
  let lastData: unknown[] | null = null;
  
  try {
    for await (const message of job) {
      if (message.type === "data") {
        lastData = message.data as unknown[];
      } else if (message.type === "status") {
        console.log(`[HF 3D] Job status for ${apiName}: status=${message.status}, stage=${message.stage || ""}, position=${message.position || ""}`);
        if (message.stage === "error") {
          throw new Error(message.message || "Job execution failed");
        }
      }
    }
  } catch (err: any) {
    console.error(`[HF 3D] Error in submit job stream for ${apiName}:`, err);
    throw err;
  }

  if (!lastData) {
    throw new Error(`Job on ${apiName} finished without returning data.`);
  }
  return lastData;
}

async function gradioCall(
  spaceUrl: string,
  apiName: string,
  payload: unknown[],
  token?: string
): Promise<unknown[]> {
  try {
    console.log(`[HF 3D] Connecting to Space: ${spaceUrl} (API: ${apiName})`);
    const app = await Client.connect(spaceUrl, { token: token as `hf_${string}` });
    console.log(`[HF 3D] Connected successfully. Invoking prediction...`);
    
    const firstInput = payload[0];
    const extraArgs = payload.slice(1);
    const finalPayload = buildPayload(apiName, firstInput, extraArgs);
    
    console.log(`[HF 3D] Payload size: ${finalPayload.length}`);
    const result = await runGradioJob(app, apiName, finalPayload);
    console.log(`[HF 3D] Prediction succeeded. Output data:`, JSON.stringify(result).slice(0, 300));
    return result;
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
): Promise<{ path: string; url: string; orig_name: string; size: number; mime_type: string; is_stream: boolean; meta: { _type: "gradio.FileData" } }> {
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
  const path = paths[0];
  return {
    path,
    url: `${spaceUrl}/gradio_api/file=${path}`,
    orig_name: filename,
    size: bin.byteLength,
    mime_type: mime,
    is_stream: false,
    meta: { _type: "gradio.FileData" },
  };
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
      return { ok: false as const, error: "No 3D provider configured. Set HF_SPACE_URL and HF_API_NAME secrets." };
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

    // 1. Health check before connection (try multiple routes: /gradio_api/info, /info, /config, and /)
    {
      let healthy = false;
      let lastStatus = 0;
      const isLocal = spaceUrl.includes("localhost") || spaceUrl.includes("127.0.0.1") || spaceUrl.includes("ngrok");
      const paths = isLocal ? ["/gradio_api/info", "/info", "/config", ""] : ["/gradio_api/info", "/info"];
      for (const path of paths) {
        try {
          const ctl = new AbortController();
          const t = setTimeout(() => ctl.abort(), 4000);
          const r = await fetch(`${spaceUrl}${path}`, { signal: ctl.signal });
          clearTimeout(t);
          lastStatus = r.status;
          // For local/ngrok, we allow any response (even 404/config etc.) as long as it's not a server/connection error
          if (r.ok || (isLocal && r.status !== 502 && r.status !== 503 && r.status !== 504)) {
            healthy = true;
            break;
          }
        } catch { /* try next */ }
      }
      if (!healthy) {
        return { ok: false as const, error: `Space health check failed (HTTP ${lastStatus || "timeout"})` };
      }
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
        if (!data.prompt) {
          return { ok: false as const, error: "No prompt provided for text-to-3D" };
        }
        const generatedImage = await generateImageFromPrompt(data.prompt);
        const { blob } = dataUrlToBlob(generatedImage);
        const uploadedFile = handle_file(blob);
        payload = [uploadedFile, ...extraArgs];
      } else {
        if (!data.imageDataUrl) {
          return { ok: false as const, error: "No image provided for image-to-3D" };
        }
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
  // Allow Hugging Face Spaces, the Pixal3D *.gradio.live tunnels, and
  // Cloudflare Tunnels (*.trycloudflare.com or any host configured via
  // LOCAL_3D_API_URL — used for self-hosted local PC backends).
  let allowedLocalHost: string | null = null;
  try {
    const localUrl = process.env.LOCAL_3D_API_URL?.trim();
    if (localUrl) allowedLocalHost = new URL(localUrl).hostname.toLowerCase();
  } catch { /* ignore */ }
  const allowed =
    host === "huggingface.co" ||
    host.endsWith(".hf.space") ||
    host.endsWith(".huggingface.co") ||
    host.endsWith(".gradio.live") ||
    host.endsWith(".trycloudflare.com") ||
    host.endsWith(".cfargotunnel.com") ||
    host.endsWith(".ngrok-free.dev") ||
    host.endsWith(".ngrok-free.app") ||
    host.endsWith(".ngrok.app") ||
    host.endsWith(".ngrok.io") ||
    (allowedLocalHost !== null && host === allowedLocalHost);
  if (!allowed) {
    throw new Error("Space URL host not allowed");
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
  quality: z.enum(["fast", "balanced", "hd"]).optional(),
  bakeTexture: z.boolean().optional(),
});

/** Map a quality preset to TripoSR-friendly params. Default = Fast (Low Power Mode). */
function resolveQualityParams(
  quality: "fast" | "balanced" | "hd" | undefined,
  bake: boolean | undefined,
): { mcResolution: number; textureResolution: number; bakeTexture: boolean } {
  const wantBake = !!bake;
  switch (quality ?? "fast") {
    case "hd":
      return { mcResolution: 256, textureResolution: wantBake ? 1024 : 0, bakeTexture: wantBake };
    case "balanced":
      return { mcResolution: 128, textureResolution: wantBake ? 512 : 0, bakeTexture: wantBake };
    case "fast":
    default:
      return { mcResolution: 96, textureResolution: wantBake ? 512 : 0, bakeTexture: wantBake };
  }
}

/**
 * Process-wide serialization for local 3D generation.
 * Prevents the user's GPU (e.g. RTX 4070) from being hammered by concurrent
 * jobs — only ONE Trellis run hits the local Gradio server at a time, and
 * we cap the waiting queue so requests fail fast instead of piling up.
 */
const LOCAL3D_MAX_QUEUE = 3; // currently-running + waiting
let local3DQueueDepth = 0;
let local3DChain: Promise<unknown> = Promise.resolve();
function isLocalUrl(u: string): boolean {
  try {
    const h = new URL(u).hostname.toLowerCase();
    return h.endsWith(".ngrok-free.dev") || h.endsWith(".ngrok.app") || h.endsWith(".trycloudflare.com") || h.endsWith(".gradio.live");
  } catch { return false; }
}
async function withLocal3DLock<T>(spaceUrl: string, fn: () => Promise<T>): Promise<T> {
  if (!isLocalUrl(spaceUrl)) return fn();
  if (local3DQueueDepth >= LOCAL3D_MAX_QUEUE) {
    throw new Error("Local 3D server is busy (queue full). Please wait a moment and try again.");
  }
  local3DQueueDepth++;
  const prev = local3DChain;
  let release!: () => void;
  local3DChain = new Promise<void>((r) => { release = r; });
  try {
    await prev.catch(() => {}); // wait for previous job, ignore its errors
    return await fn();
  } finally {
    local3DQueueDepth--;
    release();
  }
}

/**
 * Runs the TripoSR / TRELLIS-style image→3D pipeline (Gradio 4.x):
 *   /preprocess(image, remove_bg, foreground_ratio) → processed image
 *   /generate(processed_image, mc_resolution[, bake_texture, texture_resolution]) → glb/obj
 *
 * Serialized via withLocal3DLock so the local GPU only handles one job at a time.
 */
async function runTrellisPipeline(
  spaceUrl: string,
  imageDataUrl: string,
  token?: string,
  opts?: { mcResolution?: number; bakeTexture?: boolean; textureResolution?: number },
): Promise<{ fileUrl: string }> {
  return withLocal3DLock(spaceUrl, () => runTrellisPipelineInner(spaceUrl, imageDataUrl, token, opts));
}

async function runTrellisPipelineInner(
  spaceUrl: string,
  imageDataUrl: string,
  token?: string,
  opts?: { mcResolution?: number; bakeTexture?: boolean; textureResolution?: number },
): Promise<{ fileUrl: string }> {
  // ngrok free injects a browser interstitial unless this header is set on
  // every request. The Gradio JS client forwards `options.headers` through
  // its internal `this.fetch`, so /config, /info, predict, upload, and the
  // SSE stream all carry it.
  const ngrokHeaders: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
  };
  const baseHeaders: Record<string, string> = {
    ...ngrokHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Pre-flight: hit /config directly so we surface a clear error if the local
  // server (ngrok / cloudflared / gradio.live tunnel) is unreachable, paused,
  // OAuth-protected, or returning an HTML interstitial. This runs before we
  // hand off to the Gradio client so we can give the user a precise reason.
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const cfg = await fetch(`${spaceUrl}/config`, {
      method: "GET",
      headers: { ...baseHeaders, Accept: "application/json" },
      signal: ctl.signal,
      redirect: "manual",
    });
    clearTimeout(timer);
    const ct = cfg.headers.get("content-type") || "";
    const fullBody = await cfg.text();
    const preview = fullBody.slice(0, 500);
    if (!cfg.ok) {
      throw new Error(
        `Local 3D /config HTTP ${cfg.status} ${cfg.statusText}. content-type=${ct || "(none)"}. body=${preview}`,
      );
    }
    const trimmed = fullBody.trimStart();
    if (!trimmed.startsWith("{")) {
      const hint = /accounts\.google\.com|oauth/i.test(preview)
        ? "Looks like a Google OAuth login page — disable OAuth on the ngrok tunnel."
        : /ngrok/i.test(preview)
        ? "Looks like the ngrok browser interstitial — header was rejected."
        : "Server returned non-JSON content.";
      throw new Error(`Local 3D /config returned non-JSON. ${hint} content-type=${ct}. body=${preview}`);
    }
    try {
      JSON.parse(trimmed);
    } catch (parseErr) {
      const pmsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      throw new Error(`Local 3D /config returned invalid JSON (${pmsg}). content-type=${ct}. body=${preview}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("Local 3D /config")) throw e;
    throw new Error(
      `Could not reach local 3D server at ${spaceUrl}/config — is your PC on, the Gradio app running, and ngrok forwarding? (${msg})`,
    );
  }

  // 1) Upload the input image to Supabase Storage (public `models` bucket).
  //    We pass the resulting public URL to Gradio as a FileData object via
  //    `handle_file`; the Gradio server fetches the image over plain HTTPS.
  //    This avoids hitting any /upload route on the local server.
  const m = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Invalid image data URL");
  const mime = m[1];
  const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const ext = (mime.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "");
  const inputPath = `trellis-inputs/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("models")
    .upload(inputPath, bin, { contentType: mime, upsert: false });
  if (upErr) throw new Error(`Supabase Storage upload failed: ${upErr.message}`);
  const { data: pub } = supabaseAdmin.storage.from("models").getPublicUrl(inputPath);
  const publicUrl = pub.publicUrl;
  if (!publicUrl) throw new Error("Could not resolve public URL for uploaded image");
  const inputFile = handle_file(publicUrl);

  // 2) Connect the official Gradio client. It handles the queue + SSE
  //    automatically — no manual POST to /preprocess or /generate. We
  //    forward the ngrok header on every request via options.headers.
  console.log(`[HF 3D / TRELLIS] Connecting Gradio client to ${spaceUrl}`);
  let app: Client;
  try {
    app = await Client.connect(spaceUrl, {
      headers: baseHeaders,
      events: ["data", "status"],
      ...(token && /^hf_/.test(token) ? { token: token as `hf_${string}` } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gradio client connect failed at ${spaceUrl}: ${msg}`);
  }

  // 3) Best-effort view_api — log what the Space exposes so failures are easy
  //    to diagnose. Does not block the run if it 404s on a stripped build.
  let hasCheck = false;
  let hasPreprocess = false;
  let hasGenerate = false;
  try {
    const info = await app.view_api();
    const named = info?.named_endpoints ? Object.keys(info.named_endpoints) : [];
    console.log(`[HF 3D / TRELLIS] view_api endpoints: ${named.join(", ") || "(none)"}`);
    hasCheck = named.includes("/check_input_image");
    hasPreprocess = named.includes("/preprocess");
    hasGenerate = named.includes("/generate");
  } catch (e) {
    console.warn(`[HF 3D / TRELLIS] view_api failed:`, e instanceof Error ? e.message : e);
  }

  const dataOf = (r: unknown): unknown[] => {
    if (Array.isArray(r)) return r;
    if (r && typeof r === "object" && Array.isArray((r as { data?: unknown }).data)) {
      return (r as { data: unknown[] }).data;
    }
    return [r];
  };

  // 4) Best-effort /check_input_image (TRELLIS-style spaces).
  if (hasCheck || !hasPreprocess) {
    try {
      console.log(`[HF 3D / TRELLIS] predict /check_input_image`);
      await runGradioJob(app, "/check_input_image", [inputFile]);
    } catch (e) {
      console.log(`[HF 3D / TRELLIS] /check_input_image skipped:`, e instanceof Error ? e.message : e);
    }
  }

  // 5) /preprocess(image, remove_bg, foreground_ratio)
  console.log(`[HF 3D / TRELLIS] predict /preprocess`);
  let processed: unknown;
  try {
    const preRes = await runGradioJob(app, "/preprocess", [inputFile, true, 0.85]);
    processed = preRes[0];
  } catch (e) {
    const msg = e instanceof Error ? e.message : (typeof e === "object" ? JSON.stringify(e).slice(0, 300) : String(e));
    throw new Error(`Gradio /preprocess failed at ${spaceUrl}: ${msg}`);
  }
  if (!processed) throw new Error("Preprocess returned no image");

  // 6) /generate — try the minimal 1-arg signature first (matches local
  //    TripoSR/SF3D builds where /generate only accepts the processed image),
  //    then fall back to extended signatures for spaces that take resolution
  //    / bake / texture-resolution.
  const mc = opts?.mcResolution ?? 96;
  const bake = !!opts?.bakeTexture;
  const texRes = opts?.textureResolution ?? 0;
  console.log(`[HF 3D / TRELLIS] predict /generate (hasGenerate=${hasGenerate})`);
  let genOut: unknown[];
  try {
    const r = await runGradioJob(app, "/generate", [processed]);
    genOut = r;
  } catch (e1) {
    const m1 = e1 instanceof Error ? e1.message : String(e1);
    console.warn(`[HF 3D / TRELLIS] /generate(image) failed, retrying (image, mc):`, m1);
    try {
      const r = await runGradioJob(app, "/generate", [processed, mc]);
      genOut = r;
    } catch (e2) {
      const m2 = e2 instanceof Error ? e2.message : String(e2);
      console.warn(`[HF 3D / TRELLIS] /generate(image, mc) failed, retrying full sig:`, m2);
      try {
        const r = await runGradioJob(app, "/generate", [processed, mc, bake, texRes]);
        genOut = r;
      } catch (e3) {
        const m3 = e3 instanceof Error ? e3.message : String(e3);
        // Surface the original (most informative) error to the user.
        throw new Error(`Gradio /generate failed at ${spaceUrl}: ${m1 || m3}`);
      }
    }
  }

  let fileUrl: string | null = null;
  for (const item of genOut) {
    const u = extractFileUrl(spaceUrl, item);
    if (u) { fileUrl = u; break; }
  }
  if (!fileUrl) throw new Error(`No model in /generate output: ${JSON.stringify(genOut).slice(0, 300)}`);
  return { fileUrl };
}


export const startHF3DJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => START_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Precedence: per-call override → LOCAL_3D_API_URL → HF_SPACE_URL
    const rawUrl = (
      data.spaceUrl?.trim() ||
      process.env.LOCAL_3D_API_URL?.trim() ||
      process.env.HF_SPACE_URL?.trim()
    ) ?? "";
    if (!rawUrl) return { ok: false as const, error: "No 3D backend configured. Set LOCAL_3D_API_URL." };
    let spaceUrl: string;
    try {
      spaceUrl = assertSafeSpaceUrl(normalizeSpaceUrl(rawUrl));
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Invalid Space URL" };
    }
    const apiName = data.apiName?.trim() || process.env.HF_API_NAME || "/generate";
    let token: string | undefined =
      process.env.LOCAL_3D_API_PASSWORD?.trim() || process.env.HF_TOKEN?.trim();

    // Pixal3D hub → resolve to a live *.gradio.live worker tunnel.
    // If the URL is already a .gradio.live tunnel, just strip the token.
    if (isPixal3DHub(spaceUrl)) {
      if (new URL(spaceUrl).hostname.endsWith(".gradio.live")) {
        token = undefined; // public tunnel; HF token does not apply
      } else {
        try {
          spaceUrl = await resolvePixal3DTunnel(spaceUrl);
          token = undefined; // public tunnel; HF token does not apply
        } catch (e) {
          return { ok: false as const, error: e instanceof Error ? e.message : "Pixal3D unavailable" };
        }
      }
    }

    // TRELLIS pipeline: /generate (preceded by /preprocess). Run synchronously
    // through the Gradio client; the route already handles the {modelUrl} fast
    // path returned below.
    if (apiName.toLowerCase() === "/generate") {
      try {
        let imageDataUrl: string;
        if (data.kind === "text-to-3d") {
          if (!data.prompt) return { ok: false as const, error: "No prompt provided for text-to-3D" };
          imageDataUrl = await generateImageFromPrompt(data.prompt);
        } else {
          if (data.imageDataUrl) imageDataUrl = data.imageDataUrl;
          else if (data.prompt) imageDataUrl = await generateImageFromPrompt(data.prompt);
          else return { ok: false as const, error: "No image or prompt provided for 3D generation" };
        }
        const qp = resolveQualityParams(data.quality, data.bakeTexture);
        const { fileUrl } = await runTrellisPipeline(spaceUrl, imageDataUrl, token, qp);
        const fileRes = await fetch(fileUrl, {
          headers: {
            "ngrok-skip-browser-warning": "true",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!fileRes.ok) return { ok: false as const, error: `File fetch failed (${fileRes.status})` };
        const buf = new Uint8Array(await fileRes.arrayBuffer());
        const ext = fileUrl.toLowerCase().endsWith(".obj") ? "obj" : "glb";
        const path = `hf/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabaseAdmin.storage.from("models").upload(path, buf, {
          contentType: ext === "glb" ? "model/gltf-binary" : "text/plain",
          upsert: false,
        });
        if (up.error) return { ok: false as const, error: `Storage upload failed: ${up.error.message}` };
        const { data: pub } = supabaseAdmin.storage.from("models").getPublicUrl(path);
        return {
          ok: true as const,
          modelUrl: pub.publicUrl,
          spaceUrl,
          apiName,
          eventId: "",
          sessionHash: "",
          startedAt: Date.now(),
        };
      } catch (err) {
        console.error(`[HF 3D / TRELLIS] error:`, err);
        return { ok: false as const, error: extractErrorMessage(err) };
      }
    }


    const sessionHash = makeSessionHash();
    const startedAt = Date.now();

    try {
      const extraArgs: unknown[] = data.extraArgs && data.extraArgs.length > 0
        ? data.extraArgs
        : (() => {
            const raw = process.env.HF_EXTRA_ARGS?.trim();
            if (!raw) return [];
            try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [v]; } catch { return []; }
          })();

      // Build image input. If the user entered only a prompt, first create a
      // reference image, then submit that image to Pixal3D.
      let imageDataUrl: string;
      if (data.kind === "text-to-3d") {
        if (!data.prompt) return { ok: false as const, error: "No prompt provided for text-to-3D" };
        imageDataUrl = await generateImageFromPrompt(data.prompt);
      } else {
        if (data.imageDataUrl) {
          imageDataUrl = data.imageDataUrl;
        } else if (data.prompt) {
          imageDataUrl = await generateImageFromPrompt(data.prompt);
        } else {
          return { ok: false as const, error: "No image or prompt provided for 3D generation" };
        }
      }

      const imageFile = await uploadDataUrlToGradio(spaceUrl, imageDataUrl, token);
      const gen3dArgs = buildPayload(apiName, imageFile, extraArgs);
      if (apiName.toLowerCase().endsWith("/generate_3d")) {
        gen3dArgs[gen3dArgs.length - 1] = sessionHash;
      }
      console.log(`[HF 3D] start ${apiName} with ${gen3dArgs.length} args`);
      const eventId = await startGradioJob(spaceUrl, apiName, gen3dArgs, token, sessionHash);

      // Return immediately so long-running Pixal3D work is handled by polling
      // instead of timing out the server request.
      return {
        ok: true as const,
        eventId,
        spaceUrl,
        apiName,
        sessionHash,
        startedAt,
      };
    } catch (err) {
      console.error(`[HF 3D] startHF3DJob error:`, err);
      const msg = extractErrorMessage(err);
      return { ok: false as const, error: msg };
    }
  });

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string" && o.message) return o.message;
    if (typeof o.original_msg === "string" && o.original_msg) return o.original_msg;
    if (typeof o.title === "string" && o.title) return o.title;
    try { return JSON.stringify(err).slice(0, 400); } catch { /* ignore */ }
  }
  return String(err);
}

const POLL_INPUT = z.object({
  eventId: z.string().min(1).max(200),
  spaceUrl: z.string().url().max(500),
  apiName: z.string().min(1).max(200),
  sessionHash: z.string().min(1).max(200).optional(),
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
    const rawToken = process.env.HF_TOKEN?.trim();
    let token: string | undefined = rawToken;
    try {
      if (new URL(data.spaceUrl).hostname.toLowerCase().endsWith(".gradio.live")) {
        token = undefined;
      }
    } catch { /* ignore */ }
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
      // Guard each read too; Gradio can keep the stream open without chunks,
      // and the server request must return before the platform timeout.
      while (Date.now() - start < 6000) {
        const read = await Promise.race([
          reader.read(),
          new Promise<ReadableStreamReadResult<Uint8Array>>((resolve) => {
            setTimeout(() => resolve({ value: new Uint8Array(), done: false }), 5500);
          }),
        ]);
        const { value, done } = read;
        if (done) break;
        if (!value || value.byteLength === 0) break;
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
        if (!fileUrl && needsGlbExtraction(data.apiName)) {
          try {
            const sessionHash = data.sessionHash || makeSessionHash();
            const isPixal3D = data.apiName.toLowerCase().endsWith("/generate_3d");
            let extractApi = "/extract_glb";
            let extractArgs: unknown[] = [300000, 2048];
            if (isPixal3D) {
              // /generate_3d returns { state_path, ... }; chain into /extract_glb_api.
              extractApi = "/extract_glb_api";
              let statePath: string | null = null;
              for (const item of completeData) {
                if (item && typeof item === "object") {
                  const o = item as Record<string, unknown>;
                  if (typeof o.state_path === "string") { statePath = o.state_path; break; }
                }
              }
              if (!statePath) {
                return {
                  ok: true as const,
                  status: "error" as HF3DJobStatus,
                  progress: 0,
                  message: "Pixal3D returned no state_path",
                  error: `No state_path: ${JSON.stringify(completeData).slice(0, 200)}`,
                };
              }
              extractArgs = [statePath, 300000, 2048, sessionHash];
            }
            const eventId = await startGradioJob(safeSpaceUrl, extractApi, extractArgs, token, sessionHash);
            return {
              ok: true as const,
              status: "running" as HF3DJobStatus,
              progress: 96,
              message: "Extracting GLB…",
              eventId,
              apiName: extractApi,
              sessionHash,
            };
          } catch (e) {
            return {
              ok: true as const,
              status: "error" as HF3DJobStatus,
              progress: 0,
              message: e instanceof Error ? e.message : "GLB extraction failed",
              error: e instanceof Error ? e.message : "GLB extraction failed",
            };
          }
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

