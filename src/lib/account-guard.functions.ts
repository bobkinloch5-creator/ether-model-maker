import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createHash } from "crypto";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";


// Owner/admin emails that bypass the one-account-per-device rule.
// Sourced from ADMIN_EMAILS env (comma-separated) so privileged identities
// are not hardcoded in source.
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  // Salt with a stable string so the stored hash is not a raw IP
  return createHash("sha256").update(`kd-ip-salt::${ip}`).digest("hex");
}

function clientIpFromHeaders(req: Request): string | null {
  const h = req.headers;
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf;
  const xr = h.get("x-real-ip");
  if (xr) return xr;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return null;
}

// Public pre-check: called BEFORE signup. Returns { blocked: true } if this
// device fingerprint OR this IP has already been used for an account.
export const checkSignupAllowed = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      fingerprint: z.string().min(8).max(128),
      email: z.string().email().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    // Admin emails always allowed
    if (data.email && getAdminEmails().includes(data.email.toLowerCase())) {
      return { blocked: false as const };
    }

    let ipHash: string | null = null;
    try {
      const req = getRequest();
      if (req) ipHash = hashIp(clientIpFromHeaders(req));
    } catch {}

    const { data: rows, error } = await supabaseAdmin
      .from("account_fingerprints")
      .select("id, fingerprint_hash, ip_hash")
      .or(
        ipHash
          ? `fingerprint_hash.eq.${data.fingerprint},ip_hash.eq.${ipHash}`
          : `fingerprint_hash.eq.${data.fingerprint}`,
      )
      .limit(1);

    if (error) {
      // Fail open — never block signups due to a backend hiccup
      return { blocked: false as const };
    }

    if (rows && rows.length > 0) {
      return {
        blocked: true as const,
        reason:
          "An account has already been created from this device or network. Only one account is allowed per user.",
      };
    }
    return { blocked: false as const };
  });

// Best-effort: called AFTER signup/sign-in to record fingerprint+IP for the
// user. Tolerates missing/invalid auth (returns skipped) so it never surfaces
// runtime errors when called before the session has fully hydrated.
export const recordSignupFingerprint = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ fingerprint: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data }) => {
    // Resolve userId from the bearer token if present; otherwise no-op.
    let userId: string | null = null;
    let req: Request | null = null;
    try {
      req = getRequest();
    } catch {}
    const authHeader = req?.headers.get("authorization") ?? null;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (token) {
      try {
        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims } = await sb.auth.getClaims(token);
        if (claims?.claims?.sub) userId = claims.claims.sub as string;
      } catch {}
    }

    if (!userId) return { ok: true, skipped: true as const };

    let ipHash: string | null = null;
    let ua: string | null = null;
    try {
      if (req) {
        ipHash = hashIp(clientIpFromHeaders(req));
        ua = req.headers.get("user-agent");
      }
    } catch {}

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (prof?.email && getAdminEmails().includes(prof.email.toLowerCase())) {
      return { ok: true, skipped: true as const };
    }

    const { data: existing } = await supabaseAdmin
      .from("account_fingerprints")
      .select("id")
      .eq("user_id", userId)
      .eq("fingerprint_hash", data.fingerprint)
      .maybeSingle();
    if (existing) return { ok: true, skipped: true as const };

    const { error } = await supabaseAdmin.from("account_fingerprints").insert({
      user_id: userId,
      fingerprint_hash: data.fingerprint,
      ip_hash: ipHash,
      user_agent: ua,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

