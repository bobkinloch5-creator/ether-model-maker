import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getCommunityPost,
  toggleCommunityLike,
  addCommunityComment,
  deleteCommunityComment,
  deleteCommunityPost,
} from "@/lib/community.functions";
import { ModelViewer } from "@/components/ModelViewer";
import { ShareButtons } from "@/components/ShareButtons";
import { ArrowLeft, Heart, MessageCircle, Loader2, Trash2, Send, Box, Download } from "lucide-react";
import { toast } from "sonner";

type LoadedPost = {
  id: string;
  user_id: string;
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
type LoadedComment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
};

export const Route = createFileRoute("/community/$postId")({
  head: () => ({
    meta: [
      { title: "Community Post — KingDavez Studios" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<LoadedPost | null>(null);
  const [comments, setComments] = useState<LoadedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getCommunityPost({ data: { postId } })
      .then((res) => {
        if (res.ok) {
          setPost(res.post);
          setComments(res.comments);
        } else {
          toast.error("Could not load post", { description: res.error });
        }
      })
      .finally(() => setLoading(false));
  }, [user, postId]);

  const handleLike = async () => {
    if (!post) return;
    const optimistic = !post.liked_by_me;
    setPost({ ...post, liked_by_me: optimistic, likes_count: post.likes_count + (optimistic ? 1 : -1) });
    const res = await toggleCommunityLike({ data: { postId: post.id } });
    if (!res.ok) {
      setPost(post);
      toast.error("Like failed", { description: res.error });
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !newComment.trim()) return;
    setPosting(true);
    const res = await addCommunityComment({ data: { postId: post.id, body: newComment.trim() } });
    if (res.ok) {
      setComments((prev) => [
        ...prev,
        {
          id: res.id,
          user_id: user!.id,
          body: newComment.trim(),
          created_at: res.createdAt,
          author_name: user!.user_metadata?.display_name ?? user!.email?.split("@")[0] ?? "you",
          author_avatar: null,
        },
      ]);
      setPost({ ...post, comments_count: post.comments_count + 1 });
      setNewComment("");
    } else {
      toast.error("Comment failed", { description: res.error });
    }
    setPosting(false);
  };

  const handleDeleteComment = async (cid: string) => {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== cid));
    if (post) setPost({ ...post, comments_count: Math.max(0, post.comments_count - 1) });
    const res = await deleteCommunityComment({ data: { commentId: cid } });
    if (!res.ok) {
      setComments(prev);
      toast.error("Delete failed", { description: res.error });
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!confirm("Delete this post permanently?")) return;
    const res = await deleteCommunityPost({ data: { postId: post.id } });
    if (res.ok) {
      toast.success("Post deleted");
      navigate({ to: "/community" });
    } else {
      toast.error("Delete failed", { description: res.error });
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Post not found</h1>
          <Link to="/community" className="text-sm text-primary-glow mt-2 inline-block">← Back to community</Link>
        </div>
      </div>
    );
  }

  const isOwn = user.id === post.user_id;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link to="/community" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
          <ArrowLeft className="h-4 w-4" /> Community
        </Link>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          {/* Media */}
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            {post.model_url ? (
              <div className="aspect-square">
                <ModelViewer url={post.model_url} prompt={post.title} />
              </div>
            ) : post.image_url ? (
              <img src={post.image_url} alt={post.title} className="w-full aspect-square object-cover" />
            ) : (
              <div className="aspect-square grid place-items-center text-muted-foreground">
                <Box className="h-12 w-12" />
              </div>
            )}
            {post.image_url && post.model_url && (
              <img src={post.image_url} alt="" className="w-full max-h-40 object-cover border-t border-white/10" />
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">{post.title}</h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                {post.author_avatar ? (
                  <img src={post.author_avatar} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-white/10" />
                )}
                <span>{post.author_name ?? "anon"}</span>
                <span>·</span>
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {post.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.description}</p>
            )}

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <span key={t} className="text-[11px] rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-muted-foreground">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 px-4 text-sm transition ${
                  post.liked_by_me ? "text-pink-400 bg-pink-500/10 border-pink-500/30" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />
                {post.likes_count}
              </button>
              <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4" /> {post.comments_count}
              </span>
              {post.model_url && (
                <a
                  href={post.model_url}
                  download
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 text-sm hover:bg-white/10"
                >
                  <Download className="h-4 w-4" /> .glb
                </a>
              )}
              {isOwn && (
                <button
                  onClick={handleDeletePost}
                  className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-4 text-sm text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Share:</span>
              <ShareButtons
                url={typeof window !== "undefined" ? window.location.href : `https://kingdavez.click/community/${post.id}`}
                title={post.title}
                description={post.description ?? undefined}
                hashtags={["KingDavezStudios", "AI3D", ...post.tags].slice(0, 5)}
              />
            </div>



            {/* Comments */}
            <div className="mt-2">
              <h2 className="text-sm font-medium mb-3">Comments</h2>
              <form onSubmit={handleComment} className="flex gap-2 mb-4">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value.slice(0, 1000))}
                  placeholder="Say something nice…"
                  maxLength={1000}
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  disabled={posting || !newComment.trim()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gradient-primary)] text-white glow disabled:opacity-40"
                  aria-label="Post comment"
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
              <div className="flex flex-col gap-3">
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No comments yet — be the first.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-2.5">
                      {c.author_avatar ? (
                        <img src={c.author_avatar} alt="" className="h-7 w-7 rounded-full shrink-0" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-white/10 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{c.author_name ?? "anon"}</span>
                          <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                          {c.user_id === user.id && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="ml-auto text-muted-foreground hover:text-red-300"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
