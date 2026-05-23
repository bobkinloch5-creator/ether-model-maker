import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============= List feed =============
const LIST_INPUT = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).max(10_000).optional(),
  sort: z.enum(["new", "top"]).optional(),
});

export type CommunityPost = {
  id: string;
  user_id: string;
  generation_id: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  model_url: string | null;
  generation_type: string | null;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
  liked_by_me: boolean;
};

export const listCommunityPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => LIST_INPUT.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<{ ok: true; posts: CommunityPost[] } | { ok: false; error: string }> => {
    const limit = data.limit ?? 24;
    const offset = data.offset ?? 0;
    const sort = data.sort ?? "new";
    const { userId } = context;

    const orderCol = sort === "top" ? "likes_count" : "created_at";
    const { data: rows, error } = await supabaseAdmin
      .from("community_posts")
      .select("id,user_id,generation_id,title,description,image_url,model_url,generation_type,tags,likes_count,comments_count,created_at")
      .eq("is_hidden", false)
      .order(orderCol, { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return { ok: false, error: error.message };
    if (!rows || rows.length === 0) return { ok: true, posts: [] };

    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const postIds = rows.map((r) => r.id);

    const [{ data: profiles }, { data: likes }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,display_name,avatar_url").in("id", userIds),
      supabaseAdmin.from("community_likes").select("post_id").eq("user_id", userId).in("post_id", postIds),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const likedSet = new Set((likes ?? []).map((l) => l.post_id));

    return {
      ok: true,
      posts: rows.map((r) => ({
        ...r,
        tags: r.tags ?? [],
        author_name: profileMap.get(r.user_id)?.display_name ?? null,
        author_avatar: profileMap.get(r.user_id)?.avatar_url ?? null,
        liked_by_me: likedSet.has(r.id),
      })),
    };
  });

// ============= Get single post + comments =============
const GET_INPUT = z.object({ postId: z.string().uuid() });

export const getCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => GET_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: post, error } = await supabaseAdmin
      .from("community_posts")
      .select("id,user_id,generation_id,title,description,image_url,model_url,generation_type,tags,likes_count,comments_count,created_at,is_hidden")
      .eq("id", data.postId)
      .maybeSingle();

    if (error) return { ok: false as const, error: error.message };
    if (!post || post.is_hidden) return { ok: false as const, error: "Post not found" };

    const [{ data: profile }, { data: liked }, { data: comments }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,display_name,avatar_url").eq("id", post.user_id).maybeSingle(),
      supabaseAdmin.from("community_likes").select("post_id").eq("user_id", userId).eq("post_id", post.id).maybeSingle(),
      supabaseAdmin
        .from("community_comments")
        .select("id,user_id,body,created_at")
        .eq("post_id", post.id)
        .eq("is_hidden", false)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);

    const commentUserIds = Array.from(new Set((comments ?? []).map((c) => c.user_id)));
    const { data: commentProfiles } = commentUserIds.length
      ? await supabaseAdmin.from("profiles").select("id,display_name,avatar_url").in("id", commentUserIds)
      : { data: [] as Array<{ id: string; display_name: string; avatar_url: string }> };
    const cpMap = new Map((commentProfiles ?? []).map((p) => [p.id, p]));

    return {
      ok: true as const,
      post: {
        ...post,
        tags: post.tags ?? [],
        author_name: profile?.display_name ?? null,
        author_avatar: profile?.avatar_url ?? null,
        liked_by_me: !!liked,
      },
      comments: (comments ?? []).map((c) => ({
        ...c,
        author_name: cpMap.get(c.user_id)?.display_name ?? null,
        author_avatar: cpMap.get(c.user_id)?.avatar_url ?? null,
      })),
    };
  });

// ============= Publish a generation =============
const PUBLISH_INPUT = z.object({
  generationId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().url().max(2000).optional(),
  modelUrl: z.string().url().max(2000).optional(),
  generationType: z.string().max(60).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
});

export const publishCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PUBLISH_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.imageUrl && !data.modelUrl) {
      return { ok: false as const, error: "Post must include an image or 3D model" };
    }
    const { data: row, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: userId,
        generation_id: data.generationId ?? null,
        title: data.title,
        description: data.description ?? null,
        image_url: data.imageUrl ?? null,
        model_url: data.modelUrl ?? null,
        generation_type: data.generationType ?? null,
        tags: data.tags ?? [],
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };

    // Reward credits for sharing to community
    const REWARD_CREDITS = 25;
    const { data: profile } = await supabaseAdmin.from("profiles").select("credits").eq("id", userId).single();
    const newBalance = (profile?.credits ?? 0) + REWARD_CREDITS;
    await supabaseAdmin
      .from("profiles")
      .update({ credits: newBalance })
      .eq("id", userId);
    await supabaseAdmin.rpc("log_credit_change", {
      _user_id: userId,
      _amount: REWARD_CREDITS,
      _kind: "community_publish",
      _reason: `Earned ${REWARD_CREDITS} credits for publishing to community`,
      _reference_id: row.id,
      _metadata: JSON.stringify({ post_id: row.id }),
    });

    return { ok: true as const, postId: row.id, creditsEarned: REWARD_CREDITS };
  });

// ============= Delete own post =============
const DELETE_INPUT = z.object({ postId: z.string().uuid() });

export const deleteCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DELETE_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("community_posts").delete().eq("id", data.postId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ============= Toggle like =============
const LIKE_INPUT = z.object({ postId: z.string().uuid() });

export const toggleCommunityLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => LIKE_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("community_likes")
      .select("post_id")
      .eq("post_id", data.postId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("community_likes").delete().eq("post_id", data.postId).eq("user_id", userId);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, liked: false };
    }
    const { error } = await supabase.from("community_likes").insert({ post_id: data.postId, user_id: userId });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, liked: true };
  });

// ============= Add comment =============
const COMMENT_INPUT = z.object({
  postId: z.string().uuid(),
  body: z.string().trim().min(1).max(1000),
});

export const addCommunityComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => COMMENT_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("community_comments")
      .insert({ post_id: data.postId, user_id: userId, body: data.body })
      .select("id,created_at")
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, id: row.id, createdAt: row.created_at };
  });

// ============= Delete own comment =============
const DEL_COMMENT_INPUT = z.object({ commentId: z.string().uuid() });

export const deleteCommunityComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DEL_COMMENT_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("community_comments").delete().eq("id", data.commentId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
