import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Text-to-image via Lovable AI Gateway (Nano Banana / gemini-2.5-flash-image).
 * Returns a data:image/png;base64,... URL.
 */
const INPUT = z.object({
  prompt: z.string().min(1).max(2000),
  model: z.string().optional(),
});

export const generateAIImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => INPUT.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "LOVABLE_API_KEY not configured" };
    }
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: data.model || "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: data.prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) return { ok: false as const, error: "Rate limit reached. Please try again shortly." };
        if (res.status === 402) return { ok: false as const, error: "AI credits exhausted. Add funds in workspace settings." };
        return { ok: false as const, error: `AI gateway error ${res.status}: ${txt.slice(0, 200)}` };
      }

      const json = await res.json();
      const imageUrl: string | undefined =
        json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) {
        return { ok: false as const, error: "AI gateway returned no image" };
      }
      return { ok: true as const, imageUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return { ok: false as const, error: msg };
    }
  });

/**
 * Edit/restyle an existing image with a prompt (used for retexturing).
 * Sends the source image + instruction to Gemini 2.5 flash image. Returns a
 * data:image/...;base64,... URL of the restyled result.
 */
const EDIT_INPUT = z.object({
  prompt: z.string().min(1).max(2000),
  imageDataUrl: z.string().min(20),
  model: z.string().optional(),
});

export const editAIImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => EDIT_INPUT.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "LOVABLE_API_KEY not configured" };
    }
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: data.model || "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: data.prompt },
                { type: "image_url", image_url: { url: data.imageDataUrl } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) return { ok: false as const, error: "Rate limit reached. Please try again shortly." };
        if (res.status === 402) return { ok: false as const, error: "AI credits exhausted. Add funds in workspace settings." };
        return { ok: false as const, error: `AI gateway error ${res.status}: ${txt.slice(0, 200)}` };
      }

      const json = await res.json();
      const imageUrl: string | undefined =
        json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) {
        return { ok: false as const, error: "AI gateway returned no image" };
      }
      return { ok: true as const, imageUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return { ok: false as const, error: msg };
    }
  });

