import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiKey, corsPreflight, jsonResponse } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/public/v1/me")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request }) => {
        const auth = await authenticateApiKey(request);
        if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);
        return jsonResponse({
          ok: true,
          user: {
            id: auth.user.userId,
            email: auth.user.email,
            credits: auth.user.isOwner ? null : auth.user.credits,
            unlimited: auth.user.isOwner,
          },
        });
      },
    },
  },
});
