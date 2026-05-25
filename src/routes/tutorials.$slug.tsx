import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Guide = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  sections: { h: string; body: string }[];
  faqs: { q: string; a: string }[];
};

const GUIDES: Record<string, Guide> = {
  "second-life-mesh": {
    slug: "second-life-mesh",
    title: "How to Make Mesh for Second Life (Full Guide)",
    description:
      "Build, rig, texture and upload mesh to Second Life — from AI-generated GLB to a finished in-world item.",
    intro:
      "Second Life mesh is the bridge between modern 3D pipelines and SL's 20-year-old viewer. This guide walks through every step: generating or importing a mesh, preparing it for SL's uploader, rigging when needed, and getting low Land Impact (LI) so the item is cheap to rez.",
    sections: [
      {
        h: "1. Generate or import the base mesh",
        body:
          "Start with a clean GLB. KingDavez Studios' AI generator produces SL-friendly GLBs from a text prompt or a reference image — pick 'Second Life' as the export preset to cap polygon count and avoid n-gons. If you already have a Blender file, export as Collada (.dae) since SL only natively imports DAE for the uploader.",
      },
      {
        h: "2. Prepare the mesh in Blender (optional but recommended)",
        body:
          "Open the GLB/DAE in Blender, apply scale (Ctrl+A → Scale), make sure normals face outward (Mesh → Normals → Recalculate Outside), and confirm a single material slot per piece. SL uploads each material as its own face — keep it under 8 faces per object to save LI.",
      },
      {
        h: "3. Texture & PBR maps",
        body:
          "SL classic shaders use diffuse + specular + normal. SL's PBR materials (gltf 2.0) use base color, normal, metallic-roughness, and emissive. Bake your maps in Blender or generate them with KingDavez's AI texture tool. Keep textures at 1024×1024 — 2048 doubles upload cost without much visible gain in-world.",
      },
      {
        h: "4. Upload to Second Life",
        body:
          "Open the Build → Upload → Mesh Model dialog in your viewer. Drag your DAE in, set physics to 'Lowest' for static props, and check the LOD tabs. The uploader shows the LI cost in real time — aim for under 2 LI for furniture, under 5 LI for a full outfit. Pay the upload fee (10 L$ per mesh) and your asset lands in your inventory.",
      },
      {
        h: "5. Rig mesh for Second Life avatars",
        body:
          "For clothing or attachments, parent the mesh to an SL-compatible armature (Bento, Maitreya, Legacy, etc.) in Blender, weight-paint it, and check 'Include Skin Weights' in the SL uploader. Test fit on the actual body brand — most creators ship one rigged version per popular body to avoid clipping.",
      },
      {
        h: "6. Sell or share in-world",
        body:
          "Drop the finished mesh into a prim or wear it directly. Set permissions (Copy/Modify/Transfer) before listing on the SL Marketplace. KingDavez Studios runs a Marketplace store and an in-world shop on Thranduil — we offer full-perm mesh kits if you'd rather skip the modeling step entirely.",
      },
    ],
    faqs: [
      {
        q: "How do you make mesh in Second Life?",
        a: "You don't model directly in SL — you create the mesh in Blender, Maya, or with an AI tool, export as Collada (.dae), and upload it through the Build → Upload → Mesh Model dialog in the SL viewer.",
      },
      {
        q: "How do you upload mesh to Second Life?",
        a: "Open your viewer, click Build → Upload → Mesh Model, drag in your .dae file, configure LODs and physics, and pay the 10 L$ upload fee. The mesh appears in your inventory as a usable object.",
      },
      {
        q: "How do you rig mesh for Second Life?",
        a: "In Blender, parent the mesh to an SL-compatible armature, weight-paint it to match the bones (Bento for newer bodies), then enable 'Include Skin Weights' in the SL mesh uploader.",
      },
      {
        q: "How do you make mesh clothes for Second Life?",
        a: "Model the garment around an SL avatar reference, rig it to the body's armature (e.g. Maitreya, Legacy, Reborn), bake textures in Blender, and upload it as a rigged mesh through the SL viewer.",
      },
      {
        q: "How do you texture mesh clothing in Second Life?",
        a: "UV-unwrap the mesh in Blender, paint or generate diffuse/normal/specular maps (or PBR base color + ORM for the new SL materials), apply them in Blender to preview, and assign the same textures in-world after upload.",
      },
    ],
  },
  "ai-3d-models": {
    slug: "ai-3d-models",
    title: "How to Generate 3D Models with AI (Beginner's Guide)",
    description:
      "Turn a text prompt or a single image into a game-ready 3D model in minutes. No modeling skills required.",
    intro:
      "AI 3D generation has gone from research demo to production tool in under two years. This guide shows what works today, what doesn't, and how to get a usable mesh on the first try.",
    sections: [
      {
        h: "What AI can (and can't) generate today",
        body:
          "AI 3D works well for props, creatures, weapons, vehicles, environments, and stylized characters. It struggles with very precise hard-surface mechanical parts and tightly rigged humanoid characters — for those, use AI as a starting block and finish in Blender.",
      },
      {
        h: "Text-to-3D vs Image-to-3D",
        body:
          "Text-to-3D is fast and free-form: 'medieval lantern, copper, weathered'. Image-to-3D is more accurate when you already know exactly what you want — upload a reference photo or concept art, and the model reconstructs geometry to match. Image-to-3D usually wins on shape fidelity.",
      },
      {
        h: "Step-by-step in KingDavez Studios",
        body:
          "Sign in, click Generate, choose Text-to-3D or Image-to-3D, enter your prompt or upload an image, pick the export format (GLB/OBJ/FBX/DAE) and quality preset. Generation takes 30–90 seconds. Preview the model in the in-browser viewer, then download or send straight to Second Life / Roblox.",
      },
      {
        h: "Cleaning up the result",
        body:
          "Even the best AI output benefits from a quick pass: import to Blender, decimate if the polycount is too high, recalculate normals, and re-bake textures if you need very specific UVs. For most game uses, the raw GLB is fine.",
      },
    ],
    faqs: [
      {
        q: "Can AI generate 3D models?",
        a: "Yes. Modern AI tools generate game-ready 3D meshes with PBR textures from a text prompt or a reference image in under two minutes. Quality is good enough for indie games, Second Life, Roblox, and prototyping.",
      },
      {
        q: "Which AI can generate 3D models?",
        a: "KingDavez Studios, Meshy, Rodin, and a handful of open research models (TripoSR, Hunyuan3D) can all generate 3D. KingDavez focuses on game-ready output (GLB/FBX/PBR) and direct Second Life delivery.",
      },
      {
        q: "How do you use AI to generate 3D models?",
        a: "Write a clear prompt or upload a reference image, pick an export format and quality preset, then generate. Most platforms return a downloadable GLB you can import into Blender, Unity, Unreal, Godot, Roblox, or Second Life.",
      },
      {
        q: "Is there an AI 3D model generator that's free?",
        a: "KingDavez Studios offers free credits to start. Many platforms use credit-based pricing — typically 2–5 credits per generation — instead of subscription fees, so you only pay for what you generate.",
      },
    ],
  },
  "pbr-textures": {
    slug: "pbr-textures",
    title: "How to Make PBR Textures with AI (Albedo, Normal, Roughness)",
    description:
      "Generate seamless PBR texture sets and plug them into Blender, Unity, Unreal or Second Life materials.",
    intro:
      "A PBR (Physically Based Rendering) material is a set of texture maps that describe how a surface reacts to light. Get them right and your asset looks correct under any lighting; get them wrong and it looks plastic or muddy in every engine.",
    sections: [
      {
        h: "The five maps you actually need",
        body:
          "Base Color (Albedo) — flat surface color, no lighting. Normal — fake surface bumps. Roughness — how matte vs. glossy the surface is. Metallic — how metal-like the surface is (almost always 0 or 1). Ambient Occlusion — soft shadows in crevices. Emissive is optional for glow.",
      },
      {
        h: "Generating a PBR set with AI",
        body:
          "In KingDavez Studios, open the Texture Generator, type a prompt like 'weathered oak planks, mossy', set tile size (1024 or 2048), and enable 'Tileable'. The AI produces all five maps at once, all seamless. Download the ZIP and you're done.",
      },
      {
        h: "Plugging it into Blender",
        body:
          "Drag all maps into the Shader Editor. Connect: Base Color → Principled BSDF Base Color, Normal → Normal Map node → Normal slot, Roughness → Roughness, Metallic → Metallic, AO → multiply with Base Color. Make sure Roughness/Metallic/AO are set to Non-Color in the texture node.",
      },
      {
        h: "Plugging it into Unity / Unreal / Godot",
        body:
          "Unity (URP/HDRP) and Godot 4 read GLB materials natively — just import the GLB. Unreal pulls FBX with embedded textures and auto-creates materials. For SL's new PBR system, pack metallic + roughness + AO into one ORM texture before upload.",
      },
    ],
    faqs: [
      {
        q: "How do you make PBR textures with AI?",
        a: "Use an AI texture generator (KingDavez, Adobe Substance 3D Sampler, or open tools like ArmorLab) to produce a full PBR set — base color, normal, roughness, metallic, and AO — from a single prompt or reference image.",
      },
      {
        q: "What is a PBR texture?",
        a: "A PBR texture is a set of image maps that describe how a surface reflects light in a physically accurate way. The standard set is base color, normal, roughness, metallic, and ambient occlusion.",
      },
      {
        q: "Are AI-generated PBR textures seamless?",
        a: "Yes, when you enable the 'Tileable' option. The generator outputs maps that wrap continuously across UVs without visible seams.",
      },
    ],
  },
  "retexture-models": {
    slug: "retexture-models",
    title: "How to Retexture a 3D Model with AI",
    description:
      "Swap or restyle the textures on any 3D model with a text prompt. Keep the geometry, change the look.",
    intro:
      "Retexturing is the fastest way to get more value from existing 3D assets. One mesh, ten different looks — useful for games, Second Life vendor variants, and rapid prototyping.",
    sections: [
      {
        h: "When to retexture vs regenerate",
        body:
          "Retexture when you like the silhouette but want a different style (medieval → cyberpunk, wood → marble). Regenerate when the shape itself is wrong. Retexturing also keeps your UVs and rigging intact — much safer than starting over.",
      },
      {
        h: "How retexturing works in KingDavez",
        body:
          "Upload your GLB/FBX, type a style prompt ('rusted iron, glowing runes'), and the AI projects new PBR maps onto your existing UVs. Process takes ~30 seconds. Compare side-by-side in the viewer before downloading.",
      },
      {
        h: "Tips for clean results",
        body:
          "Use a model with a single UV set if possible. Avoid overlapping UVs — the AI will paint both sides at once. Reference images help a lot: 'retexture in the style of this concept art' beats 'make it cool'.",
      },
    ],
    faqs: [
      {
        q: "How do you retexture a 3D model?",
        a: "Upload the model, write a style prompt or attach a reference image, and let the AI generate a new PBR texture set that matches your existing UVs. Replace the textures in your shader and the model is restyled.",
      },
      {
        q: "Can AI retexture a 3D model without breaking the rig?",
        a: "Yes. Retexturing only changes the texture maps — geometry, UVs, and skinning weights are untouched, so rigged characters keep their animations.",
      },
    ],
  },
};

