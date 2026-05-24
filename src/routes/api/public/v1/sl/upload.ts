import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateApiKey, corsPreflight, jsonResponse } from "@/lib/api-auth.server";

const UploadSchema = z.object({
  apiKey: z.string().min(8).max(256).optional(),
  generationId: z.string().uuid(),
  paymentMethod: z.enum(["credits", "lindens"]),
});

const UPLOAD_COST_CREDITS = 5;

export const Route = createFileRoute("/api/public/v1/sl/upload")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        let bodyJson: unknown;
        try {
          bodyJson = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON body." }, 400);
        }

        const parsed = UploadSchema.safeParse(bodyJson);
        if (!parsed.success) {
          return jsonResponse({ error: "Invalid request.", details: parsed.error.flatten() }, 400);
        }

        const auth = await authenticateApiKey(request, { bodyKey: parsed.data.apiKey ?? null });
        if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

        // Verify the generation belongs to this user
        const { data: gen, error: genErr } = await supabaseAdmin
          .from("generations")
          .select("id, user_id, status, generation_type, result_data")
          .eq("id", parsed.data.generationId)
          .maybeSingle();

        if (genErr) return jsonResponse({ error: genErr.message }, 500);
        if (!gen) return jsonResponse({ error: "Generation not found." }, 404);
        if (gen.user_id !== auth.user.userId) {
          return jsonResponse({ error: "You do not own this generation." }, 403);
        }
        if (gen.status !== "succeeded" && gen.status !== "completed") {
          return jsonResponse({ error: "Generation is not ready for upload." }, 409);
        }

        if (parsed.data.paymentMethod === "credits") {
          if (!auth.user.isOwner) {
            // Atomic deduction via RPC to prevent double-spend race
            const { data: newBalance, error: deductErr } = await supabaseAdmin.rpc(
              "deduct_credits",
              { user_uuid: auth.user.userId, amount: UPLOAD_COST_CREDITS },
            );
            if (deductErr) {
              const msg = deductErr.message || "";
              if (msg.toLowerCase().includes("insufficient")) {
                return jsonResponse({ error: "Insufficient credits.", required: UPLOAD_COST_CREDITS, balance: auth.user.credits }, 402);
              }
              return jsonResponse({ error: msg }, 500);
            }
            auth.user.credits = typeof newBalance === "number" ? newBalance : auth.user.credits - UPLOAD_COST_CREDITS;
          }
        }
        // For "lindens" the L$ payment is handled in-world via the SL HUD listener.

        return jsonResponse({
          ok: true,
          success: true,
          generationId: gen.id,
          paymentMethod: parsed.data.paymentMethod,
          creditsCharged: parsed.data.paymentMethod === "credits" && !auth.user.isOwner ? UPLOAD_COST_CREDITS : 0,
          newBalance: parsed.data.paymentMethod === "credits" && !auth.user.isOwner
            ? auth.user.credits
            : (auth.user.isOwner ? null : auth.user.credits),
        });
      },
    },
  },
});
