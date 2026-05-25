import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/tos")({
  head: () => ({
    meta: [
      { title: "Terms of Service — KingDavez Studios (Beta)" },
      { name: "description", content: "Terms of service for KingDavez Studios — usage rights, ownership, and account policies for AI 3D generation." },
      { property: "og:title", content: "Terms of Service — KingDavez Studios" },
      { property: "og:description", content: "Usage, ownership, and account policies." },
      { property: "og:url", content: "https://kingdavez.click/tos" },
      { name: "robots", content: "index,follow" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Terms of Service — KingDavez Studios" },
    { name: "twitter:description", content: "KingDavez Studios terms of service, acceptable use policy, and user agreement." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/tos" }],
  }),
  component: TOSPage,
});

function TOSPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-24">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold font-display tracking-tight text-foreground">Terms of Service</h1>
          <p className="mt-4 text-lg text-muted-foreground">Last updated: May 2026</p>
        </div>
        
        <div className="prose prose-invert max-w-none prose-p:text-muted-foreground prose-headings:text-foreground">
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using KingDavez Studios (Magic Mesh Creator), you accept and agree to be bound by the terms and provision of this agreement.</p>
          
          <h2>2. Services Provided</h2>
          <p>We provide AI-powered 3D mesh generation, AI retexturing, and Image-to-3D services specifically targeted for game engine optimization and Second Life content creation.</p>

          <h2>3. Intellectual Property Rights</h2>
          <p>You retain full commercial rights and ownership over any 3D models and textures generated using your prompts or source images. You are free to sell these generated assets on the Second Life Marketplace, Roblox, or any other platform.</p>

          <h2>4. User Responsibilities</h2>
          <p>Users are prohibited from generating illegal, explicit, or copyrighted material that they do not have the rights to use. Accounts found violating these terms may be suspended without a refund of credits.</p>

          <h2>5. Credits and Refunds</h2>
          <p>Credits purchased via PayPal are non-refundable once used. If a generation fails due to a server error, your credits will be automatically refunded to your account balance.</p>

          <h2>6. Third-Party Integrations</h2>
          <p>Linking your Second Life or Roblox accounts is done at your own risk. We only use these linkages to deliver generated assets to your inventory and do not store sensitive login credentials.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
