import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { listCommunityPosts, toggleCommunityLike, type CommunityPost } from "@/lib/community.functions";
import { Heart, MessageCircle, Box, ImageIcon, ArrowLeft, Loader2, Sparkles, TrendingUp, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community Showcase — KingDavez Studios (Beta)" },
      { name: "description", content: "Browse 3D models, textures, and concept art shared by the KingDavez community. Like, comment, and remix." },
      { property: "og:title", content: "Community Showcase — KingDavez Studios" },
      { property: "og:description", content: "Browse 3D models and concept art shared by the community." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/community" }],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"new" | "top">("new");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    listCommunityPosts({ data: { sort, limit: 48 } })
      .then((res) => {
        if (res.ok) setPosts(res.posts);
        else toast.error("Failed to load community", { description: res.error });
      })
      .finally(() => setLoading(false));
  }, [user, sort]);

  const handleLike = async (post: CommunityPost) => {
    // optimistic
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.likes_count + (p.liked_by_me ? -1 : 1) }
          : p
      )
    );
    const res = await toggleCommunityLike({ data: { postId: post.id } });
    if (!res.ok) {
      // revert
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked_by_me: post.liked_by_me, likes_count: post.likes_count }
            : p
        )
      );
      toast.error("Like failed", { description: res.error });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary-glow" />
              Community
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Share your generations and explore what others are creating.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => setSort("new")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-xs transition ${sort === "new" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Clock className="h-3.5 w-3.5" /> New
              </button>
              <button
                onClick={() => setSort("top")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-xs transition ${sort === "top" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <TrendingUp className="h-3.5 w-3.5" /> Top
              </button>
            </div>
            <Link
              to="/generate"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--gradient-primary)] px-4 text-sm font-medium text-white glow"
            >
              <Sparkles className="h-4 w-4" /> Create & share
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <Sparkles className="h-10 w-10 text-primary-glow mx-auto mb-3" />
            <h2 className="text-lg font-medium">Nothing here yet</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Be the first to share something with the community.</p>
            <Link
              to="/generate"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--gradient-primary)] px-4 text-sm font-medium text-white glow"
            >
              <Sparkles className="h-4 w-4" /> Generate something
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/10 transition flex flex-col"
              >
                <Link to="/community/$postId" params={{ postId: post.id }} className="block aspect-square bg-black/40 relative overflow-hidden">
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-muted-foreground">
                      <Box className="h-10 w-10" />
                    </div>
                  )}
                  {post.model_url && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/90">
                      <Box className="h-3 w-3" /> 3D
                    </span>
                  )}
                  {!post.model_url && post.image_url && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/90">
                      <ImageIcon className="h-3 w-3" /> Image
                    </span>
                  )}
                </Link>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <Link to="/community/$postId" params={{ postId: post.id }} className="font-medium text-sm line-clamp-2 hover:text-primary-glow transition">
                    {post.title}
                  </Link>
                  <div className="flex items-center justify-between mt-auto pt-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {post.author_avatar ? (
                        <img src={post.author_avatar} alt="" className="h-5 w-5 rounded-full" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-white/10" />
                      )}
                      <span className="text-xs text-muted-foreground truncate">{post.author_name ?? "anon"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <button
                        onClick={() => handleLike(post)}
                        className={`inline-flex items-center gap-1 transition ${post.liked_by_me ? "text-pink-400" : "hover:text-foreground"}`}
                        aria-label={post.liked_by_me ? "Unlike" : "Like"}
                      >
                        <Heart className={`h-3.5 w-3.5 ${post.liked_by_me ? "fill-current" : ""}`} />
                        {post.likes_count}
                      </button>
                      <Link to="/community/$postId" params={{ postId: post.id }} className="inline-flex items-center gap-1 hover:text-foreground">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {post.comments_count}
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
