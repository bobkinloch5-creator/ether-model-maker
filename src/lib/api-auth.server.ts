import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuthedUser = {
  userId: string;
  email: string;
  isOwner: boolean;
  credits: number;
};

export type AuthResult =
  | { ok: true; user: AuthedUser; keyId: string | null }
  | { ok: false; status: number; error: string };

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function extractKey(
  request: Request,
  urlKey: string | null,
  bodyKey?: string | null,
): string | null {
  const auth = request.headers.get("authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1].trim();
  }
  const headerKey = request.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();
  if (urlKey) return urlKey.trim();
  if (bodyKey) return bodyKey.trim();
  return null;
}

/**
 * Authenticate a request using an API key. Accepts:
 *  - Authorization: Bearer <key>
 *  - X-API-Key: <key>
 *  - ?api_key=<key>
 *  - JSON body { apiKey } (when bodyKey is provided)
 *
 * Looks up the key in profiles.api_key first (legacy single key per user),
 * then falls back to the api_keys table (multiple named keys per user).
 */
export async function authenticateApiKey(
  request: Request,
  options: { bodyKey?: string | null } = {},
): Promise<AuthResult> {
  const url = new URL(request.url);
  const key = extractKey(request, url.searchParams.get("api_key"), options.bodyKey ?? null);

  if (!key || key.length < 8) {
    return {
      ok: false,
      status: 401,
      error:
        "Missing API key. Send via Authorization: Bearer <key>, X-API-Key header, or ?api_key=.",
    };
  }

  // 1) Legacy: profile.api_key
  const { data: profileMatch } = await supabaseAdmin
    .from("profiles")
    .select("id, email, is_owner, credits, is_banned")
    .eq("api_key", key)
    .maybeSingle();

  if (profileMatch) {
    if (profileMatch.is_banned) {
      return { ok: false, status: 403, error: "Account is suspended." };
    }
    return {
      ok: true,
      keyId: null,
      user: {
        userId: profileMatch.id,
        email: profileMatch.email,
        isOwner: !!profileMatch.is_owner,
        credits: profileMatch.credits ?? 0,
      },
    };
  }

  // 2) Named keys table
  const { data: keyRow } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id")
    .eq("key", key)
    .maybeSingle();

  if (!keyRow) {
    return { ok: false, status: 401, error: "Invalid API key." };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, is_owner, credits, is_banned")
    .eq("id", keyRow.user_id)
    .maybeSingle();

  if (!profile) {
    return { ok: false, status: 401, error: "Key user not found." };
  }

  if (profile.is_banned) {
    return { ok: false, status: 403, error: "Account is suspended." };
  }

  return {
    ok: true,
    keyId: keyRow.id,
    user: {
      userId: profile.id,
      email: profile.email,
      isOwner: !!profile.is_owner,
      credits: profile.credits ?? 0,
    },
  };
}
