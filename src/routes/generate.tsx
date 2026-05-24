// @ts-nocheck — legacy ported file; full typing pending
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import styleRealistic from "@/assets/style-realistic.jpg";
import styleStylized from "@/assets/style-stylized.jpg";
import styleCartoon from "@/assets/style-cartoon.jpg";
import styleLowpoly from "@/assets/style-lowpoly.jpg";
import styleVoxel from "@/assets/style-voxel.jpg";
import styleAnime from "@/assets/style-anime.jpg";
import styleSculpture from "@/assets/style-sculpture.jpg";
import styleClay from "@/assets/style-clay.jpg";
import {
  createGeneration,
  updateGenerationStatus,
  CREDIT_COSTS,
  type Generation,
  type Project,
  getProjects,
} from "@/lib/supabase";
import { enhancePrompt, checkLLMStatus } from "@/lib/llm";
import {
  Sparkles,
  Box,
  ImageIcon,
  Palette,
  Wand2,
  ArrowLeft,
  Loader2,
  Coins,
  CheckCircle2,
  XCircle,
  Zap,
  User,
  Copy,
  RefreshCw,
  Download,
  Eye,
  RotateCw,
  ZoomIn,
  Shuffle,
  Layers,
  Sliders,
  ChevronDown,
  Dices,
} from "lucide-react";
import { ModelViewer } from "@/components/ModelViewer";
import { toast } from "sonner";

type GenType = "image-to-3d" | "retexture" | "text-to-image";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: "Generate 3D Models from Text or Image — KingDavez Studios" },
      { name: "description", content: "Turn a prompt or reference photo into a downloadable 3D model with PBR textures. Export GLB, OBJ, STL, or FBX in seconds." },
      { name: "keywords", content: "AI 3D model generator, text to 3D online, image to 3D converter, AI mesh generator, PBR texture generator, GLB exporter, OBJ exporter, FBX exporter, STL exporter, Second Life mesh creator, game asset generator, AI retexturing" },
      { property: "og:title", content: "AI 3D Model Generator — KingDavez Studios" },
      { property: "og:description", content: "Create game-ready 3D meshes and textures from text or images." },
      { property: "og:url", content: "https://kingdavez.click/generate" },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/generate" }],
  }),
  validateSearch: (search: Record<string, unknown>): { type?: GenType; prompt?: string } => {
    const rawType = search.type as string;
    const validType: GenType | undefined = ["image-to-3d", "retexture", "text-to-image"].includes(rawType)
      ? (rawType as GenType)
      : undefined;
    return {
      type: validType,
      prompt: typeof search.prompt === "string" ? search.prompt.slice(0, 500) : undefined,
    };
  },
  component: GeneratePage,
});

const TYPES: { key: GenType; label: string; icon: typeof Box; desc: string }[] = [
  {
    key: "image-to-3d",
    label: "Image → 3D",
    icon: ImageIcon,
    desc: "Upload a reference image to reconstruct 3D",
  },
  {
    key: "text-to-image",
    label: "Text → Image",
    icon: ImageIcon,
    desc: "Generate 2D concept art or textures",
  },
  {
    key: "retexture",
    label: "Re-texture",
    icon: Palette,
    desc: "Re-texture an existing model with AI",
  },
];

function GeneratePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { type: initialType, prompt: initialPrompt } = Route.useSearch();

  const [selectedType, setSelectedType] = useState<GenType>(initialType ?? "image-to-3d");
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [enhancedPromptText, setEnhancedPromptText] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStartedAt, setGenStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  // HF job progress (set by polling loop)
  const [hfStatus, setHfStatus] = useState<"idle" | "queued" | "running" | "complete" | "error">("idle");
  const [hfProgress, setHfProgress] = useState(0);
  const [hfMessage, setHfMessage] = useState("");

  // Tick elapsed time while generating
  useEffect(() => {
    if (!isGenerating || !genStartedAt) return;
    const id = setInterval(() => setElapsedMs(Date.now() - genStartedAt), 100);
    return () => clearInterval(id);
  }, [isGenerating, genStartedAt]);

  const fmtTime = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}:${r.toString().padStart(2, "0")}` : `${r}s`;
  };
  const [currentGen, setCurrentGen] = useState<Generation | null>(null);
  const [error, setError] = useState("");
  const [llmOnline, setLlmOnline] = useState<boolean | null>(null);
  const [previewMode, setPreviewMode] = useState<"3d" | "info">("3d");
  const [isRotating, setIsRotating] = useState(false);
  const [showPromptGen, setShowPromptGen] = useState(false);
  const [quality, setQuality] = useState<"fast" | "balanced" | "hd">("fast");
  const [bakeTexture, setBakeTexture] = useState<boolean>(false);
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  // Publish-to-community state
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDesc, setPublishDesc] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);
  // Retexture state
  const [retexOpen, setRetexOpen] = useState(false);
  const [retexPrompt, setRetexPrompt] = useState("");
  const [retexturing, setRetexturing] = useState(false);

  // Estimated total duration in ms based on type + quality (rough heuristic)
  const estimatedTotalMs = (() => {
    const base: Record<string, number> = {
      "image-to-3d": 22000,
      "text-to-texture": 14000,
      "ai-image": 8000,
    };
    const qMult: Record<string, number> = { fast: 0.6, balanced: 1, hd: 1.8 };
    const b = base[selectedType as string] ?? 18000;
    const m = qMult[quality] ?? 1;
    return Math.round(b * m);
  })();
  const estimatedPct = Math.min(99, Math.round((elapsedMs / estimatedTotalMs) * 100));
  // Prefer real HF job progress when we have it, otherwise fall back to time-based estimate
  const progressPct = hfStatus === "complete"
    ? 100
    : hfStatus === "queued" || hfStatus === "running"
      ? Math.max(hfProgress, Math.min(estimatedPct, 95))
      : estimatedPct;
  // Adaptive remaining: project from real progress once it's meaningful, else heuristic
  const remainingMs = (() => {
    if (hfStatus === "complete") return 0;
    if (progressPct >= 99) return 0;
    if (progressPct >= 5 && elapsedMs > 1500) {
      const projected = (elapsedMs / progressPct) * (100 - progressPct);
      // Blend projection with heuristic early on for stability
      const weight = Math.min(1, (progressPct - 5) / 25);
      const heuristic = Math.max(0, estimatedTotalMs - elapsedMs);
      return Math.round(projected * weight + heuristic * (1 - weight));
    }
    return Math.max(0, estimatedTotalMs - elapsedMs);
  })();
  const doneAt = isGenerating && remainingMs > 0 ? new Date(Date.now() + remainingMs) : null;
  const fmtClock = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });


  // === Meshy-style advanced customization ===
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [artStyle, setArtStyle] = useState<"realistic" | "stylized" | "cartoon" | "low-poly" | "voxel" | "anime" | "sculpture" | "clay">("realistic");
  const [topology, setTopology] = useState<"quad" | "triangle">("triangle");
  const [targetPolycount, setTargetPolycount] = useState<number>(30000);
  const [textureResolution, setTextureResolution] = useState<1024 | 2048 | 4096>(2048);
  const [pbrMaps, setPbrMaps] = useState<boolean>(true);
  const [symmetry, setSymmetry] = useState<"auto" | "on" | "off">("auto");
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1_000_000));
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [aiModel, setAiModel] = useState<"meshy-4" | "meshy-5-preview" | "triposr" | "shape-e" | "auto">("auto");
  const [generateTexture, setGenerateTexture] = useState<boolean>(true);
  const [textureRichness, setTextureRichness] = useState<"low" | "medium" | "high">("high");
  const [remesh, setRemesh] = useState<boolean>(true);
  const [orientation, setOrientation] = useState<"y-up" | "z-up">("y-up");
  // Second Life optimization preset (default ON — this platform targets SL creators)
  const [slOptimize, setSlOptimize] = useState<boolean>(true);
  const [slLODs, setSlLODs] = useState<boolean>(true);

  const ART_STYLES: { key: typeof artStyle; label: string; image: string }[] = [
    { key: "realistic", label: "Realistic", image: styleRealistic },
    { key: "stylized", label: "Stylized", image: styleStylized },
    { key: "cartoon", label: "Cartoon", image: styleCartoon },
    { key: "low-poly", label: "Low Poly", image: styleLowpoly },
    { key: "voxel", label: "Voxel", image: styleVoxel },
    { key: "anime", label: "Anime", image: styleAnime },
    { key: "sculpture", label: "Sculpture", image: styleSculpture },
    { key: "clay", label: "Clay", image: styleClay },
  ];

  // Prompt generator categories
  const PROMPT_STYLES = ["Realistic", "Stylized", "Low-Poly", "Cartoon", "Pixel Art", "Voxel", "Cyberpunk", "Fantasy", "Sci-Fi", "Medieval"];
  const PROMPT_OBJECTS = ["Sword", "Shield", "Helmet", "Chair", "Tree", "Car", "House", "Dragon", "Robot", "Treasure Chest", "Potion Bottle", "Crystal", "Spaceship", "Crown", "Armor"];
  const PROMPT_MATERIALS = ["Metallic", "Wooden", "Stone", "Glass", "Glowing", "Rusty", "Golden", "Ice", "Obsidian", "Enchanted"];
  const PROMPT_DETAILS = ["with intricate engravings", "battle-worn and scratched", "adorned with gems", "emitting magical particles", "covered in vines", "with holographic display", "weathered and ancient", "polished and pristine"];

  const generateRandomPrompt = () => {
    const style = PROMPT_STYLES[Math.floor(Math.random() * PROMPT_STYLES.length)];
    const obj = PROMPT_OBJECTS[Math.floor(Math.random() * PROMPT_OBJECTS.length)];
    const material = PROMPT_MATERIALS[Math.floor(Math.random() * PROMPT_MATERIALS.length)];
    const detail = PROMPT_DETAILS[Math.floor(Math.random() * PROMPT_DETAILS.length)];
    return `A ${style.toLowerCase()} ${material.toLowerCase()} ${obj.toLowerCase()} ${detail}, highly detailed, game-ready asset`;
  };

  const buildPromptFromParts = (style: string, obj: string, material: string, detail: string) => {
    return `A ${style.toLowerCase()} ${material.toLowerCase()} ${obj.toLowerCase()} ${detail}, highly detailed, game-ready asset`;
  };

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | "none">("none");

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  // Check LLM status
  useEffect(() => {
    checkLLMStatus().then(setLlmOnline);
  }, []);

  // Load Projects
  useEffect(() => {
    if (user) {
      getProjects(user.id).then((p) => {
        setProjects(p);
      });
    }
  }, [user]);

  const cost = profile?.is_owner ? 0 : (CREDIT_COSTS[selectedType] ?? 2);
  const hasEnoughCredits = profile?.is_owner || (profile?.credits ?? 0) >= cost;
  const isProceduralPreview = currentGen?.result_data?.generation_method === "procedural";

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    setError("");
    const result = await enhancePrompt(prompt.trim());
    if (result.success) {
      setEnhancedPromptText(result.text);
    } else {
      setError(result.error ?? "Failed to enhance prompt");
    }
    setIsEnhancing(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) return;
    if (!hasEnoughCredits) {
      setError(`Not enough credits. You need ${cost} but have ${profile?.credits ?? 0}.`);
      return;
    }

    setIsGenerating(true);
    setGenStartedAt(Date.now());
    setElapsedMs(0);
    setError("");
    setCurrentGen(null);
    setHfStatus("idle");
    setHfProgress(0);
    setHfMessage("");

    // Step 1: Auto-enhance if not already done
    let finalEnhanced = enhancedPromptText;
    if (!finalEnhanced && llmOnline) {
      const enhanceResult = await enhancePrompt(prompt.trim());
      if (enhanceResult.success) {
        finalEnhanced = enhanceResult.text;
        setEnhancedPromptText(finalEnhanced);
      }
    }

    // Step 2: Generate first for 3D requests so we only charge when the real service succeeds.
    try {
      let gen: Generation | null = null;
      const tempGenerationBase: Generation = {
        id: `local-${Date.now()}`,
        user_id: user.id,
        project_id: selectedProjectId === "none" ? null : selectedProjectId,
        prompt: prompt.trim(),
        enhanced_prompt: finalEnhanced || null,
        generation_type: selectedType,
        status: "processing",
        result_data: {},
        credits_used: 0,
        source: "web",
        is_uploaded: false,
        created_at: new Date().toISOString(),
      };

      if (selectedType === "image-to-3d") {
        setCurrentGen(tempGenerationBase);
      } else {
        gen = await createGeneration(
          user.id,
          prompt.trim(),
          finalEnhanced || null,
          selectedType,
          "web",
          profile?.is_owner ?? false,
          selectedProjectId === "none" ? null : selectedProjectId
        );

        setCurrentGen(gen);
      }

      // Step 3: Call AI services
      let modelUrl = "__procedural__";
      let imageUrl: string | null = null;
      let generationMethod = "procedural";

      // Build a settings-aware prompt so advanced options affect output
      const styleHints: Record<typeof artStyle, string> = {
        realistic: "photorealistic, PBR materials, sharp detail",
        stylized: "stylized hand-painted, expressive shapes",
        cartoon: "cartoon style, bold outlines, exaggerated proportions",
        "low-poly": "low-poly geometry, flat shading, faceted surfaces",
        voxel: "voxel art, blocky cubic shapes, Minecraft-like",
        anime: "anime style, cel-shaded, vibrant colors",
        sculpture: "marble sculpture, classical, monochrome stone",
        clay: "clay model, soft matte surface, claymation",
      };
      const symHint = symmetry === "on" ? "perfectly symmetric" : symmetry === "off" ? "asymmetric, organic" : "";
      // Second Life caps: cheap land impact requires very low tri count + small textures
      const effectivePoly = slOptimize ? Math.min(targetPolycount, 1500) : targetPolycount;
      const effectiveTexRes = slOptimize ? Math.min(textureResolution, 1024) as 1024 | 2048 | 4096 : textureResolution;
      const polyHint = effectivePoly <= 1500
        ? "extremely low-poly, watertight single mesh, optimized for Second Life land impact, baked textures, no thin features"
        : effectivePoly <= 5000 ? "minimal geometry" : effectivePoly >= 100000 ? "ultra-high detail, hero asset" : "";
      const richnessHint = generateTexture ? `${textureRichness}-detail textures${pbrMaps ? " with PBR maps" : ""}` : "untextured";
      const slHints = slOptimize
        ? "Second Life mesh ready, single closed manifold, sealed bottom, no internal geometry, no floating parts, uv unwrapped, baked ambient occlusion, suitable for upload to SL with low LI, prim-friendly compact silhouette"
        : "";
      const slNegatives = slOptimize
        ? "thin spikes, hair strands, intersecting geometry, hollow interiors, separate disconnected parts, overlapping uvs, non-manifold edges, paper-thin walls"
        : "";
      const combinedNegatives = [negativePrompt.trim(), slNegatives].filter(Boolean).join(", ");
      const positiveTail = [styleHints[artStyle], symHint, polyHint, richnessHint, slHints].filter(Boolean).join(", ");
      const negativeTail = combinedNegatives ? ` --no ${combinedNegatives}` : "";
      const composedPrompt = `${finalEnhanced || prompt.trim()}, ${positiveTail}${negativeTail}`;

      if (selectedType === "text-to-image") {
        try {
          const { generateAIImage } = await import("@/lib/ai-image.functions");
          const res = await generateAIImage({
            data: { prompt: composedPrompt },
          });
          if (res.ok) {
            imageUrl = res.imageUrl;
            generationMethod = "lovable-ai";
          } else {
            setError(res.error);
          }
        } catch (e: any) {
          console.warn("AI image gen failed:", e);
          setError(`Image generation failed: ${e.message || e}`);
        }
      }

      let hfError: string | null = null;
      if (selectedType === "image-to-3d") {
        if (!imageDataUrl) {
          const msg = "Please upload an image first.";
          setError(msg);
          setHfStatus("error");
          setHfMessage(msg);
          toast.error("Image required", { description: msg });
          setIsGenerating(false);
          setGenStartedAt(null);
          return;
        }
        try {
          setHfStatus("running");
          setHfProgress(15);
          setHfMessage("Generating with Stable Fast 3D…");

          const { generateSF3DOnly } = await import("@/lib/hf3d.functions");
          const res = await generateSF3DOnly({ data: { imageDataUrl } });

          if (res.ok) {
            modelUrl = res.modelUrl;
            generationMethod = "hf3d";
            setHfStatus("complete");
            setHfProgress(100);
            setHfMessage("Done");
          } else {
            hfError = res.error;
            setHfStatus("error");
            setHfMessage(hfError);
            console.error("[SF3D] failed:", hfError);
          }
        } catch (e: any) {
          const msg = e?.message || String(e);
          hfError = msg;
          setHfStatus("error");
          setHfMessage(msg);
          console.error("[SF3D] threw:", e);
        }
      }




      const settings = {
        composed_prompt: composedPrompt,
        quality,
        art_style: artStyle,
        topology,
        target_polycount: targetPolycount,
        texture_resolution: textureResolution,
        pbr_maps: pbrMaps,
        symmetry,
        seed,
        negative_prompt: negativePrompt || null,
        ai_model: aiModel,
        generate_texture: generateTexture,
        texture_richness: textureRichness,
        remesh,
        orientation,
        sl_optimize: slOptimize,
        sl_generate_lods: slLODs,
        effective_polycount: effectivePoly,
        effective_texture_resolution: effectiveTexRes,
      };

      if (selectedType === "image-to-3d" && generationMethod !== "hf3d") {
        // Real 3D generation failed — surface the error, do not charge, do not
        // create a generation row, do not show a procedural placeholder.
        setCurrentGen(null);
        const reason = hfError || "3D generation service is unavailable. Please try again.";
        setError(reason);
        toast.error("3D generation failed", {
          description: reason.slice(0, 600),
          duration: 12000,
        });

      } else {
        if (!gen) {
          gen = await createGeneration(
            user.id,
            prompt.trim(),
            finalEnhanced || null,
            selectedType,
            "web",
            profile?.is_owner ?? false,
            selectedProjectId === "none" ? null : selectedProjectId
          );
        }

        await updateGenerationStatus(gen.id, "completed", {
          message: "Generation completed successfully",
          enhanced_prompt: finalEnhanced,
          model_type: selectedType,
          generation_method: generationMethod,
          timestamp: new Date().toISOString(),
          model_url: modelUrl,
          image_url: imageUrl,
          source_image_data_url: selectedType === "image-to-3d" ? imageDataUrl || null : null,
          settings,
        });

        setCurrentGen({
          ...gen,
          status: "completed",
          result_data: {
            model_url: modelUrl,
            image_url: imageUrl,
            generation_method: generationMethod,
            source_image_data_url: selectedType === "image-to-3d" ? imageDataUrl || null : null,
            settings,
          }
        });
        await refreshProfile();
        toast.success("Generation complete!", { description: `Used ${generationMethod}` });
      }
    } catch (err: any) {
      console.error(err);
      const msg = `Failed to create generation. ${err.message || err.details || "Unknown error"}`;
      setError(msg);
      toast.error("Generation failed", { description: err.message || "Unknown error" });
    } finally {
      setIsGenerating(false);
      setGenStartedAt(null);
    }
  };

  // Keyboard shortcut: Cmd/Ctrl+Enter to generate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && prompt.trim() && !isGenerating && hasEnoughCredits) {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const resetForm = () => {
    setPrompt("");
    setEnhancedPromptText("");
    setCurrentGen(null);
    setError("");
    setRetexOpen(false);
    setRetexPrompt("");
  };

  // Retexture: re-run image-to-3D against the same source image with a new
  // style/material prompt. Costs 1 credit (vs 3 for a fresh image-to-3D).
  const handleRetexture = async () => {
    if (!user || !currentGen) return;
    const sourceImg = (currentGen.result_data?.source_image_data_url as string) || imageDataUrl;
    if (!sourceImg) {
      toast.error("Can't retexture", { description: "Original source image is unavailable. Generate a new model first." });
      return;
    }
    const retexCost = profile?.is_owner ? 0 : (CREDIT_COSTS["retexture"] ?? 1);
    if (!profile?.is_owner && (profile?.credits ?? 0) < retexCost) {
      toast.error("Not enough credits", { description: `Retexture costs ${retexCost} credits.` });
      return;
    }
    const styleAddendum = retexPrompt.trim();
    setRetexturing(true);
    setError("");
    try {
      const basePrompt = currentGen.prompt || "model";
      const composedPrompt = styleAddendum
        ? `${basePrompt}, retextured: ${styleAddendum}, new materials and surface look, same shape and silhouette`
        : `${basePrompt}, alternate textures and materials, fresh color pass`;

      const { generateHF3D } = await import("@/lib/hf3d.functions");
      const { getBackendConfig, resolveExtraArgs, BACKEND_PRESETS } = await import("@/lib/backend-settings");
      const userBackend = getBackendConfig();
      const triposr = BACKEND_PRESETS.find((p) => p.id === "triposr");
      const attempts = [
        { spaceUrl: userBackend.spaceUrl, apiName: userBackend.apiName, extraArgs: resolveExtraArgs(userBackend.extraArgs), label: "Selected backend" },
        ...(triposr && triposr.spaceUrl !== userBackend.spaceUrl
          ? [{ spaceUrl: triposr.spaceUrl, apiName: triposr.apiName, extraArgs: resolveExtraArgs(triposr.extraArgs), label: triposr.label }]
          : []),
      ];

      let finalUrl: string | null = null;
      let lastErr: string | null = null;
      for (const a of attempts) {
        if (!a.spaceUrl || !a.apiName) continue;
        const res = await generateHF3D({
          data: {
            kind: "image-to-3d",
            prompt: composedPrompt,
            imageDataUrl: sourceImg,
            spaceUrl: a.spaceUrl,
            apiName: a.apiName,
            extraArgs: a.extraArgs,
          },
        });
        if (res.ok && res.modelUrl) {
          finalUrl = res.modelUrl;
          break;
        } else {
          lastErr = res.error || "Retexture failed";
        }
      }

      if (!finalUrl) {
        toast.error("Retexture failed", { description: (lastErr || "Try again in a moment.").slice(0, 220) });
        setError(lastErr || "Retexture failed — no credits charged.");
        return;
      }

      // Only charge after success. Create a new generation row for audit/history.
      const gen = await createGeneration(
        user.id,
        `${basePrompt}${styleAddendum ? ` — retexture: ${styleAddendum}` : " — retexture"}`,
        null,
        "retexture",
        "web",
        profile?.is_owner ?? false,
        currentGen.project_id ?? null,
      );
      if (gen) {
        await updateGenerationStatus(gen.id, "completed", {
          message: "Retexture completed",
          model_type: "retexture",
          generation_method: "hf3d",
          timestamp: new Date().toISOString(),
          model_url: finalUrl,
          source_image_data_url: sourceImg,
          retexture_of: currentGen.id && !currentGen.id.startsWith("local-") ? currentGen.id : null,
          style_prompt: styleAddendum || null,
        });
      }

      setCurrentGen({
        ...currentGen,
        id: gen?.id ?? currentGen.id,
        generation_type: "retexture",
        result_data: {
          ...(currentGen.result_data || {}),
          model_url: finalUrl,
          generation_method: "hf3d",
          source_image_data_url: sourceImg,
          retexture_of: currentGen.id,
          style_prompt: styleAddendum || null,
        },
      });
      setRetexOpen(false);
      setRetexPrompt("");
      await refreshProfile();
      toast.success("Retextured!", { description: `Used ${retexCost} credit${retexCost === 1 ? "" : "s"}.` });
    } catch (e: any) {
      toast.error("Retexture failed", { description: e?.message || String(e) });
      setError(e?.message || String(e));
    } finally {
      setRetexturing(false);
    }
  };

  // Real download handlers
  const downloadGLB = async () => {
    const url = (currentGen?.result_data?.model_url as string) || "__procedural__";
    const promptText = currentGen?.prompt || "model";
    try {
      if (url === "__procedural__" || url === "/demo-model.glb" || url.includes("demo-model")) {
        const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
        const { buildProceduralMesh } = await import("@/lib/procedural");
        const scene = buildProceduralMesh(promptText);
        const exporter = new GLTFExporter();
        exporter.parse(
          scene,
          (gltf) => {
            const blob = new Blob([gltf as ArrayBuffer], { type: "application/octet-stream" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${promptText.slice(0, 20)}.glb`;
            link.click();
          },
          (err) => { console.error(err); alert("GLB export failed."); },
          { binary: true }
        );
      } else {
        const res = await fetch(url);
        const blob = await res.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${promptText.slice(0, 20)}.glb`;
        link.click();
      }
    } catch { alert("GLB export failed."); }
  };

  const downloadOBJ = async () => {
    const url = (currentGen?.result_data?.model_url as string) || "__procedural__";
    const promptText = currentGen?.prompt || "model";
    try {
      const { OBJExporter } = await import("three/examples/jsm/exporters/OBJExporter.js");
      let sceneToExport;
      if (url === "__procedural__" || url === "/demo-model.glb" || url.includes("demo-model")) {
        const { buildProceduralMesh } = await import("@/lib/procedural");
        sceneToExport = buildProceduralMesh(promptText);
      } else {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => loader.load(url, resolve, undefined, reject));
        sceneToExport = gltf.scene;
      }
      const exporter = new OBJExporter();
      const result = exporter.parse(sceneToExport);
      const blob = new Blob([result], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${promptText.slice(0, 20)}.obj`;
      link.click();
    } catch { alert("OBJ export failed."); }
  };

  const downloadSTL = async () => {
    const url = (currentGen?.result_data?.model_url as string) || "__procedural__";
    const promptText = currentGen?.prompt || "model";
    try {
      const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
      let sceneToExport;
      if (url === "__procedural__" || url === "/demo-model.glb" || url.includes("demo-model")) {
        const { buildProceduralMesh } = await import("@/lib/procedural");
        sceneToExport = buildProceduralMesh(promptText);
      } else {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => loader.load(url, resolve, undefined, reject));
        sceneToExport = gltf.scene;
      }
      const exporter = new STLExporter();
      const result = exporter.parse(sceneToExport, { binary: true });
      const blob = new Blob([result], { type: "application/octet-stream" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${promptText.slice(0, 20)}.stl`;
      link.click();
    } catch { alert("STL export failed."); }
  };

  const downloadFBX = async () => {
    const url = (currentGen?.result_data?.model_url as string) || "__procedural__";
    const promptText = currentGen?.prompt || "model";
    try {
      const { FBXExporter } = await import("@/lib/FBXExporter");
      let sceneToExport;
      if (url === "__procedural__" || url === "/demo-model.glb" || url.includes("demo-model")) {
        const { buildProceduralMesh } = await import("@/lib/procedural");
        sceneToExport = buildProceduralMesh(promptText);
      } else {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => loader.load(url, resolve, undefined, reject));
        sceneToExport = gltf.scene;
      }
      const exporter = new FBXExporter();
      const result = exporter.parse(sceneToExport);
      const blob = new Blob([result], { type: "application/octet-stream" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${promptText.slice(0, 20)}.fbx`;
      link.click();
    } catch { alert("FBX export failed."); }
  };

  const downloadUSDZ = async () => {
    const url = (currentGen?.result_data?.model_url as string) || "__procedural__";
    const promptText = currentGen?.prompt || "model";
    try {
      const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
      let sceneToExport;
      if (url === "__procedural__" || url === "/demo-model.glb" || url.includes("demo-model")) {
        const { buildProceduralMesh } = await import("@/lib/procedural");
        sceneToExport = buildProceduralMesh(promptText);
      } else {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => loader.load(url, resolve, undefined, reject));
        sceneToExport = gltf.scene;
      }
      const exporter = new USDZExporter();
      const result = await exporter.parseAsync(sceneToExport);
      const blob = new Blob([result as BlobPart], { type: "model/vnd.usdz+zip" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${promptText.slice(0, 20)}.usdz`;
      link.click();
      toast.success("USDZ ready", { description: "AR-ready for iOS Quick Look." });
    } catch (e) { console.error(e); toast.error("USDZ export failed."); }
  };

  const downloadDAE = async () => {
    const url = (currentGen?.result_data?.model_url as string) || "__procedural__";
    const promptText = currentGen?.prompt || "model";
    try {
      const { DAEExporter } = await import("@/lib/DAEExporter");
      let sceneToExport;
      if (url === "__procedural__" || url === "/demo-model.glb" || url.includes("demo-model")) {
        const { buildProceduralMesh } = await import("@/lib/procedural");
        sceneToExport = buildProceduralMesh(promptText);
      } else {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => loader.load(url, resolve, undefined, reject));
        sceneToExport = gltf.scene;
      }
      const exporter = new DAEExporter();
      const result = exporter.parse(sceneToExport, (promptText || "model").replace(/[^a-z0-9]+/gi, "_").slice(0, 24) || "model");
      const blob = new Blob([result], { type: "model/vnd.collada+xml" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${promptText.slice(0, 20)}.dae`;
      link.click();
      toast.success("DAE ready", { description: "Collada file — drop into Blender, Maya, or Second Life's mesh uploader." });
    } catch (e) { console.error(e); toast.error("DAE export failed."); }
  };

  const downloadForSecondLife = async () => {
    // Second Life mesh uploader accepts Collada (.dae) directly.
    await downloadDAE();
  };

  const downloadTexture = () => {
    const imgUrl = (currentGen?.result_data?.image_url as string) || "/demo-image.jpg";
    fetch(imgUrl).then(r => r.blob()).then(blob => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${(currentGen?.prompt || "texture").slice(0, 20)}_texture.png`;
      link.click();
    }).catch(() => alert("Texture download failed."));
  };

  const downloadImage = () => {
    const imgUrl = (currentGen?.result_data?.image_url as string) || "/demo-image.jpg";
    fetch(imgUrl).then(r => r.blob()).then(blob => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${(currentGen?.prompt || "image").slice(0, 20)}.png`;
      link.click();
    }).catch(() => alert("Image download failed."));
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Premium aurora background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.7_0.22_305_/_0.28),transparent_70%)] blur-2xl" />
        <div className="absolute top-40 -right-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,oklch(0.78_0.16_220_/_0.22),transparent_70%)] blur-2xl" />
        <div className="absolute bottom-0 -left-32 h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.18_45_/_0.18),transparent_70%)] blur-2xl" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/10">
        <div className="glass backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Link>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-glow">
                <Sparkles className="h-3 w-3" /> Studio
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live sync
              </span>
              <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-gradient-to-r from-amber-400/10 to-amber-300/5 px-3 py-1.5 text-sm shadow-[0_0_20px_-10px_oklch(0.85_0.18_85_/_0.6)]">
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="font-semibold">{profile?.is_owner ? "Unlimited" : (profile?.credits ?? 0)}</span>
              </div>
              <Link
                to="/profile"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
              >
                <User className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 lg:py-10">
        {/* Hero header — full width */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <Zap className="h-3 w-3 text-primary-glow" /> AI-Powered Workspace
          </div>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
            <span className="gradient-text">Generate</span> a 3D asset
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Describe what you want — KingDavez Studios crafts game-ready meshes, PBR textures, and concept art in seconds.
          </p>
        </div>

        {/* Split studio layout */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] gap-6 lg:gap-8 items-start">
          {/* LEFT: Controls */}
          <div className="min-w-0 space-y-0">


        {/* LLM status */}
        <div className="mt-6 flex items-center gap-2 text-sm">
          <span className={`flex h-2 w-2 rounded-full ${llmOnline ? "bg-emerald-400" : llmOnline === false ? "bg-red-400" : "bg-yellow-400 animate-pulse"}`} />
          <span className="text-muted-foreground">
            AI Prompt Enhancer:{" "}
            {llmOnline ? (
              <span className="text-emerald-400">Online</span>
            ) : llmOnline === false ? (
              <span className="text-red-400">Offline — AI Server not detected</span>
            ) : (
              <span className="text-yellow-400">Checking…</span>
            )}
          </span>
        </div>

        {/* Type selector */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {TYPES.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setSelectedType(t.key)}
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}
              className={`group rounded-2xl border p-5 text-left transition-all duration-300 animate-fade-in hover:-translate-y-0.5 hover:shadow-[0_10px_40px_-15px_oklch(0.7_0.22_305_/_0.5)] ${
                selectedType === t.key
                  ? "border-primary/50 bg-primary/10 shadow-[0_0_30px_-10px_oklch(0.7_0.22_305_/_0.3)] ring-1 ring-primary/30"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <t.icon
                className={`h-6 w-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                  selectedType === t.key ? "text-primary-glow" : "text-muted-foreground"
                }`}
              />
              <h3 className="mt-3 font-display text-sm font-semibold">{t.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Coins className="h-3 w-3 text-amber-400" />
                {CREDIT_COSTS[t.key]} credits
              </div>
            </button>
          ))}
        </div>


        {/* Prompt/Input area */}
        <div className="mt-8">
          <label className="mb-2 block text-sm font-medium text-foreground/80">
            {selectedType === "image-to-3d" ? "Upload your reference image" : selectedType === "retexture" ? "Upload 3D Model & Describe New Texture" : "Describe your asset"}
          </label>
          <div className="rounded-2xl bg-gradient-to-br from-primary/30 via-white/10 to-transparent p-[1px] shadow-[0_20px_80px_-30px_oklch(0.7_0.22_305_/_0.4)]">
            <div className="glass rounded-2xl p-2 backdrop-blur-xl">
            
            {/* Image to 3D Upload Box */}
            {selectedType === "image-to-3d" && (
              <div className="relative flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-white/20 bg-black/20 hover:bg-black/30 hover:border-primary/50 transition cursor-pointer mb-2 overflow-hidden">
                {imageDataUrl ? (
                  <img src={imageDataUrl} alt="upload preview" className="h-full object-contain" />
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">PNG, JPG up to 10MB</p>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      setError("Image too large (max 10MB)");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImageDataUrl(reader.result as string);
                      setPrompt(`Reference: ${file.name}`);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            )}

            {/* Retexture Upload Box */}
            {selectedType === "retexture" && (
              <div className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-white/20 bg-black/20 hover:bg-black/30 hover:border-primary/50 transition cursor-pointer mb-2 relative">
                <Box className="h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">Upload 3D Model (.glb, .obj)</p>
                <input 
                  type="file" 
                  accept=".glb,.gltf,.obj" 
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      // Append to prompt if they upload
                      setPrompt((prev) => prev ? prev + "\n[Attached: " + e.target.files![0].name + "]" : "[Attached: " + e.target.files![0].name + "] ");
                    }
                  }}
                />
              </div>
            )}

            {/* Project Selection */}
            {projects.length > 0 && (
              <div className="mb-2 px-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Save to Project:</span>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-md text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                >
                  <option value="none">None (Uncategorized)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Textarea for Text-to-3D, Text-to-Image, and Retexture */}
            {selectedType !== "image-to-3d" && (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="An ornate elven longbow with glowing runes, stylized fantasy style…"
                rows={3}
                className="w-full resize-none rounded-xl bg-black/30 p-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none"
              />
            )}

            {/* Mesh Quality (Low Power Mode = Fast). Drives mc_resolution on the local 3D server. */}
            <div className="mt-2 px-1 flex items-center justify-between border-t border-white/5 pt-2 mb-1">
              <span className="text-xs text-muted-foreground font-semibold">
                Mesh Quality:
                <span className="ml-1 text-[10px] text-muted-foreground/70 font-normal normal-case">
                  Fast = low-power (mc 96) · Balanced (128) · HD (256)
                </span>
              </span>
              <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                {(["fast", "balanced", "hd"] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase transition-all tracking-wider ${
                      quality === q
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Bake texture toggle — off by default to keep generation light. */}
            {selectedType === "image-to-3d" && (
              <div className="px-1 flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-semibold">
                  Bake texture
                  <span className="ml-1 text-[10px] text-muted-foreground/70 font-normal normal-case">
                    Off = untextured mesh (fastest). On = bake at {quality === "hd" ? 1024 : 512}px.
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setBakeTexture((v) => !v)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider border transition-all ${
                    bakeTexture
                      ? "bg-primary text-white border-primary/40 shadow-lg shadow-primary/20"
                      : "bg-black/40 text-muted-foreground border-white/5 hover:text-foreground"
                  }`}
                >
                  {bakeTexture ? "On" : "Off"}
                </button>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-2 py-1 mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedType !== "image-to-3d" && (
                  <>
                    {/* Enhance button */}
                    <button
                      onClick={handleEnhance}
                      disabled={!prompt.trim() || isEnhancing || !llmOnline}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                    >
                      {isEnhancing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden xs:inline">Enhance with AI</span>
                      <span className="xs:hidden">Enhance</span>
                    </button>
                    {/* Prompt Generator toggle */}
                    <button
                      onClick={() => setShowPromptGen(!showPromptGen)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                        showPromptGen
                          ? "border-primary/50 bg-primary/10 text-primary-glow"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Prompt Builder</span>
                      <span className="xs:hidden">Builder</span>
                    </button>
                    {/* Advanced toggle */}
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                        showAdvanced
                          ? "border-primary/50 bg-primary/10 text-primary-glow"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      Advanced
                      <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                    </button>
                    {/* Second Life optimize toggle */}
                    <button
                      onClick={() => setSlOptimize((v) => !v)}
                      title="Optimize geometry, textures, and prompt for Second Life upload (low LI, single mesh, baked textures)"
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                        slOptimize
                          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span aria-hidden>🌐</span>
                      <span className="hidden xs:inline">SL Optimize</span>
                      <span className="xs:hidden">SL</span>
                      {slOptimize && <span className="text-[10px]">ON</span>}
                    </button>
                    {/* Random prompt */}
                    <button
                      onClick={() => setPrompt(generateRandomPrompt())}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
                      title="Generate random prompt"
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                      Random
                    </button>
                  </>
                )}
              </div>
              <span className="text-xs text-muted-foreground sm:text-right">
                Cost: <span className="font-semibold text-foreground">{cost}</span> credits
                {profile?.is_owner && " (Owner)"}
              </span>
            </div>
            </div>
          </div>
        </div>

        {/* Advanced Customization Panel (Meshy-style) */}
        {showAdvanced && (
          <div className="mt-4 glass rounded-2xl p-5 animate-scale-in space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-semibold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary-glow" />
                Advanced Customization
              </h3>
              <button
                onClick={() => {
                  setArtStyle("realistic");
                  setTopology("triangle");
                  setTargetPolycount(30000);
                  setTextureResolution(2048);
                  setPbrMaps(true);
                  setSymmetry("auto");
                  setSeed(Math.floor(Math.random() * 1_000_000));
                  setNegativePrompt("");
                  setAiModel("auto");
                  setGenerateTexture(true);
                  setTextureRichness("high");
                  setRemesh(true);
                  setOrientation("y-up");
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                Reset to defaults
              </button>
            </div>

            {/* Art Style */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Art Style</p>
              <div className="grid grid-cols-4 gap-2">
                {ART_STYLES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setArtStyle(s.key)}
                    className={`group flex flex-col items-center gap-1.5 rounded-xl border p-2 text-[11px] font-medium transition overflow-hidden ${
                      artStyle === s.key
                        ? "border-primary/50 bg-primary/15 text-primary-glow shadow-[0_0_20px_-8px_oklch(0.7_0.22_305_/_0.5)]"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    }`}
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/40 ring-1 ring-white/5">
                      <img
                        src={s.image}
                        alt={s.label}
                        loading="lazy"
                        width={512}
                        height={512}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Model + Topology */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">AI Model</p>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value as typeof aiModel)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="meshy-5-preview">Meshy-5 (Preview, sharpest)</option>
                  <option value="meshy-4">Meshy-4 (Balanced)</option>
                  <option value="triposr">TripoSR (Fast, image-to-3D)</option>
                  <option value="shape-e">Shape-E (Stylized)</option>
                </select>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Topology</p>
                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
                  {(["triangle", "quad"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTopology(t)}
                      className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md uppercase transition ${
                        topology === t
                          ? "bg-primary text-white shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "quad" ? "Quads" : "Triangles"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Polycount slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Target Polycount</p>
                <span className="text-xs font-mono text-primary-glow">{targetPolycount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={1000}
                max={300000}
                step={1000}
                value={targetPolycount}
                onChange={(e) => setTargetPolycount(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-1">
                <span>1k (mobile)</span>
                <span>30k (game)</span>
                <span>100k (hero)</span>
                <span>300k (ultra)</span>
              </div>
            </div>

            {/* Texture settings */}
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5 text-pink-400" />
                  Generate Textures
                </label>
                <button
                  onClick={() => setGenerateTexture(!generateTexture)}
                  className={`relative h-5 w-9 rounded-full transition ${generateTexture ? "bg-primary" : "bg-white/10"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${generateTexture ? "left-[18px]" : "left-0.5"}`} />
                </button>
              </div>

              {generateTexture && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Resolution</p>
                      <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
                        {([1024, 2048, 4096] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setTextureResolution(r)}
                            className={`flex-1 px-2 py-1 text-[10px] font-bold rounded-md transition ${
                              textureResolution === r
                                ? "bg-primary text-white"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {r === 1024 ? "1K" : r === 2048 ? "2K" : "4K"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Richness</p>
                      <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
                        {(["low", "medium", "high"] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setTextureRichness(r)}
                            className={`flex-1 px-2 py-1 text-[10px] font-bold rounded-md uppercase transition ${
                              textureRichness === r
                                ? "bg-primary text-white"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="text-[11px] text-muted-foreground">PBR Maps (Albedo + Normal + Roughness + Metallic)</label>
                    <button
                      onClick={() => setPbrMaps(!pbrMaps)}
                      className={`relative h-5 w-9 rounded-full transition ${pbrMaps ? "bg-primary" : "bg-white/10"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${pbrMaps ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Symmetry + Orientation + Remesh */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Symmetry</p>
                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
                  {(["auto", "on", "off"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSymmetry(s)}
                      className={`flex-1 px-2 py-1 text-[10px] font-bold rounded-md uppercase transition ${
                        symmetry === s ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Orientation</p>
                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
                  {(["y-up", "z-up"] as const).map((o) => (
                    <button
                      key={o}
                      onClick={() => setOrientation(o)}
                      className={`flex-1 px-2 py-1 text-[10px] font-bold rounded-md uppercase transition ${
                        orientation === o ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Auto-Remesh</p>
                <button
                  onClick={() => setRemesh(!remesh)}
                  className={`w-full h-[30px] rounded-lg border text-[11px] font-bold uppercase transition ${
                    remesh
                      ? "border-primary/50 bg-primary/15 text-primary-glow"
                      : "border-white/10 bg-white/5 text-muted-foreground"
                  }`}
                >
                  {remesh ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>

            {/* Negative prompt */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Negative Prompt (what to avoid)</p>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, low-quality, extra limbs, distorted, watermark…"
                className="w-full bg-black/40 border border-white/10 rounded-lg text-sm px-3 py-2 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            {/* Seed */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Seed (reproducibility)</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg text-sm px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button
                  onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
                  title="Roll a new seed"
                >
                  <Dices className="h-3.5 w-3.5" /> Random
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Same seed + same settings = identical output.</p>
            </div>
          </div>
        )}

        {/* Prompt Builder Panel */}
        {showPromptGen && selectedType !== "image-to-3d" && (
          <div className="mt-4 glass rounded-2xl p-5 animate-scale-in">
            <h3 className="text-sm font-display font-semibold mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary-glow" />
              Smart Prompt Builder
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Style</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_STYLES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPrompt((prev) => {
                        const cleaned = PROMPT_STYLES.reduce((acc, style) => acc.replace(new RegExp(`\\b${style.toLowerCase()}\\b`, 'gi'), ''), prev).replace(/\s+/g, ' ').trim();
                        return cleaned ? `${s.toLowerCase()} ${cleaned}` : `A ${s.toLowerCase()} `;
                      })}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        prompt.toLowerCase().includes(s.toLowerCase())
                          ? "border-primary/50 bg-primary/20 text-primary-glow"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Object</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_OBJECTS.map((o) => (
                    <button
                      key={o}
                      onClick={() => setPrompt((prev) => prev ? `${prev.trimEnd()} ${o.toLowerCase()} ` : `A ${o.toLowerCase()} `)}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition"
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Material</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_MATERIALS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setPrompt((prev) => prev ? `${prev.trimEnd()} ${m.toLowerCase()} ` : `${m.toLowerCase()} `)}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Details</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_DETAILS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setPrompt((prev) => prev ? `${prev.trimEnd()}, ${d}` : d)}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced prompt preview */}
        {enhancedPromptText && (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-primary-glow">
                <Wand2 className="h-3.5 w-3.5" /> AI-Enhanced Prompt
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(enhancedPromptText);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm text-foreground/90">{enhancedPromptText}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Generate button */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating || !hasEnoughCredits}
            className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[var(--gradient-primary)] text-sm font-semibold text-white shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.6)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_40px_-8px_oklch(0.7_0.22_305_/_0.8)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {/* Animated shine sweep on hover */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {/* Glow pulse when ready */}
            {!isGenerating && hasEnoughCredits && prompt.trim() && (
              <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/30 animate-pulse" />
            )}
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="tabular-nums">Generating… {fmtTime(elapsedMs)} / ~{fmtTime(estimatedTotalMs)}</span>
              </>
            ) : !hasEnoughCredits ? (
              <>
                <Coins className="h-4 w-4" /> Not enough credits — need {cost}, have {profile?.credits ?? 0}
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12" /> Generate ({cost} credits)
                <kbd className="ml-2 hidden md:inline-flex items-center rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-mono opacity-70">⌘/Ctrl + ↵</kbd>
              </>
            )}
          </button>
          {!hasEnoughCredits && !isGenerating && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
              <span className="text-amber-200">
                You're out of credits. Top up or redeem a promo code to keep generating.
              </span>
              <Link
                to="/credits"
                className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 transition-colors"
              >
                Get credits
              </Link>
            </div>
          )}
        </div>
        {/* End LEFT column */}
          </div>

          {/* RIGHT: Sticky Preview / Result panel */}
          <div className="lg:sticky lg:top-24 min-w-0 space-y-5">
            {/* Empty state — shown when no generation yet */}
            {!currentGen && (
              <div className="studio-card overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Studio Preview</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">Idle</span>
                </div>
                <div className="preview-stage relative aspect-square w-full">
                  <div className="absolute inset-0 grid place-items-center text-center px-8">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative h-16 w-16">
                        <div className="absolute inset-0 rounded-2xl bg-[var(--gradient-primary)] opacity-30 blur-xl animate-pulse" />
                        <div className="relative grid h-full w-full place-items-center rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur">
                          <Box className="h-7 w-7 text-primary-glow" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-display text-base font-semibold text-foreground">Your model will appear here</h3>
                        <p className="mt-1 text-xs text-muted-foreground max-w-xs">Pick a generation type, drop in a prompt or image, and hit <span className="text-foreground/90 font-medium">Generate</span>.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/10 text-center">
                  <div className="px-3 py-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Engine</div>
                    <div className="mt-0.5 text-xs font-semibold text-foreground/90">TRELLIS · TripoSR</div>
                  </div>
                  <div className="px-3 py-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Output</div>
                    <div className="mt-0.5 text-xs font-semibold text-foreground/90">.glb / .fbx / .obj</div>
                  </div>
                  <div className="px-3 py-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg time</div>
                    <div className="mt-0.5 text-xs font-semibold text-foreground/90">~60 s</div>
                  </div>
                </div>
              </div>
            )}

        {/* Generation result */}
        {currentGen && (
          <div className={`studio-card p-7 animate-scale-in ${currentGen.status === "processing" ? "conic-ring" : ""}`}>

            {currentGen.status === "processing" ? (
              <>
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <h3 className="mt-4 font-display text-xl font-semibold">
                  Generating your asset…
                </h3>

                {/* Timer + ETA */}
                <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Elapsed</div>
                    <div className="font-mono text-base tabular-nums text-foreground">{fmtTime(elapsedMs)}</div>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ETA</div>
                    <div className="font-mono text-base tabular-nums text-primary-glow">
                      {remainingMs > 0 ? `~${fmtTime(remainingMs)}` : "Finalizing…"}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Progress</div>
                    <div className="font-mono text-base tabular-nums text-foreground">{progressPct}%</div>
                  </div>
                </div>

                {/* Wall-clock ETA */}
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {doneAt ? (
                      <>
                        <span>Estimated done at</span>
                        <span className="font-mono text-foreground tabular-nums normal-case tracking-normal">
                          {fmtClock(doneAt)}
                        </span>
                      </>
                    ) : (
                      <span className="text-primary-glow">Finalizing your asset…</span>
                    )}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-4 mx-auto max-w-md h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-[var(--gradient-primary)] transition-all duration-200 ease-out relative"
                    style={{ width: `${progressPct}%` }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                  </div>
                </div>

                <p className="mt-4 text-xs text-muted-foreground min-h-[1.25rem]">
                  {hfMessage ? (
                    <span className="text-foreground/90">{hfMessage}</span>
                  ) : (

                    <>
                      {progressPct < 30 && "Initializing model & priming the GPU…"}
                      {progressPct >= 30 && progressPct < 65 && "Building geometry and topology…"}
                      {progressPct >= 65 && progressPct < 90 && "Baking PBR textures & shading…"}
                      {progressPct >= 90 && "Almost there — packaging your asset…"}
                    </>
                  )}
                </p>
                {hfStatus !== "idle" && (
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    Hugging Face job: {hfStatus}
                  </p>
                )}
              </>
            ) : currentGen.status === "completed" ? (
              <>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/20 animate-scale-in">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <div className="flex flex-col items-center justify-center gap-2 mt-4">
                  <h3 className="font-display text-xl font-semibold">
                    Generation complete!
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                    Live Generated 3D Asset (Charged)
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  Your 3D asset has been generated. {cost} credits were deducted.
                </p>

                {/* 3D/2D Preview Area */}
                <div className="mt-6 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
                  {/* Preview tabs */}
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPreviewMode("3d")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          previewMode === "3d"
                            ? "bg-primary/20 text-primary-glow"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                      <button
                        onClick={() => setPreviewMode("info")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          previewMode === "info"
                            ? "bg-primary/20 text-primary-glow"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Details
                      </button>
                    </div>
                    {currentGen.generation_type !== "text-to-image" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setIsRotating(!isRotating)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition"
                          title="Toggle rotation"
                        >
                          <RotateCw className={`h-4 w-4 ${isRotating ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition"
                          title="Zoom in"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Preview content */}
                  <div className="relative aspect-video flex items-center justify-center bg-black/40">
                    {previewMode === "3d" ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {currentGen.generation_type === "text-to-image" ? (
                           <img 
                             src={(currentGen.result_data?.image_url as string) || "/demo-image.jpg"} 
                             alt="Generated Image" 
                             className="w-full h-full object-contain"
                           />
                        ) : currentGen.result_data?.model_url || currentGen.status === "completed" ? (
                          <ModelViewer url={(currentGen.result_data?.model_url as string) || "__procedural__"} prompt={currentGen.prompt} />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            Preview not available
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full px-6 py-4 text-left space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Original Prompt</p>
                          <p className="text-sm text-foreground bg-white/5 rounded-lg p-3">{currentGen.prompt}</p>
                        </div>
                        {currentGen.enhanced_prompt && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Enhanced Prompt</p>
                            <p className="text-sm text-foreground/80 bg-white/5 rounded-lg p-3">{currentGen.enhanced_prompt}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="text-sm font-medium capitalize">{currentGen.generation_type.replace("-", " → ")}</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Credits Used</p>
                            <p className="text-sm font-medium">{currentGen.credits_used}</p>
                          </div>
                        </div>
                        {currentGen.result_data?.settings && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mt-2">
                            <p className="text-[11px] font-semibold text-primary-glow uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Sliders className="h-3 w-3" /> Customization Applied
                            </p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                              {Object.entries(currentGen.result_data.settings as Record<string, unknown>)
                                .filter(([k]) => k !== "composed_prompt")
                                .map(([k, v]) => (
                                  <div key={k} className="flex justify-between gap-2 bg-white/[0.03] rounded px-2 py-1">
                                    <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                                    <span className="font-mono text-foreground/90 truncate">{String(v ?? "—")}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons with multiple format options */}
                <div className="mt-4 space-y-3">
                  {currentGen.generation_type === "text-to-image" ? (
                    <>
                      <button
                        onClick={downloadImage}
                        className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-[var(--gradient-primary)] text-sm font-medium text-white transition hover:opacity-95"
                      >
                        <Download className="h-4 w-4" /> Download Image
                      </button>
                      <button
                        onClick={downloadTexture}
                        className="flex w-full items-center justify-center gap-2 h-9 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-muted-foreground transition hover:bg-white/10"
                      >
                        <Layers className="h-3.5 w-3.5" /> Download as Texture
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Primary download button */}
                      <button
                        onClick={downloadGLB}
                        className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-[var(--gradient-primary)] text-sm font-medium text-white transition hover:opacity-95"
                      >
                        <Download className="h-4 w-4" /> Download Model (.GLB)
                      </button>

                      {/* Format selector */}
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                        {[
                          { label: ".GLB", sub: "Universal", color: "text-amber-400", onClick: downloadGLB, title: "Download GLB (Roblox, Unity, web)" },
                          { label: ".FBX", sub: "Studio", color: "text-pink-400", onClick: downloadFBX, title: "Download FBX (Roblox Studio, Maya, Unreal)" },
                          { label: ".DAE", sub: "Collada", color: "text-emerald-400", onClick: downloadDAE, title: "Download DAE (Second Life, Blender, Maya)" },
                          { label: ".OBJ", sub: "Standard", color: "text-green-400", onClick: downloadOBJ, title: "Download OBJ (Blender, ZBrush, anywhere)" },
                          { label: ".STL", sub: "3D Print", color: "text-blue-400", onClick: downloadSTL, title: "Download STL (3D printing)" },
                          { label: ".USDZ", sub: "AR / iOS", color: "text-cyan-400", onClick: downloadUSDZ, title: "Download USDZ (AR Quick Look)" },
                          { label: ".PNG", sub: "Texture", color: "text-purple-400", onClick: downloadTexture, title: "Download PNG texture" },
                        ].map((f, i) => (
                          <button
                            key={f.label}
                            onClick={f.onClick}
                            title={f.title}
                            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                            className="flex flex-col items-center gap-1 p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:-translate-y-0.5 hover:border-white/25 transition-all duration-200 text-xs animate-fade-in"
                          >
                            <span className={`font-bold ${f.color}`}>{f.label}</span>
                            <span className="text-[10px] text-muted-foreground">{f.sub}</span>
                          </button>
                        ))}
                      </div>

                      {/* Platform quick download */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                        <button
                          onClick={downloadFBX}
                          title="Roblox Studio imports .fbx directly"
                          className="group flex items-center justify-center gap-1.5 h-9 rounded-lg border border-white/10 bg-white/5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <span className="text-pink-400 transition-transform group-hover:scale-125">●</span> For Roblox (.fbx)
                        </button>
                        <button
                          onClick={downloadFBX}
                          title="Unity & Unreal prefer .fbx for rigged assets"
                          className="group flex items-center justify-center gap-1.5 h-9 rounded-lg border border-white/10 bg-white/5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <span className="text-green-400 transition-transform group-hover:scale-125">●</span> For Unity (.fbx)
                        </button>
                        <button
                          onClick={downloadGLB}
                          title="Blender opens .glb natively with PBR materials"
                          className="group flex items-center justify-center gap-1.5 h-9 rounded-lg border border-white/10 bg-white/5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <span className="text-amber-400 transition-transform group-hover:scale-125">●</span> For Blender (.glb)
                        </button>
                        <button
                          onClick={downloadForSecondLife}
                          className="group flex items-center justify-center gap-1.5 h-9 rounded-lg border border-emerald-400/30 bg-emerald-400/5 text-xs text-emerald-200 hover:bg-emerald-400/10 hover:-translate-y-0.5 transition-all duration-200"
                          title="Collada (.dae) — direct upload to SL Mesh Uploader"
                        >
                          <span className="text-emerald-400 transition-transform group-hover:scale-125">◆</span> For Second Life (.dae)
                        </button>
                      </div>
                    </>
                  )}

                  {/* Retexture — re-skin the same model for cheap */}
                  {!isProceduralPreview && currentGen.result_data?.model_url && (currentGen.result_data?.source_image_data_url || imageDataUrl) && (
                    !retexOpen ? (
                      <button
                        onClick={() => { setRetexOpen(true); setRetexPrompt(""); }}
                        className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-amber-400/30 bg-amber-400/10 text-sm font-medium text-amber-200 hover:bg-amber-400/20 transition"
                        title="Generate a new texture / material pass on this model"
                      >
                        <Wand2 className="h-4 w-4" /> Retexture this model
                        <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">
                          <Coins className="h-3 w-3" /> {profile?.is_owner ? 0 : (CREDIT_COSTS["retexture"] ?? 1)}
                        </span>
                      </button>
                    ) : (
                      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 space-y-2">
                        <p className="text-xs font-medium text-amber-200/90 uppercase tracking-wider">Retexture</p>
                        <p className="text-[11px] text-muted-foreground">Describe the new look — material, color, finish. We'll re-run on the same source image.</p>
                        <input
                          value={retexPrompt}
                          onChange={(e) => setRetexPrompt(e.target.value.slice(0, 240))}
                          placeholder="e.g. weathered bronze with green patina"
                          maxLength={240}
                          disabled={retexturing}
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setRetexOpen(false); setRetexPrompt(""); }}
                            disabled={retexturing}
                            className="flex-1 h-9 rounded-lg border border-white/10 bg-white/5 text-xs hover:bg-white/10 transition disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleRetexture}
                            disabled={retexturing}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-amber-400 text-xs font-semibold text-black hover:bg-amber-300 transition disabled:opacity-50"
                          >
                            {retexturing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                            {retexturing ? "Retexturing…" : `Retexture (${profile?.is_owner ? 0 : (CREDIT_COSTS["retexture"] ?? 1)} cr)`}
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {/* Generate another */}
                  <button
                    onClick={resetForm}
                    disabled={retexturing}
                    className="flex items-center justify-center gap-2 w-full h-9 rounded-xl border border-white/10 bg-white/5 text-xs font-medium transition hover:bg-white/10 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Generate Another
                  </button>

                  {/* Publish to Community */}
                  {!isProceduralPreview && (currentGen.result_data?.model_url || currentGen.result_data?.image_url) && (
                    publishedPostId ? (
                      <Link
                        to="/community/$postId"
                        params={{ postId: publishedPostId }}
                        className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20 transition"
                      >
                        <CheckCircle2 className="h-4 w-4" /> View your post
                      </Link>
                    ) : !publishOpen ? (
                      <button
                        onClick={() => {
                          setPublishTitle(currentGen.prompt.slice(0, 80));
                          setPublishDesc("");
                          setPublishOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-primary/30 bg-primary/10 text-sm font-medium text-primary-glow hover:bg-primary/20 transition"
                      >
                        <Sparkles className="h-4 w-4" /> Share to Community
                      </button>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Share to Community</p>
                        <input
                          value={publishTitle}
                          onChange={(e) => setPublishTitle(e.target.value.slice(0, 120))}
                          placeholder="Title"
                          maxLength={120}
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <textarea
                          value={publishDesc}
                          onChange={(e) => setPublishDesc(e.target.value.slice(0, 2000))}
                          placeholder="Description (optional)"
                          rows={3}
                          maxLength={2000}
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPublishOpen(false)}
                            className="flex-1 h-9 rounded-lg border border-white/10 bg-white/5 text-xs hover:bg-white/10 transition"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={publishing || !publishTitle.trim()}
                            onClick={async () => {
                              setPublishing(true);
                              try {
                                const { publishCommunityPost } = await import("@/lib/community.functions");
                                const res = await publishCommunityPost({
                                  data: {
                                    generationId: currentGen.id && !currentGen.id.startsWith("local-") ? currentGen.id : undefined,
                                    title: publishTitle.trim(),
                                    description: publishDesc.trim() || undefined,
                                    imageUrl: (currentGen.result_data?.image_url as string) || undefined,
                                    modelUrl: (currentGen.result_data?.model_url as string) || undefined,
                                    generationType: currentGen.generation_type,
                                  },
                                });
                                if (res.ok) {
                                  setPublishedPostId(res.postId);
                                  setPublishOpen(false);
                                  if (res.creditsEarned) {
                                    toast.success(`Shared to Community! +${res.creditsEarned} credits earned`);
                                  } else {
                                    toast.success("Shared to Community!");
                                  }
                                } else {
                                  toast.error("Couldn't share", { description: res.error });
                                }
                              } catch (e: any) {
                                toast.error("Couldn't share", { description: e?.message || String(e) });
                              } finally {
                                setPublishing(false);
                              }
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[var(--gradient-primary)] text-xs font-medium text-white glow disabled:opacity-50"
                          >
                            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            Publish
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle className="mx-auto h-12 w-12 text-destructive" />
                <h3 className="mt-4 font-display text-xl font-semibold">
                  Generation failed
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Something went wrong. Your credits were not charged.
                </p>
                <button
                  onClick={resetForm}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-medium transition hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4" /> Try again
                </button>
              </>
            )}
          </div>
        )}

            {/* Credit costs info */}
            <div className="studio-card p-5">
              <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Credit costs
              </h3>
              <div className="grid gap-3 grid-cols-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-400/10 border border-blue-400/20">
                    <ImageIcon className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">Image → 3D</p>
                    <p className="text-[11px] text-muted-foreground">3 credits</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-pink-400/10 border border-pink-400/20">
                    <Palette className="h-4 w-4 text-pink-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">Re-texture</p>
                    <p className="text-[11px] text-muted-foreground">1 credit</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-400/10 border border-amber-400/20">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">Text → Image</p>
                    <p className="text-[11px] text-muted-foreground">1 credit</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* End RIGHT column */}
        </div>
        {/* End split studio layout */}
      </main>

    </div>
  );
}