export const Route = createFileRoute("/tutorials/$slug")({
  loader: ({ params }) => {
    const guide = GUIDES[params.slug];
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ params, loaderData }) => {
    const g = loaderData?.guide;
    if (!g) {
      return { meta: [{ title: "Tutorial — KingDavez Studios" }] };
    }
    return {
      meta: [
        { title: `${g.title} | KingDavez Studios` },
        { name: "description", content: g.description },
        { property: "og:title", content: g.title },
        { property: "og:description", content: g.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `https://kingdavez.click/tutorials/${params.slug}` },
        { name: "twitter:title", content: g.title },
        { name: "twitter:description", content: g.description },
      ],
      links: [{ rel: "canonical", href: `https://kingdavez.click/tutorials/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.title,
            description: g.description,
            author: { "@type": "Organization", name: "KingDavez Studios" },
            publisher: { "@type": "Organization", name: "KingDavez Studios" },
            mainEntityOfPage: `https://kingdavez.click/tutorials/${params.slug}`,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: g.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
      ],
    };
  },
  component: TutorialPage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">Tutorial not found</h1>
      <Link to="/tutorials" className="mt-6 inline-block text-primary underline">Back to all tutorials</Link>
    </main>
  ),
  errorComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <Link to="/tutorials" className="mt-6 inline-block text-primary underline">Back to all tutorials</Link>
    </main>
  ),
});

function TutorialPage() {
  const { guide } = Route.useLoaderData();
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Link to="/tutorials" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> All tutorials
      </Link>

      <article>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">{guide.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{guide.intro}</p>

        <div className="mt-12 space-y-10">
          {guide.sections.map((s: Guide["sections"][number]) => (
            <section key={s.h}>
              <h2 className="font-display text-2xl font-semibold tracking-tight">{s.h}</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Frequently asked</h2>
          <div className="mt-4 space-y-4">
            {guide.faqs.map((f: Guide["faqs"][number]) => (
              <details key={f.q} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <summary className="cursor-pointer font-semibold text-foreground">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="font-display text-2xl font-semibold">Ready to try it yourself?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate your first AI 3D model in under 90 seconds. Free credits to start.
          </p>
          <Link
            to="/generate"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
          >
            Open the generator <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </article>
    </main>
  );
}
