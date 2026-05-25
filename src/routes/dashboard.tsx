// @ts-nocheck — legacy ported file; full typing pending
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getGenerations,
  CREDIT_COSTS,
  type Generation,
  type Project,
  getProjects,
  createProject,
  deleteProject,
  deleteGeneration,
  regenerateApiKey,
  updateProfile,
  markGenerationUploaded,
  purchaseCredits,
} from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Coins,
  Box,
  ImageIcon,
  Palette,
  Clock,
  ArrowRight,
  LogOut,
  User,
  Zap,
  TrendingUp,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Upload,
  CreditCard,
  UserCheck,
  Check,
  Calendar,
  ShieldCheck,
  DollarSign,
  Folder,
  Plus,
  Trash2,
  X,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Key,
  Download,
  Flame,
  Megaphone,
} from "lucide-react";
import { ModelViewer } from "@/components/ModelViewer";
import { assistantChat } from "@/lib/llm";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { toast } from "sonner";
import { useScrollAnimate } from "@/hooks/useScrollAnimate";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — KingDavez Studios AI 3D Generator" },
      { name: "description", content: "Manage your AI-generated 3D models, projects, credits, API keys, and Second Life deliveries from your KingDavez Studios dashboard." },
      { name: "keywords", content: "AI 3D dashboard, 3D model manager, text-to-3D projects, Second Life mesh delivery, PBR texture library, GLB downloads, game asset manager" },
      { property: "og:title", content: "Dashboard — Manage Your AI 3D Models & Credits | KingDavez Studios" },
      { property: "og:description", content: "Manage your AI-generated 3D models, projects, credits, and Second Life deliveries." },
      { property: "og:url", content: "https://kingdavez.click/dashboard" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Dashboard — KingDavez Studios" },
      { name: "twitter:description", content: "Manage your AI-generated 3D models, projects, credits, and Second Life deliveries." },
    ],
    links: [{ rel: "canonical", href: "https://kingdavez.click/dashboard" }],
  }),
  component: DashboardPage,
});

const TYPE_LABELS: Record<string, { label: string; icon: typeof Box; color: string }> = {
  "image-to-3d": { label: "Image → 3D", icon: ImageIcon, color: "text-blue-400" },
  retexture: { label: "Re-texture", icon: Palette, color: "text-pink-400" },
};

const STATUS_DISPLAY: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  completed: { label: "Done", icon: CheckCircle2, cls: "text-emerald-400" },
  processing: { label: "Processing", icon: Loader2, cls: "text-amber-400" },
  pending: { label: "Queued", icon: Clock, cls: "text-muted-foreground" },
  failed: { label: "Failed", icon: XCircle, cls: "text-destructive" },
};

