import { Twitter, Facebook, Linkedin, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
  compact?: boolean;
};

export function ShareButtons({ url, title, description, hashtags = [], compact = false }: Props) {
  const text = description ? `${title} — ${description}` : title;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const encodedTitle = encodeURIComponent(title);
  const tagStr = hashtags.length ? `&hashtags=${encodeURIComponent(hashtags.join(","))}` : "";

  const twitter = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}${tagStr}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const reddit = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: description ?? title, url });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  const btn =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition";

  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "flex-wrap"}`}>
      <button onClick={nativeShare} className={btn} aria-label="Share" title="Share">
        <Share2 className="h-4 w-4" />
      </button>
      <a href={twitter} target="_blank" rel="noopener noreferrer" className={btn} aria-label="Share on X" title="Share on X">
        <Twitter className="h-4 w-4" />
      </a>
      <a href={facebook} target="_blank" rel="noopener noreferrer" className={btn} aria-label="Share on Facebook" title="Share on Facebook">
        <Facebook className="h-4 w-4" />
      </a>
      <a href={linkedin} target="_blank" rel="noopener noreferrer" className={btn} aria-label="Share on LinkedIn" title="Share on LinkedIn">
        <Linkedin className="h-4 w-4" />
      </a>
      <a
        href={reddit}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} text-[10px] font-bold`}
        aria-label="Share on Reddit"
        title="Share on Reddit"
      >
        r/
      </a>
      <button onClick={copy} className={btn} aria-label="Copy link" title="Copy link">
        <Link2 className="h-4 w-4" />
      </button>
    </div>
  );
}
