import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/tutorials")({
  head: () => ({
    meta: [
      { title: "Tutorials — AI 3D, Second Life Mesh & PBR Textures" },
      {
        name: "description",
        content:
          "Step-by-step guides for AI-generated 3D models, Second Life mesh creation, PBR texturing, and game-engine imports. Free, beginner-friendly.",
      },
      { property: "og:title", content: "KingDavez Tutorials — AI 3D & Second Life Guides" },
      {
        property: "og:description",
        content: "Learn AI 3D modeling, Second Life mesh upload, PBR texturing and engine imports — free guides.",
      },
      { property: "og:url", content: "https://kingdavez.click/tutorials" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Tutorials — KingDavez Studios" },
    { name: "twitter:description", content: "Step-by-step tutorials for AI 3D model generation, Second Life mesh, and game asset workflows." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/tutorials" }],
  }),
  component: TutorialsLayout,
});

function TutorialsLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