function DashboardPage() {
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingGens, setLoadingGens] = useState(true);
  const [timeTick, setTimeTick] = useState(0);
  const [previewGen, setPreviewGen] = useState<Generation | null>(null);

  // Tick every second to update progress bars and timers if there are active generations
  useEffect(() => {
    const hasActive = generations.some(g => g.status === "processing" || g.status === "pending");
    if (!hasActive) return;

    const interval = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [generations]);

  // Poll generations if any are processing or pending to auto-update status when completed
  useEffect(() => {
    const hasActive = generations.some(g => g.status === "processing" || g.status === "pending");
    if (!hasActive) return;

    const interval = setInterval(() => {
      if (user) {
        getGenerations(user.id).then((g) => {
          setGenerations(g);
        });
      }
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [generations, user]);

  const getProgressDetails = (createdAtStr: string, genType: string) => {
    const elapsedMs = Date.now() - new Date(createdAtStr).getTime();
    const elapsedSec = Math.floor(elapsedMs / 1000);
    
    // Standard estimation of generation times in seconds
    const totalEstSec = genType === "image-to-3d" ? 180 : genType === "retexture" ? 60 : 120;
    const remainingSec = Math.max(0, totalEstSec - elapsedSec);
    const progressPercent = Math.min(99, Math.round((elapsedSec / totalEstSec) * 100));

    const formatTime = (sec: number) => {
      if (sec < 60) return `${sec}s`;
      const mins = Math.floor(sec / 60);
      const remaining = sec % 60;
      return remaining > 0 ? `${mins}m ${remaining}s` : `${mins}m`;
    };

    return {
      elapsedText: formatTime(elapsedSec),
      etaText: remainingSec > 0 ? `~${formatTime(remainingSec)}` : "Any second now...",
      progressPercent
    };
  };

  const downloadAsGLB = async (url: string, prompt: string) => {
    try {
      toast.info("Preparing GLB file...");
      if (url === "/demo-model.glb" || url.includes("demo-model")) {
        const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
        const { buildProceduralMesh } = await import("@/lib/procedural");
        const sceneToExport = buildProceduralMesh(prompt);
        
        const exporter = new GLTFExporter();
        exporter.parse(
          sceneToExport,
          (gltf) => {
            const blob = new Blob([gltf as ArrayBuffer], { type: "application/octet-stream" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${prompt.slice(0, 20)}.glb`;
            link.click();
            toast.success("GLB download started!");
          },
          (err) => {
            console.error("GLB export parse error:", err);
            toast.error("Failed to export as GLB.");
          },
          { binary: true }
        );
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${prompt.slice(0, 20)}.glb`;
        link.click();
        toast.success("GLB download started!");
      }
    } catch (err) {
      console.error("GLB export error:", err);
      toast.error("Failed to export as GLB.");
    }
  };

  const downloadAsOBJ = async (url: string, prompt: string) => {
    try {
      toast.info("Preparing OBJ file...");
      const { OBJExporter } = await import("three/examples/jsm/exporters/OBJExporter.js");
      
      let sceneToExport;
      if (url === "/demo-model.glb" || url.includes("demo-model")) {
        const { buildProceduralMesh } = await import("@/lib/procedural");
        sceneToExport = buildProceduralMesh(prompt);
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
      link.download = `${prompt.slice(0, 20)}.obj`;
      link.click();
      toast.success("OBJ download started!");
    } catch (err) {
      console.error("OBJ export error:", err);
      toast.error("Failed to export as OBJ.");
    }
  };

  const downloadAsSTL = async (url: string, prompt: string) => {
    try {
      toast.info("Preparing STL file...");
      const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
      
      let sceneToExport;
      if (url === "/demo-model.glb" || url.includes("demo-model")) {
        const { buildProceduralMesh } = await import("@/lib/procedural");
        sceneToExport = buildProceduralMesh(prompt);
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
      link.download = `${prompt.slice(0, 20)}.stl`;
      link.click();
      toast.success("STL download started!");
    } catch (err) {
      console.error("STL export error:", err);
      toast.error("Failed to export as STL.");
    }
  };

  const downloadAsFBX = async (url: string, prompt: string) => {
    try {
      toast.info("Preparing FBX file...");
      const { FBXExporter } = await import("@/lib/FBXExporter");
      
      let sceneToExport;
      if (url === "/demo-model.glb" || url.includes("demo-model")) {
        const { buildProceduralMesh } = await import("@/lib/procedural");
        sceneToExport = buildProceduralMesh(prompt);
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
      link.download = `${prompt.slice(0, 20)}.fbx`;
      link.click();
      toast.success("FBX download started!");
    } catch (err) {
      console.error("FBX export error:", err);
      toast.error("Failed to export as FBX.");
    }
  };

  const downloadTexture = async (imageUrl: string, filename: string) => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_texture.png`;
      link.click();
    } catch {
      alert("Failed to download texture.");
    }
  };

  const handleDeleteGen = async (genId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this generation?")) return;
    const ok = await deleteGeneration(genId);
    if (ok) {
      setGenerations((prev) => prev.filter((g) => g.id !== genId));
      if (previewGen?.id === genId) {
        setPreviewGen(null);
      }
    } else {
      alert("Failed to delete generation.");
    }
  };

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Modals state
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{ credits: number; cost: number } | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"select" | "pay" | "success">("select");
  const [slUsernameInput, setSlUsernameInput] = useState("");
  const [updatingSL, setUpdatingSL] = useState(false);
  const [slBindSuccess, setSlBindSuccess] = useState(false);

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const [uploadStep, setUploadStep] = useState<"choice" | "processing" | "success">("choice");
  const [uploadPaymentMethod, setUploadPaymentMethod] = useState<"credits" | "lindens" | null>(null);

  // API key state
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [regeneratingApiKey, setRegeneratingApiKey] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  // Load generations and projects
  const loadGenerations = () => {
    if (user) {
      getGenerations(user.id).then((g) => {
        setGenerations(g);
        setLoadingGens(false);
      });
      getProjects(user.id).then((p) => {
        setProjects(p);
      });
    }
  };

  useEffect(() => {
    loadGenerations();
  }, [user]);

  // Realtime: refresh dashboard when teammates add/update shared projects or generations
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-collab")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => loadGenerations())
      .on("postgres_changes", { event: "*", schema: "public", table: "generations" }, () => loadGenerations())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members", filter: `user_id=eq.${user.id}` }, () => loadGenerations())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Expiration calculation helper
  const getExpirationStatus = (createdAtStr: string) => {
    const createdAt = new Date(createdAtStr).getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const expiresAt = createdAt + threeDaysMs;
    const remainingMs = expiresAt - Date.now();

    if (remainingMs <= 0) {
      return { isExpired: true, text: "Expired" };
    }

    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return {
      isExpired: false,
      text: `Expires in ${days}d ${hours}h`,
    };
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim() || creatingProject) return;
    setCreatingProject(true);
    const proj = await createProject(user.id, newProjectName.trim());
    if (proj) {
      setProjects([proj, ...projects]);
      setNewProjectName("");
      setCreateProjectOpen(false);
    }
    setCreatingProject(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("Are you sure you want to delete this project? All generations inside it will be permanently deleted.")) {
      const success = await deleteProject(projectId);
      if (success) {
        setProjects(projects.filter(p => p.id !== projectId));
        if (selectedProjectId === projectId) {
          setSelectedProjectId(null);
        }
        loadGenerations(); // Reload generations as some might have cascaded deleted
      }
    }
  };

  const handleUpdateSLUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !slUsernameInput.trim() || updatingSL) return;
    setUpdatingSL(true);
    const updated = await updateProfile(user.id, { sl_username: slUsernameInput.trim() });
    if (updated) {
      await refreshProfile();
      setSlUsernameInput("");
      setSlBindSuccess(true);
      setTimeout(() => setSlBindSuccess(false), 3000);
    } else {
      alert("Failed to bind Second Life account.");
    }
    setUpdatingSL(false);
  };

  const handleRegenerateApiKey = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to regenerate your API Key? Any application or HUD using your old key will stop working immediately.")) return;
    setRegeneratingApiKey(true);
    const key = await regenerateApiKey(user.id);
    if (key) {
      await refreshProfile();
      alert("Successfully generated a new API Key!");
    } else {
      alert("Failed to regenerate API Key.");
    }
    setRegeneratingApiKey(false);
  };

  const handleBuyCredits = async (credits: number) => {
    if (!user) return;
    setCheckoutStep("pay");
    setSelectedPackage({ credits, cost: credits === 50 ? 5 : credits === 150 ? 12 : 25 });
  };

  const handleCompletePayment = async (details?: any) => {
    if (!user || !selectedPackage) return;
    setCheckoutStep("pay");
    const transactionId = details?.id ?? details?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const purchaseId = await purchaseCredits(user.id, selectedPackage.credits, "paypal", transactionId, selectedPackage.cost);
    if (purchaseId !== null) {
      setCheckoutStep("success");
    }
  };

  const triggerUpload = async (method: "credits" | "lindens") => {
    if (!user || !selectedGen) return;
    setUploadPaymentMethod(method);
    setUploadStep("processing");

    // Send HTTP call to the API
    try {
      const response = await fetch("/api/public/v1/sl/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: profile?.api_key,
          generationId: selectedGen.id,
          paymentMethod: method,
        }),
      });

      const res = await response.json();
      if (response.ok && res.success) {
        await refreshProfile();
        loadGenerations();
        setUploadStep("success");
      } else {
        alert(res.error || "Failed to process upload");
        setUploadStep("choice");
      }
    } catch (err: any) {
      alert("Error processing upload: " + err.message);
      setUploadStep("choice");
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);

    const result = await assistantChat(
      msg,
      chatMessages.map((m) => ({ role: m.role, content: m.content }))
    );

    setChatMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: result.success
          ? result.text
          : result.error ?? "Sorry, I couldn't respond. Is the AI server reachable?",
      },
    ]);
    setChatLoading(false);
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalCreditsUsed = generations.reduce((sum, g) => sum + g.credits_used, 0);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/10">
        <div className="glass">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--gradient-primary)]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-base font-semibold tracking-tight">
                KingDavez<span className="text-muted-foreground">.studio</span>
              </span>
              <span className="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-glow">
                Beta
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Credits badge */}
              <button
                onClick={() => {
                  setCheckoutStep("select");
                  setBuyCreditsOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 transition"
              >
                <Coins className="h-4 w-4 text-amber-400 animate-pulse" />
                <span className="font-semibold">{profile?.is_owner ? "Unlimited" : (profile?.credits ?? 0)}</span>
                <span className="text-muted-foreground">credits</span>
                <span className="ml-1 text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">BUY</span>
              </button>
              <Link
                to="/profile"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
              >
                <User className="h-4 w-4 text-muted-foreground" />
              </Link>
              <button
                onClick={() => signOut().then(() => navigate({ to: "/" }))}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10">
        {/* What's New Banner */}
        <WhatsNewBanner />

        {/* Welcome */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Welcome back,{" "}
              <span className="gradient-text">
                {profile?.display_name || user.email?.split("@")[0]}
              </span>
            </h1>
            <p className="mt-1 text-muted-foreground">
              Here's your studio at a glance.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 md:items-stretch w-full md:w-auto">
            {/* Second Life Link Account */}
            <div className="glass rounded-xl p-4 w-full md:w-80 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary-glow" />
                  Second Life Account Binding
                </h4>
                <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                  Bind your Second Life legacy username to deliver 3D assets automatically in-world.
                </p>
              </div>
              {profile?.sl_username ? (
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs font-medium text-muted-foreground">Bound SL Name:</span>
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                    {profile.sl_username}
                  </span>
                </div>
              ) : (
                <form onSubmit={handleUpdateSLUsername} className="flex flex-col gap-2 mt-auto">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="SL Username (e.g. Bob Resident)"
                      value={slUsernameInput}
                      onChange={(e) => setSlUsernameInput(e.target.value)}
                      className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                      required
                    />
                    <button
                      type="submit"
                      disabled={updatingSL}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {updatingSL ? "Saving..." : "Bind"}
                    </button>
                  </div>
                  {slBindSuccess && (
                    <p className="text-xs text-emerald-400 font-medium">Successfully bound your account!</p>
                  )}
                </form>
              )}
            </div>

            {/* Developer API Key */}
            <div className="glass rounded-xl p-4 w-full md:w-96 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-primary-glow" />
                  Developer API Access
                </h4>
                <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                  Use this API key in external integration scripts or HUDs to access generations.
                </p>
              </div>
              <div className="flex flex-col gap-2 mt-auto">
                <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5">
                  <input
                    type={showApiKey ? "text" : "password"}
                    readOnly
                    value={profile?.api_key || "No API Key found"}
                    className="flex-1 bg-transparent text-xs text-foreground font-mono focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1 text-muted-foreground hover:text-foreground transition"
                    title={showApiKey ? "Hide API Key" : "Show API Key"}
                  >
                    {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (profile?.api_key) {
                        navigator.clipboard.writeText(profile.api_key);
                        setCopiedApiKey(true);
                        setTimeout(() => setCopiedApiKey(false), 2000);
                      }
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground transition"
                    title="Copy to Clipboard"
                  >
                    {copiedApiKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={regeneratingApiKey}
                  onClick={handleRegenerateApiKey}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${regeneratingApiKey ? "animate-spin" : ""}`} />
                  {regeneratingApiKey ? "Generating..." : "Regenerate API Key"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {[
            {
              icon: Coins,
              iconBg: "bg-amber-500/20",
              iconColor: "text-amber-400",
              label: "Credits remaining",
              value: profile?.is_owner ? "Unlimited" : (profile?.credits ?? 0),
              action: { label: "+ Buy More", onClick: () => { setCheckoutStep("select"); setBuyCreditsOpen(true); } }
            },
            {
              icon: TrendingUp,
              iconBg: "bg-purple-500/20",
              iconColor: "text-purple-400",
              label: "Total generations",
              value: generations.length,
            },
            {
              icon: Zap,
              iconBg: "bg-pink-500/20",
              iconColor: "text-pink-400",
              label: "Credits used",
              value: totalCreditsUsed,
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="glass rounded-2xl p-6 hover-lift transition-all duration-500"
              style={{
                animationDelay: `${i * 100}ms`,
                opacity: 1,
                transform: "translateY(0)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-2xl font-semibold">{stat.value}</p>
                    {stat.action && (
                      <button
                        onClick={stat.action.onClick}
                        className="text-[10px] font-bold text-amber-400 hover:underline"
                      >
                        {stat.action.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {(
            [
              {
                type: "image-to-3d" as const,
                title: "Image to 3D",
                desc: "Reconstruct a 3D model from a reference image",
                icon: ImageIcon,
                cost: CREDIT_COSTS["image-to-3d"],
              },
              {
                type: "text-to-image" as const,
                title: "Text to Image",
                desc: "Generate concept art and textures from a prompt",
                icon: Sparkles,
                cost: CREDIT_COSTS["text-to-image"],
              },
              {
                type: "retexture" as const,
                title: "AI Re-texture",
                desc: "Re-texture a model with AI-driven PBR materials",
                icon: Palette,
                cost: CREDIT_COSTS["retexture"],
              },
            ] as const
          ).map((action, i) => (
            <Link
              key={action.type}
              to="/generate"
              search={{ type: action.type }}
              className="glass group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_40px_-15px_oklch(0.7_0.22_305_/_0.25)] animate-fade-in"
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
            >
              <div className="flex items-start justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--gradient-primary)] shadow-[0_8px_30px_-8px_oklch(0.7_0.22_305_/_0.4)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
                  {action.cost} credits
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">
                {action.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{action.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary-glow opacity-0 transition group-hover:opacity-100">
                Start <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

        {/* Projects Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              My Projects
            </h2>
            <button
              onClick={() => setCreateProjectOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/30 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              New Project
            </button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            <button
              onClick={() => setSelectedProjectId(null)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                selectedProjectId === null
                  ? "bg-primary text-white"
                  : "glass hover:bg-white/5"
              }`}
            >
              <Folder className="h-4 w-4" />
              All
            </button>
            {projects.map((proj) => (
              <div key={proj.id} className="relative group flex-shrink-0">
                <button
                  onClick={() => setSelectedProjectId(proj.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition pr-8 ${
                    selectedProjectId === proj.id
                      ? "bg-primary text-white"
                      : "glass hover:bg-white/5"
                  }`}
                >
                  <Folder className="h-4 w-4" />
                  {proj.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(proj.id);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition ${
                    selectedProjectId === proj.id ? "text-white/70 hover:text-white hover:bg-white/20" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/20"
                  }`}
                  title="Delete Project"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent generations */}
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">
            {selectedProjectId ? "Project Generations" : "Recent Generations"}
          </h2>
          {loadingGens ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : generations.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Box className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-muted-foreground">
                No generations yet. Start creating!
              </p>
              <Link
                to="/generate"
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--gradient-primary)] px-5 text-sm font-medium text-white transition hover:opacity-95"
              >
                Generate your first asset{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {generations
                .filter((g) => (selectedProjectId ? g.project_id === selectedProjectId : true))
                .slice(0, 10)
                .map((gen, i) => {
                const typeInfo = TYPE_LABELS[gen.generation_type] ?? TYPE_LABELS["image-to-3d"];
                const statusInfo = STATUS_DISPLAY[gen.status] ?? STATUS_DISPLAY["pending"];
                const TypeIcon = typeInfo.icon;
                const StatusIcon = statusInfo.icon;

                // Calculate expiration timer
                const expiry = getExpirationStatus(gen.created_at);

                return (
                  <div
                    key={gen.id}
                    onClick={() => {
                      if (gen.status === "completed") {
                        setPreviewGen(gen);
                      }
                    }}
                    className={`glass group flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)] animate-fade-in ${
                      gen.status === "completed" ? "cursor-pointer hover:bg-white/[0.04] hover:border-white/20" : ""
                    }`}
                    style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {gen.status === "completed" && gen.result_data?.image_url ? (
                        <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-white/10 group/thumb">
                          <img
                            src={gen.result_data.image_url as string}
                            alt="Preview Thumbnail"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            <Eye className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5 ${typeInfo.color}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                      )}
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {gen.prompt}
                          </p>
                          {gen.status === "completed" && (
                            <span className="text-[10px] text-primary-glow border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to Preview
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span>{typeInfo.label}</span>
                          <span>·</span>
                          <span>{gen.credits_used} credits</span>
                          <span>·</span>
                          <span>{new Date(gen.created_at).toLocaleDateString()}</span>
                          <span>·</span>
                          <span className={`font-medium ${expiry.isExpired ? "text-red-400" : "text-amber-400"}`}>
                            {expiry.text}
                          </span>
                        </div>

                        {/* Progress Bar & Real-time Timer */}
                        {(gen.status === "processing" || gen.status === "pending") && (() => {
                          const progress = getProgressDetails(gen.created_at, gen.generation_type);
                          return (
                            <div className="mt-2.5 max-w-md w-full">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-3 w-3 animate-pulse text-amber-400" />
                                  Running: <span className="text-white font-mono">{progress.elapsedText}</span>
                                </span>
                                <span>
                                  {gen.status === "pending" 
                                    ? "Queued in database..." 
                                    : `Generating... ${progress.progressPercent}% (ETA: ${progress.etaText})`
                                  }
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${
                                    gen.status === "pending"
                                      ? "bg-muted-foreground/40 animate-pulse w-[8%]"
                                      : "bg-gradient-to-r from-amber-500 via-primary to-primary-glow"
                                  }`} 
                                  style={gen.status === "processing" ? { width: `${progress.progressPercent}%` } : undefined}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                      <div className={`flex items-center gap-1.5 text-xs ${statusInfo.cls}`}>
                        <StatusIcon className={`h-3.5 w-3.5 ${gen.status === "processing" ? "animate-spin" : ""}`} />
                        {statusInfo.label}
                      </div>

                       {/* Upload & Download Buttons */}
                      <div className="flex gap-2">
                        {gen.status === "completed" && !!gen.result_data?.model_url && (
                          <div className="flex rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAsGLB(gen.result_data!.model_url as string, gen.prompt);
                              }}
                              className="flex items-center gap-1 hover:bg-white/10 transition text-xs font-semibold px-2 py-1.5 border-r border-white/10 text-white"
                              title="Download GLB file"
                            >
                              GLB
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAsOBJ(gen.result_data!.model_url as string, gen.prompt);
                              }}
                              className="flex items-center gap-1 hover:bg-white/10 transition text-xs font-semibold px-2 py-1.5 border-r border-white/10 text-white"
                              title="Download OBJ file"
                            >
                              OBJ
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAsSTL(gen.result_data!.model_url as string, gen.prompt);
                              }}
                              className="flex items-center gap-1 hover:bg-white/10 transition text-xs font-semibold px-2 py-1.5 border-r border-white/10 text-white"
                              title="Download STL file"
                            >
                              STL
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAsFBX(gen.result_data!.model_url as string, gen.prompt);
                              }}
                              className="flex items-center gap-1 hover:bg-white/10 transition text-xs font-semibold px-2 py-1.5 text-white"
                              title="Download FBX file"
                            >
                              FBX
                            </button>
                          </div>
                        )}
                        {gen.status === "completed" && !expiry.isExpired && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!profile?.sl_username) {
                                alert("Please bind your Second Life Username first in the dashboard welcome card!");
                                return;
                              }
                              setSelectedGen(gen);
                              setUploadStep("choice");
                              setUploadOpen(true);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-white/10 bg-primary/20 hover:bg-primary/30 transition text-xs font-semibold px-3 py-1.5"
                          >
                            <Upload className="h-3.5 w-3.5 text-primary-glow" />
                            {gen.is_uploaded ? "Deliver Again" : "Upload to SL"}
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteGen(gen.id, e)}
                          className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
                          title="Delete Generation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Buy Credits Modal */}
      {buyCreditsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <PayPalScriptProvider options={{ clientId: "test", currency: "USD", "disable-funding": "card" }}>
            <div className="glass w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl">
              <h3 className="font-display text-lg font-semibold mb-4">Buy Credits Package</h3>

              {checkoutStep === "select" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Purchase additional credits to generate text-to-3D models, images, and retexture assets.
                  </p>
                  <div
                    onClick={() => handleBuyCredits(50)}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-primary bg-white/5 cursor-pointer transition"
                  >
                    <div>
                      <h4 className="font-bold text-sm">Bronze Package</h4>
                      <p className="text-xs text-muted-foreground">50 Generation Credits</p>
                    </div>
                    <span className="font-semibold text-primary-glow">$5.00</span>
                  </div>
                  <div
                    onClick={() => handleBuyCredits(150)}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-primary bg-white/5 cursor-pointer transition"
                  >
                    <div>
                      <h4 className="font-bold text-sm">Silver Package</h4>
                      <p className="text-xs text-muted-foreground">150 Generation Credits</p>
                    </div>
                    <span className="font-semibold text-primary-glow">$12.00</span>
                  </div>
                    <div
                      onClick={() => handleBuyCredits(400)}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-primary bg-white/5 cursor-pointer transition"
                    >
                      <div>
                        <h4 className="font-bold text-sm">Gold Package</h4>
                        <p className="text-xs text-muted-foreground">400 Generation Credits</p>
                      </div>
                      <span className="font-semibold text-primary-glow">$25.00</span>
                    </div>

                    {/* Custom Package */}
                    <div className="p-4 rounded-xl border border-white/10 bg-white/5 transition flex flex-col gap-3">
                      <div>
                        <h4 className="font-bold text-sm">Custom Package</h4>
                        <p className="text-xs text-muted-foreground">Enter custom amount ($0.10 per credit)</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="10"
                          step="10"
                          placeholder="Amount (e.g. 100)"
                          id="customCreditInput"
                          className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <button
                          onClick={() => {
                            const val = parseInt((document.getElementById("customCreditInput") as HTMLInputElement)?.value || "0");
                            if (val >= 10) {
                              setCheckoutStep("pay");
                              setSelectedPackage({ credits: val, cost: Math.max(1, Math.floor(val * 0.10)) });
                            } else {
                              alert("Minimum purchase is 10 credits ($1.00)");
                            }
                          }}
                          className="rounded-lg bg-white/10 px-4 py-1.5 text-sm font-semibold hover:bg-white/20 transition"
                        >
                          Buy
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setBuyCreditsOpen(false)}
                      className="w-full mt-4 rounded-xl border border-white/10 py-2.5 text-sm font-semibold hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                )}

              {checkoutStep === "pay" && selectedPackage && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-white/5 p-4 border border-white/10 flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Selected Package</span>
                      <h4 className="font-bold text-sm">{selectedPackage.credits} Credits</h4>
                    </div>
                    <span className="text-lg font-bold text-emerald-400">${selectedPackage.cost}.00</span>
                  </div>

                  {/* PayPal Buttons Integration */}
                  <div className="z-0 relative min-h-[150px]">
                    <PayPalButtons 
                      style={{ layout: "vertical", color: "blue", shape: "rect", label: "checkout" }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [
                            {
                              description: `${selectedPackage.credits} KingDavez Studios Generation Credits`,
                              amount: {
                                currency_code: "USD",
                                value: selectedPackage.cost.toFixed(2),
                              },
                            },
                          ],
                        });
                      }}
                      onApprove={async (data, actions) => {
                        if (!actions.order) return;
                        const details = await actions.order.capture();
                        await handleCompletePayment(details);
                      }}
                      onError={(err) => {
                        console.error("PayPal Checkout Error:", err);
                        alert("There was an error processing your payment with PayPal.");
                      }}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setCheckoutStep("select")}
                      className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold hover:bg-white/5"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === "success" && selectedPackage && (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-500/20 text-amber-300">
                    <Check className="h-6 w-6" />
                  </div>
                  <h4 className="font-display text-lg font-semibold text-amber-300">Payment submitted</h4>
                  <p className="text-sm text-muted-foreground">
                    Your payment for {selectedPackage.credits} credits is awaiting owner approval. Credits will appear in your balance once we verify the PayPal transaction.
                  </p>
                  <button
                    onClick={() => {
                      setBuyCreditsOpen(false);
                      setCheckoutStep("select");
                    }}
                    className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Go to Dashboard
                  </button>
                </div>
              )}
            </div>
          </PayPalScriptProvider>
        </div>
      )}

      {/* Upload to Second Life Modal */}
      {uploadOpen && selectedGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h3 className="font-display text-lg font-semibold mb-4">Upload to Second Life</h3>

            {uploadStep === "choice" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You can upload <span className="text-white font-semibold">"{selectedGen.prompt.slice(0, 30)}..."</span> to Second Life. The 24/7 online delivery bot will send it to your avatar:
                </p>
                <div className="rounded-xl bg-white/5 p-3 border border-white/10 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Recipient Avatar:</span>
                  <span className="font-bold text-primary-glow">{profile?.sl_username}</span>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => triggerUpload("credits")}
                    className="w-full group border border-primary/30 hover:border-primary rounded-xl p-4 bg-primary/10 hover:bg-primary/20 transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="text-left">
                      <h4 className="font-bold text-sm group-hover:text-primary-glow transition flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-amber-400" />
                        Confirm & Upload
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Deducts 1 credit from your balance</p>
                    </div>
                    <span className="text-xs bg-white/10 px-2 py-1 rounded font-semibold">1 Credit</span>
                  </button>
                </div>

                <button
                  onClick={() => setUploadOpen(false)}
                  className="w-full rounded-xl border border-white/10 py-2.5 text-sm font-semibold hover:bg-white/5 transition mt-2"
                >
                  Cancel
                </button>
              </div>
            )}

            {uploadStep === "processing" && (
              <div className="text-center py-10 space-y-4">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <h4 className="font-display text-base font-semibold">Processing Upload...</h4>
                <p className="text-xs text-muted-foreground">Contacting the KingDavez Studios 24/7 delivery server.</p>
              </div>
            )}

            {uploadStep === "success" && (
              <div className="text-center py-6 space-y-4">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="font-display text-lg font-semibold text-emerald-400">Upload Queued!</h4>
                <p className="text-sm text-muted-foreground px-2">
                  {uploadPaymentMethod === "credits"
                    ? "Successfully paid 1 Credit. Your model is queued for Delivery. Log in to Second Life and wear your HUD to receive the item!"
                    : "L$10 Linden payment simulated successfully. Your model has been sent to our online Bot. Ensure your avatar is online to accept the transfer!"}
                </p>
                <button
                  onClick={() => setUploadOpen(false)}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {createProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-6 shadow-2xl">
            <h3 className="font-display text-lg font-semibold mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Elven Weapons Pack"
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    autoFocus
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateProjectOpen(false);
                      setNewProjectName("");
                    }}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newProjectName.trim() || creatingProject}
                    className="rounded-xl bg-[var(--gradient-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {creatingProject ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}




      {/* 3D Preview Modal */}
      {previewGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass w-full max-w-2xl rounded-2xl border border-white/10 p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-white">{previewGen.prompt}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {previewGen.generation_type.replace("-", " → ")} • {new Date(previewGen.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setPreviewGen(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 3D Viewer Container */}
            <div className="relative aspect-video w-full rounded-xl border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
              {previewGen.generation_type === "text-to-image" ? (
                <img 
                  src={(previewGen.result_data?.image_url as string) || "/demo-image.jpg"} 
                  alt="Generated Image" 
                  className="w-full h-full object-contain"
                />
              ) : previewGen.result_data?.model_url ? (
                <ModelViewer url={previewGen.result_data.model_url as string} prompt={previewGen.prompt} />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Box className="h-10 w-10 mb-2 opacity-40 animate-pulse" />
                  <span className="text-sm font-medium">3D Preview Model URL not found</span>
                </div>
              )}
            </div>

            {/* Customization settings (if any) */}
            {previewGen.result_data?.settings && (
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1.5">Customization</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[11px]">
                  {Object.entries(previewGen.result_data.settings as Record<string, unknown>)
                    .filter(([k]) => k !== "composed_prompt")
                    .slice(0, 12)
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 bg-white/[0.03] rounded px-2 py-0.5">
                        <span className="text-muted-foreground capitalize truncate">{k.replace(/_/g, " ")}</span>
                        <span className="font-mono text-foreground/90 truncate">{String(v ?? "—")}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
              <span className="text-xs text-muted-foreground">
                {previewGen.credits_used} credits used
              </span>
              <div className="flex gap-2">
                {!!previewGen.result_data?.model_url && (
                  <>
                    <button
                      onClick={() => downloadAsGLB(previewGen.result_data!.model_url as string, previewGen.prompt)}
                      className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-white transition flex items-center gap-1.5"
                    >
                      Download GLB
                    </button>
                    <button
                      onClick={() => downloadAsOBJ(previewGen.result_data!.model_url as string, previewGen.prompt)}
                      className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-white transition flex items-center gap-1.5"
                    >
                      Download OBJ
                    </button>
                    <button
                      onClick={() => downloadAsSTL(previewGen.result_data!.model_url as string, previewGen.prompt)}
                      className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-white transition flex items-center gap-1.5"
                    >
                      Download STL
                    </button>
                    <button
                      onClick={() => downloadAsFBX(previewGen.result_data!.model_url as string, previewGen.prompt)}
                      className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-white transition flex items-center gap-1.5"
                    >
                      Download FBX
                    </button>
                    {previewGen.result_data?.image_url && (
                      <button
                        onClick={() => downloadTexture(previewGen.result_data!.image_url as string, previewGen.prompt.slice(0, 20))}
                        className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-white transition flex items-center gap-1.5"
                      >
                        Download Texture
                      </button>
                    )}
                  </>
                )}
                {previewGen.status === "completed" && !getExpirationStatus(previewGen.created_at).isExpired && (
                  <button
                    onClick={() => {
                      if (!profile?.sl_username) {
                        alert("Please bind your Second Life Username first in the dashboard welcome card!");
                        return;
                      }
                      setSelectedGen(previewGen);
                      setUploadStep("choice");
                      setUploadOpen(true);
                      setPreviewGen(null); // Close preview modal
                    }}
                    className="rounded-xl bg-primary hover:opacity-90 px-4 py-2 text-xs font-semibold text-white transition flex items-center gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload to SL
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsNewBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("kdwhatsnew_v160") === "dismissed";
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("kdwhatsnew_v160", "dismissed");
    } catch {
      /* ignore */
    }
  };

  if (dismissed) return null;

  return (
    <div className="mb-8 animate-slide-up rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20 shadow-[var(--shadow-glow)]">
            <Flame className="h-5 w-5 text-primary-glow" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">v1.6.0 is live!</p>
            <p className="text-xs text-muted-foreground">
              Community Hub, Roblox & Blender plugins, AI Assistant, Retexture, and more.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Link
            to="/changelog"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-4 py-2 text-xs font-semibold text-primary-glow hover:bg-primary/30 transition"
          >
            <Megaphone className="h-3.5 w-3.5" />
            What's New
          </Link>
          <Link
            to="/roadmap"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
          >
            Roadmap
            <ArrowRight className="h-3 w-3" />
          </Link>
          <button
            onClick={dismiss}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground transition"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
