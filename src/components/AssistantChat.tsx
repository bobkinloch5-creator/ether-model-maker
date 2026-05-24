import { useEffect, useRef, useState, Fragment } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { chatViaGateway } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DraggableFab } from "@/components/DraggableFab";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are the KingDavez Studios assistant — a friendly, concise helper for a web app that generates 3D models, PBR textures, and AI images from text or reference photos.

What users can do here:
- Generate page (/generate): enter a text prompt or upload an image. The app will create a 3D model (GLB/OBJ/STL/FBX export), preview it in 3D, and can also produce textures and AI images.
- Dashboard (/dashboard): see usage, plan, and recent generations.
- Profile (/profile): manage account; Theme picker (palette button, bottom-right) changes the site theme.
- Other pages: /community, /credits, /pricing, /faq, /docs, /roadmap, /teams, /login, /signup, /integrations/roblox.
- 3D pipeline: Lovable AI generates a reference image, then a Hugging Face Space (TripoSR / Hunyuan3D) turns it into a mesh. If the HF space is down, a procedural fallback runs.
- Models are exportable and can be used in Second Life, Unity, Unreal, Blender, etc. Use low-poly prompts for SL.
- Keyboard shortcut: ⌘/Ctrl + Enter triggers Generate.

LINK RULES (very important):
- Whenever you reference a page, ALWAYS format it as a markdown link like [Generate](/generate) or [your dashboard](/dashboard).
- Use the real internal path. Never write a bare path without a link, and never invent paths.
- For external resources, use full URLs: [Blender](https://blender.org).

Style: short answers (1–3 sentences), use bullet points for steps, never invent features. If asked about pricing or account specifics you don't know, link the user to [Dashboard](/dashboard) or [FAQ](/faq).`;

// Tiny renderer: turns **bold**, [text](url), and bare /paths into React nodes.
// Internal paths use TanStack Router <Link> so navigation stays client-side.
function renderRich(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, li) => (
    <Fragment key={li}>
      {renderLine(line)}
      {li < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

function renderLine(line: string): React.ReactNode[] {
  // Match markdown links [text](url) OR bare paths/urls.
  const re = /\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s)]+)|(\/[a-zA-Z0-9/_-]+)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const [, label, url, bareUrl, barePath] = m;
    if (label && url) {
      out.push(linkNode(label, url, key++));
    } else if (bareUrl) {
      out.push(linkNode(bareUrl, bareUrl, key++));
    } else if (barePath) {
      out.push(linkNode(barePath, barePath, key++));
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

function linkNode(label: string, url: string, key: number) {
  const isExternal = /^https?:\/\//.test(url);
  if (isExternal) {
    return (
      <a
        key={key}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 text-primary hover:opacity-80"
      >
        {label}
      </a>
    );
  }
  return (
    <Link
      key={key}
      to={url}
      className="underline underline-offset-2 text-primary hover:opacity-80"
    >
      {label}
    </Link>
  );
}

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm the KingDavez assistant. Ask me how to generate a 3D model, export to FBX/GLB, change the theme, or anything else about the app.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = useServerFn(chatViaGateway);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await chat({
        data: {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...next.map((m) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.5,
          maxTokens: 600,
        },
      });
      setMessages([...next, { role: "assistant", content: res.text || "(no reply)" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat failed";
      toast.error(msg);
      setMessages([
        ...next,
        { role: "assistant", content: "Sorry — I couldn't reach the AI service. Please try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <DraggableFab storageKey="fab-pos:chat" defaultRight={20} defaultBottom={96} size={56} zIndex={40}>
          {({ onClickGuard }) => (
            <button
              onClick={onClickGuard(() => setOpen(true))}
              aria-label="Open assistant (drag to move)"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
          )}
        </DraggableFab>
      )}

      {open && (
        <div className="fixed inset-x-2 bottom-2 z-40 flex h-[min(32rem,calc(100dvh-1rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-5 sm:h-[32rem] sm:w-[22rem]">
          <div className="flex items-center justify-between border-b border-border bg-background/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">KingDavez Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.role === "assistant" ? renderRich(m.content) : m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border bg-background/60 p-2">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder="Ask about generating, exporting, themes…"
                className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={send} disabled={busy || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 px-1 text-[10px] text-muted-foreground">
              Enter to send · Shift+Enter for newline
            </p>
          </div>
        </div>
      )}
    </>
  );
}
