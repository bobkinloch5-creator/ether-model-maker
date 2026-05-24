import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme";
import { ThemePicker } from "@/components/ThemePicker";
import { AssistantChat } from "@/components/AssistantChat";
import { Onboarding } from "@/components/Onboarding";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Please refresh or head home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KingDavez Studios — AI 3D Model Generation" },
      { name: "description", content: "Generate game-ready 3D models, PBR textures and animations from text or images. Built for creators." },
      { name: "keywords", content: "AI 3D model generator, text to 3D, image to 3D, Second Life mesh, Second Life AI mesh, SL marketplace mesh, Thranduil Second Life, low LI mesh, full perm mesh, GLB, FBX, PBR texture, AI texture generator, game asset AI, Second Life builder tools" },
      { name: "author", content: "KingDavez Studios" },
      { name: "theme-color", content: "#0a0a0f" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "KingDavez Studios" },
      { property: "og:title", content: "KingDavez Studios — AI 3D Model Generation" },
      { property: "og:description", content: "Generate game-ready 3D models, PBR textures and animations from text or images. Built for creators." },
      { property: "og:url", content: "https://kingdavez.click/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "KingDavez Studios — AI 3D Model Generation" },
      { name: "twitter:description", content: "Generate game-ready 3D models, PBR textures and animations from text or images. Built for creators." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ab77cbdd-c88a-4423-bac7-6a8dd6412573" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ab77cbdd-c88a-4423-bac7-6a8dd6412573" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "KingDavez Studios",
          url: "https://kingdavez.click",
          description: "AI 3D model, texture, and image generation platform for game devs, indie creators, and Second Life builders.",
          sameAs: [
            "https://marketplace.secondlife.com/stores/269982",
            "https://maps.secondlife.com/secondlife/Thranduil/169/250/21",
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "KingDavez Studios",
          url: "https://kingdavez.click",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Outlet />
          <ScrollToTop />
          <ThemePicker />
          <AssistantChat />
          <Onboarding />
          <Toaster richColors theme="dark" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
