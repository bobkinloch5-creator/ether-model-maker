import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Wand2, Palette, MessageCircle, X, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "kd-onboarding-v1";

type Step = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    icon: <Sparkles className="h-6 w-6 text-primary" />,
    title: "Welcome to KingDavez Studios",
    body: "Generate game-ready 3D models, PBR textures, and AI images from a text prompt or a reference photo. Let's take a 30-second tour.",
  },
  {
    icon: <Wand2 className="h-6 w-6 text-primary" />,
    title: "Generate from text or image",
    body: 'Head to the Generate page, type what you want (e.g. "low-poly medieval sword") or upload a reference image. Press ⌘/Ctrl + Enter to fire it off. Export as GLB, OBJ, STL, or FBX — perfect for Second Life, Unity, Unreal, or Blender.',
  },
  {
    icon: <Palette className="h-6 w-6 text-primary" />,
    title: "Make it yours",
    body: "Tap the palette button in the bottom-right to switch theme presets or pick a custom accent color. Your choice is saved on this device.",
  },
  {
    icon: <MessageCircle className="h-6 w-6 text-primary" />,
    title: "Stuck? Ask the assistant",
    body: 'The chat bubble (bottom-right) is an AI assistant that knows the whole app. Ask things like "how do I export FBX?" or "what prompts work best for Second Life?".',
  },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {}
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("kd:open-onboarding", handler);
    return () => window.removeEventListener("kd:open-onboarding", handler);
  }, []);

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={close}
          aria-label="Skip onboarding"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          {s.icon}
        </div>
        <h2 className="text-xl font-semibold text-foreground">{s.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full transition ${
                  i === step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
            )}
            {!last && (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
            {last && (
              <Button size="sm" asChild onClick={close}>
                <Link to="/generate">Start creating</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function openOnboarding() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kd:open-onboarding"));
  }
}
