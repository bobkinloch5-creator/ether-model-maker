import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="fixed bottom-44 right-5 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-card/80 text-foreground shadow-lg backdrop-blur transition hover:scale-105 hover:bg-card"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
