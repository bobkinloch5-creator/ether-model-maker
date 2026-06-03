import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateApiKey, corsPreflight, jsonResponse } from "@/lib/api-auth.server";

// UUID v4-ish check — used to decide whether to try matching the primary key.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GenerationRow = {
  id: string;
  user_id: string;
  prompt: string;
  generation_type: string;
  status: string;
  result_data: Record<string, unknown> | null;
  credits_used: number;
  created_at: string;
};

function pickString(obj: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function buildResponse(row: GenerationRow) {
  const r = row.result_data ?? {};

  // Common URL fields that downstream pipelines may have written.
  const modelUrl = pickString(r, "model_url", "glb_url", "mesh_url", "download_url", "result_url");
  const previewUrl = pickString(r, "preview_url", "thumbnail_url", "image_url");
  const textureUrl = pickString(r, "texture_url", "texture_png_url", "albedo_url");
  const downloadUrl = pickString(r, "download_url", "result_url") ?? modelUrl;

  return {
    ok: true,
    id: row.id,
    job_id: row.id,
    generation_id: row.id,
    client_job_id: pickString(r, "client_job_id"),
    external_id: pickString(r, "external_id"),
    status: row.status,
    prompt: row.prompt,
    generation_type: row.generation_type,
    credits_used: row.credits_used,
    created_at: row.created_at,

    // Direct URL fields the Second Life HUD looks for.
    download_url: downloadUrl,
    preview_url: previewUrl,
    result_url: pickString(r, "result_url") ?? downloadUrl,
    model_url: modelUrl,
    texture_url: textureUrl,
    texture_png_url: pickString(r, "texture_png_url", "texture_url"),
    texture_tga_url: pickString(r, "texture_tga_url"),
    albedo_url: pickString(r, "albedo_url", "texture_url"),
    normal_url: pickString(r, "normal_url"),

    result_data: r,
  };
}

export const Route = createFileRoute("/api/public/v1/generations/$id")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),

      GET: async ({ request, params }) => {
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

        const id = (params.id ?? "").trim();
        if (!id) return jsonResponse({ error: "Missing id." }, 400);

        // Try primary key first if it looks like a UUID.
        if (UUID_RE.test(id)) {
          const { data, error } = await supabaseAdmin
            .from("generations")
            .select(
              "id, user_id, prompt, generation_type, status, result_data, credits_used, created_at",
            )
            .eq("id", id)
            .eq("user_id", auth.user.userId)
            .maybeSingle();
          if (error) return jsonResponse({ error: error.message }, 500);
          if (data) return jsonResponse(buildResponse(data as GenerationRow));
        }

        // Fall back to alias fields stored on result_data: client_job_id or external_id.
        const orFilter = [
          `result_data->>client_job_id.eq.${id}`,
          `result_data->>external_id.eq.${id}`,
          `result_data->>job_id.eq.${id}`,
          `result_data->>generation_id.eq.${id}`,
        ].join(",");

        const { data, error } = await supabaseAdmin
          .from("generations")
          .select(
            "id, user_id, prompt, generation_type, status, result_data, credits_used, created_at",
          )
          .eq("user_id", auth.user.userId)
          .or(orFilter)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) return jsonResponse({ error: error.message }, 500);
        if (!data) return jsonResponse({ error: "Generation not found." }, 404);

        return jsonResponse(buildResponse(data as GenerationRow));
      },
    },
  },
});
