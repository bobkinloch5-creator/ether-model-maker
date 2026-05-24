import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareButtons } from "@/components/ShareButtons";
import { toast } from "sonner";

const POST_URL = "https://kingdavez.click/community/abc-123";
const TITLE = "My epic 3D dragon";
const DESC = "Generated with KingDavez Studios";
const TAGS = ["KingDavezStudios", "AI3D", "dragon"];

function setup(props: Partial<React.ComponentProps<typeof ShareButtons>> = {}) {
  return render(
    <ShareButtons url={POST_URL} title={TITLE} description={DESC} hashtags={TAGS} {...props} />,
  );
}

function getLink(label: RegExp | string): HTMLAnchorElement {
  return screen.getByRole("link", { name: label }) as HTMLAnchorElement;
}

describe("ShareButtons — rendering", () => {
  it("renders all five share targets + native share + copy", () => {
    setup();
    expect(screen.getByRole("button", { name: /^share$/i })).toBeInTheDocument();
    expect(getLink(/Share on X/i)).toBeInTheDocument();
    expect(getLink(/Share on Facebook/i)).toBeInTheDocument();
    expect(getLink(/Share on LinkedIn/i)).toBeInTheDocument();
    expect(getLink(/Share on Reddit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy link/i })).toBeInTheDocument();
  });

  it("opens external share links in a new tab with safe rel attributes", () => {
    setup();
    for (const label of [/Share on X/i, /Share on Facebook/i, /Share on LinkedIn/i, /Share on Reddit/i]) {
      const a = getLink(label);
      expect(a.target).toBe("_blank");
      expect(a.rel).toMatch(/noopener/);
      expect(a.rel).toMatch(/noreferrer/);
    }
  });
});

describe("ShareButtons — URL generation for community posts", () => {
  it("Twitter URL is a valid intent URL with the encoded post URL, text and hashtags", () => {
    setup();
    const u = new URL(getLink(/Share on X/i).href);
    expect(u.origin).toBe("https://twitter.com");
    expect(u.pathname).toBe("/intent/tweet");
    expect(u.searchParams.get("url")).toBe(POST_URL);
    expect(u.searchParams.get("text")).toBe(`${TITLE} — ${DESC}`);
    expect(u.searchParams.get("hashtags")).toBe(TAGS.join(","));
  });

  it("Facebook URL is a valid sharer URL pointing at the community post", () => {
    setup();
    const u = new URL(getLink(/Share on Facebook/i).href);
    expect(u.origin).toBe("https://www.facebook.com");
    expect(u.pathname).toBe("/sharer/sharer.php");
    expect(u.searchParams.get("u")).toBe(POST_URL);
  });

  it("LinkedIn URL is a valid share-offsite URL", () => {
    setup();
    const u = new URL(getLink(/Share on LinkedIn/i).href);
    expect(u.origin).toBe("https://www.linkedin.com");
    expect(u.pathname).toBe("/sharing/share-offsite/");
    expect(u.searchParams.get("url")).toBe(POST_URL);
  });

  it("Reddit URL is a valid submit URL with title + url params", () => {
    setup();
    const u = new URL(getLink(/Share on Reddit/i).href);
    expect(u.origin).toBe("https://www.reddit.com");
    expect(u.pathname).toBe("/submit");
    expect(u.searchParams.get("url")).toBe(POST_URL);
    expect(u.searchParams.get("title")).toBe(TITLE);
  });

  it("omits hashtags from Twitter URL when none are provided", () => {
    setup({ hashtags: [] });
    const href = getLink(/Share on X/i).href;
    expect(href).not.toMatch(/hashtags=/);
  });

  it("falls back to title-only text when no description is given", () => {
    setup({ description: undefined });
    const u = new URL(getLink(/Share on X/i).href);
    expect(u.searchParams.get("text")).toBe(TITLE);
  });

  it("correctly encodes special characters in URLs and titles", () => {
    const trickyUrl = "https://kingdavez.click/community/abc?ref=u/d&x=1";
    const trickyTitle = "100% awesome & free 🚀";
    render(<ShareButtons url={trickyUrl} title={trickyTitle} />);
    const u = new URL(getLink(/Share on X/i).href);
    expect(u.searchParams.get("url")).toBe(trickyUrl);
    expect(u.searchParams.get("text")).toBe(trickyTitle);
    const r = new URL(getLink(/Share on Reddit/i).href);
    expect(r.searchParams.get("url")).toBe(trickyUrl);
    expect(r.searchParams.get("title")).toBe(trickyTitle);
  });
});

describe("ShareButtons — copy + native share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies the post URL to the clipboard and toasts on success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Copy link/i }));
    expect(writeText).toHaveBeenCalledWith(POST_URL);
    expect(toast.success).toHaveBeenCalledWith("Link copied");
  });

  it("toasts an error when clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Copy link/i }));
    expect(toast.error).toHaveBeenCalledWith("Could not copy link");
  });

  it("invokes Web Share API with title/text/url when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share });
    setup();
    await userEvent.click(screen.getByRole("button", { name: /^Share$/i }));
    expect(share).toHaveBeenCalledWith({ title: TITLE, text: DESC, url: POST_URL });
  });
});
