// Adapter layer — re-exports the Lovable Cloud Supabase client and provides
// the typed helpers the legacy KingDavez Studios UI relies on.
import { supabase } from "@/integrations/supabase/client";

export { supabase };

// ----- Types -----
export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  credits: number;
  api_key: string;
  sl_username: string | null;
  roblox_username: string | null;
  is_owner: boolean;
  is_manager: boolean;
  owner_email: string | null;
  bio: string | null;
  accent_color: string | null;
  banner_gradient: string | null;
  avatar_style: string | null;
  avatar_seed: string | null;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  code_used: string;
  referrer_bonus: number;
  referred_bonus: number;
  created_at: string;
  referred_profile?: { email: string; display_name: string } | null;
}

export async function getMyReferrals(userId: string): Promise<ReferralRow[]> {
  const { data, error } = await supabase
    .from("referrals")
    .select("id, referrer_id, referred_user_id, code_used, referrer_bonus, referred_bonus, created_at")
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("getMyReferrals error:", error); return []; }
  return (data ?? []) as unknown as ReferralRow[];
}

export async function applyReferralCode(code: string): Promise<{ success: boolean; bonus?: number; error?: string }> {
  const { data, error } = await supabase.rpc("apply_referral", { _code: code });
  if (error) return { success: false, error: error.message };
  const result = data as { success?: boolean; bonus?: number } | null;
  return { success: !!result?.success, bonus: result?.bonus };
}



export interface Purchase {
  id: string;
  user_id: string;
  credits: number;
  amount_paid: number;
  payment_method: string;
  transaction_id: string | null;
  status: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  project_id: string | null;
  prompt: string;
  enhanced_prompt: string | null;
  generation_type: "image-to-3d" | "retexture";
  status: "pending" | "processing" | "completed" | "failed";
  result_data: Record<string, unknown>;
  credits_used: number;
  source: "web" | "hud" | "api";
  is_uploaded: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key: string;
  label: string;
  created_at: string;
}

export const CREDIT_COSTS: Record<string, number> = {
  "image-to-3d": 3,
  retexture: 1,
  "manual-upload": 0,
};

// ----- Profile -----
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) { console.error("getProfile error:", error); return null; }
  return data as unknown as Profile | null;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "display_name" | "avatar_url" | "sl_username" | "roblox_username" | "bio" | "accent_color" | "banner_gradient" | "avatar_style" | "avatar_seed">>
): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single();
  if (error) { console.error("updateProfile error:", error); return null; }
  return data as unknown as Profile;
}

export async function getUserStats(userId: string) {
  const { data, error } = await supabase.rpc("get_user_stats", { user_uuid: userId });
  if (error) { console.error("getUserStats error:", error); return null; }
  return data as {
    current_credits: number;
    total_purchased: number;
    total_used: number;
    total_generations: number;
    member_since: string;
  };
}

// ----- Purchases -----
export async function getPurchases(userId: string): Promise<Purchase[]> {
  const { data, error } = await supabase.from("purchases").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) { console.error("getPurchases error:", error); return []; }
  return (data ?? []) as unknown as Purchase[];
}

// ----- Generations -----
export async function createGeneration(
  userId: string,
  prompt: string,
  enhancedPrompt: string | null,
  type: Generation["generation_type"],
  source: Generation["source"] = "web",
  isOwner = false,
  projectId: string | null = null
): Promise<Generation | null> {
  const creditCost = isOwner ? 0 : (CREDIT_COSTS[type] ?? 2);
  const { error: deductError } = await supabase.rpc("deduct_credits", { user_uuid: userId, amount: creditCost });
  if (deductError) {
    console.error("deduct_credits error:", deductError);
    throw new Error(deductError.message || "Insufficient credits");
  }
  const { data, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      project_id: projectId,
      prompt,
      enhanced_prompt: enhancedPrompt,
      generation_type: type,
      status: "processing",
      credits_used: creditCost,
      source,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Generation;
}

export async function updateGenerationStatus(
  generationId: string,
  status: Generation["status"],
  resultData?: Record<string, unknown>
): Promise<void> {
  const updates: { status: string; result_data?: Record<string, unknown> } = { status };
  if (resultData) updates.result_data = resultData;
  const { error } = await supabase.from("generations").update(updates as never).eq("id", generationId);
  if (error) console.error("updateGenerationStatus error:", error);
}

export async function getGenerations(userId: string, limit = 50): Promise<Generation[]> {
  const { data, error } = await supabase.from("generations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) { console.error("getGenerations error:", error); return []; }
  return (data ?? []) as unknown as Generation[];
}

export async function markGenerationUploaded(generationId: string, isUploaded = true): Promise<boolean> {
  const { error } = await supabase.from("generations").update({ is_uploaded: isUploaded }).eq("id", generationId);
  if (error) { console.error("markGenerationUploaded error:", error); return false; }
  return true;
}

/**
 * Submit a PayPal payment claim for owner approval. Does NOT grant credits.
 * Credits are added only after an owner approves the pending purchase from the admin panel.
 * Returns the new purchase id, or null on error.
 */
export async function purchaseCredits(
  _userId: string,
  amount: number,
  paymentMethod = "paypal",
  transactionId?: string,
  amountPaid = 0
): Promise<string | null> {
  const txid = (transactionId ?? "").trim();
  if (!txid) { console.error("purchaseCredits: transaction id required"); return null; }
  const { data, error } = await supabase.rpc("submit_purchase_request", {
    _credits: amount,
    _amount: amountPaid,
    _transaction_id: txid,
    _payment_method: paymentMethod,
  });
  if (error) { console.error("purchaseCredits error:", error); return null; }
  return data as string;
}

// ----- Projects -----
export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase.from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) { console.error("getProjects error:", error); return []; }
  return (data ?? []) as unknown as Project[];
}

export async function createProject(userId: string, name: string, description: string | null = null): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").insert({ user_id: userId, name, description }).select().single();
  if (error) { console.error("createProject error:", error); return null; }
  return data as unknown as Project;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) { console.error("deleteProject error:", error); return false; }
  return true;
}

export async function deleteGeneration(generationId: string): Promise<boolean> {
  const { error } = await supabase.from("generations").delete().eq("id", generationId);
  if (error) { console.error("deleteGeneration error:", error); return false; }
  return true;
}

// ----- API keys -----
export async function getApiKeys(userId: string): Promise<ApiKey[]> {
  const { data, error } = await supabase.from("api_keys").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) { console.error("getApiKeys error:", error); return []; }
  return (data ?? []) as unknown as ApiKey[];
}

export async function createApiKey(userId: string, label = "My API Key") {
  const { data, error } = await supabase.rpc("create_api_key", { user_uuid: userId, key_label: label });
  if (error) { console.error("createApiKey error:", error); return { key: null as ApiKey | null, error: error.message }; }
  return { key: (data as ApiKey[])?.[0] ?? null, error: null };
}

export async function deleteApiKey(keyId: string): Promise<boolean> {
  const { error } = await supabase.from("api_keys").delete().eq("id", keyId);
  if (error) { console.error("deleteApiKey error:", error); return false; }
  return true;
}

export async function regenerateApiKey(userId: string): Promise<string | null> {
  const newKey = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const { data, error } = await supabase.from("profiles").update({ api_key: newKey }).eq("id", userId).select("api_key").single();
  if (error) { console.error("regenerateApiKey error:", error); return null; }
  return (data as { api_key: string })?.api_key ?? null;
}
