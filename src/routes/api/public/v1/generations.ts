import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateApiKey, corsPreflight, jsonResponse } from "@/lib/api-auth.server";

const ALLOWED_TYPES = new Set([
  "text-to-3d",
  "image-to-3d",
  "retexture",
  "text-to-image",
]);

const CREDIT_COSTS: Record<string, number> = {
  "text-to-3d": 2,
  "image-to-3d": 3,
  "text-to-image": 1,
  retexture: 1,
};

export const Route = createFileRoute("/api/public/v1/generations")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),

      GET: async ({ request }) => {
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

        const url = new URL(request.url);
        const limitRaw = parseInt(url.searchParams.get("limit") ?? "20", 10);
        const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));

        const { data, error } = await supabaseAdmin
          .from("generations")
          .select("id, prompt, generation_type, status, result_data, credits_used, created_at")
          .eq("user_id", auth.user.userId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true, count: data?.length ?? 0, generations: data ?? [] });
      },

      // Create a new generation job. Designed to be callable from Second Life
      // via LSL `llHTTPRequest` using the user's API key.
      POST: async ({ request }) => {
        // Parse body up-front so we can also accept `apiKey` from JSON body.
        let body: Record<string, unknown> = {};
        try {
          body = await request.json();
        } catch {
          // ignore — body is optional if key comes via header
        }

        const auth = await authenticateApiKey(request, {
          bodyKey: typeof body.apiKey === "string" ? body.apiKey : null,
        });
        if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        const type = typeof body.type === "string" ? body.type.trim() : "text-to-3d";
        const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : null;
        const source = typeof body.source === "string" ? body.source.trim().slice(0, 32) : "secondlife";

        if (!prompt || prompt.length < 3 || prompt.length > 1000) {
          return jsonResponse({ error: "Prompt must be 3-1000 chars." }, 400);
        }
        if (!ALLOWED_TYPES.has(type)) {
          return jsonResponse({ error: `Invalid type. Use one of: ${[...ALLOWED_TYPES].join(", ")}` }, 400);
        }
        if (type === "image-to-3d" && !imageUrl) {
          return jsonResponse({ error: "image_url is required for image-to-3d." }, 400);
        }

        const cost = auth.user.isOwner ? 0 : (CREDIT_COSTS[type] ?? 2);
        if (!auth.user.isOwner && auth.user.credits < cost) {
          return jsonResponse(
            { error: "Insufficient credits.", required: cost, balance: auth.user.credits },
            402,
          );
        }

        // Deduct credits via the existing RPC (no-op for owners).
        const { error: deductErr } = await supabaseAdmin.rpc("deduct_credits", {
          user_uuid: auth.user.userId,
          amount: cost,
        });
        if (deductErr) {
          return jsonResponse({ error: deductErr.message || "Insufficient credits" }, 402);
        }

        const { data, error } = await supabaseAdmin
          .from("generations")
          .insert({
            user_id: auth.user.userId,
            prompt,
            enhanced_prompt: null,
            generation_type: type,
            status: "queued",
            credits_used: cost,
            source,
            result_data: imageUrl ? { image_url: imageUrl } : {},
          })
          .select("id, prompt, generation_type, status, credits_used, created_at")
          .single();

        if (error) return jsonResponse({ error: error.message }, 500);

        return jsonResponse(
          {
            ok: true,
            generation: data,
            credits_remaining: auth.user.isOwner ? null : auth.user.credits - cost,
            status_url: `https://kingdavez.click/api/public/v1/generations?limit=1`,
          },
          201,
        );
      },
    },
  },
});
