import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n";

export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Update html lang + dir for accessibility / RTL
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = current.code;
    document.documentElement.dir = current.code === "ar" ? "rtl" : "ltr";
  }, [current.code]);

  const choose = (code: string) => {
    void i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t("common.chooseLanguage")}
        className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition ${
          compact ? "h-9 px-2.5 text-xs" : "h-10 px-3 text-sm"
        }`}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden md:inline">{current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl z-[60] p-1.5 animate-fade-in"
        >
          <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("common.chooseLanguage")}
          </div>
          {LANGUAGES.map((l) => {
            const active = l.code === current.code;
            return (
              <button
                key={l.code}
                onClick={() => choose(l.code)}
                role="option"
                aria-selected={active}
                className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition ${
                  active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <span className="text-lg leading-none">{l.flag}</span>
                <span className="flex-1 text-left">{l.label}</span>
                <span className="text-[10px] font-mono uppercase text-muted-foreground">{l.code}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary-glow" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
