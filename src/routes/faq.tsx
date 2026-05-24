import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

const FAQS = [
  {
    q: "How does the AI 3D Generation work?",
    a: "Our AI model takes your text prompts or reference images and translates them into a full 3D mesh, complete with PBR materials (Albedo, Normal, Roughness, Metallic) ready for game engines like Unity, Godot, or Second Life.",
  },
  {
    q: "How do credits work?",
    a: "Credits are used to generate assets. Text-to-3D costs 2 credits, Image-to-3D costs 5 credits, and AI Retexturing costs 3 credits. You can top up your credits anytime from your dashboard.",
  },
  {
    q: "Can I use the generated models in Second Life or Roblox?",
    a: "Absolutely! Once generated, you can download the .GLB / .OBJ files and import them directly. By linking your Second Life or Roblox account in the Dashboard, we can seamlessly deliver them to your inventory.",
  },
  {
    q: "Who owns the generated 3D models?",
    a: "You have full commercial rights to any 3D model you generate using KingDavez Studios. You can sell them in the Second Life Marketplace or use them in your own games.",
  },
  {
    q: "My Second Life account failed to bind. What do I do?",
    a: "Make sure you entered your legacy Second Life name (e.g. 'Bob Resident'). If the issue persists, please contact support in our community Discord.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — KingDavez Studios AI 3D Generator" },
      { name: "description", content: "How AI 3D generation, credits, exports, and Second Life delivery work at KingDavez Studios." },
      { property: "og:title", content: "FAQ — KingDavez Studios" },
      { property: "og:description", content: "Answers about credits, exports, Second Life delivery, and ownership." },
      { property: "og:url", content: "https://kingdavez.click/faq" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-24">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold font-display tracking-tight text-foreground">Frequently Asked Questions</h1>
          <p className="mt-4 text-lg text-muted-foreground">Everything you need to know about KingDavez Studios.</p>
        </div>

        <div className="space-y-6">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-primary/50">
              <h3 className="text-xl font-semibold text-foreground mb-3">{faq.q}</h3>
              <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
