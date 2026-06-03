import { Sparkles, ShoppingBag, MapPin, Users, Mail, MessageSquare } from "lucide-react";
import { SL_LINKS } from "@/lib/second-life";

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-10">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--gradient-primary)]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-semibold">KingDavez Studios</p>
                  <span className="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-glow">
                    Beta
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI 3D generation for Second Life and beyond.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Site
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <a href="/second-life" className="hover:text-foreground transition">
                Second Life
              </a>
              <a href="/docs" className="hover:text-foreground transition">
                Docs
              </a>
              <a href="/faq" className="hover:text-foreground transition">
                FAQ
              </a>
              <a href="/roadmap" className="hover:text-foreground transition">
                Roadmap
              </a>
              <a href="/changelog" className="hover:text-foreground transition">
                What's New
              </a>
              <a href="/tos" className="hover:text-foreground transition">
                Terms of Service
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Find us in Second Life
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <a
                href={SL_LINKS.marketplace}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition"
              >
                <ShoppingBag className="h-3.5 w-3.5" /> SL Marketplace store
              </a>
              <a
                href={SL_LINKS.inworld}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition"
              >
                <MapPin className="h-3.5 w-3.5" /> Thranduil (169, 250, 21)
              </a>
              <a
                href={SL_LINKS.group}
                className="inline-flex items-center gap-1.5 hover:text-foreground transition"
              >
                <Users className="h-3.5 w-3.5" /> Join our SL group
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contact
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <a
                href="mailto:kinlochdavid8@gmail.com"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>kinlochdavid8@gmail.com</span>
              </a>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Second Life: Kingdavez
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-white/5 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} KingDavez Studios. All rights reserved.</p>
          <p>Second Life is a trademark of Linden Research, Inc.</p>
        </div>
      </div>
    </footer>
  );
}
