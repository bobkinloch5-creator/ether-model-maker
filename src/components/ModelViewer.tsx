// @ts-nocheck — legacy ported file; full typing pending
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  useAnimations,
  Environment,
  ContactShadows,
  AdaptiveDpr,
  AdaptiveEvents,
  BakeShadows,
  PerformanceMonitor,
  Center,
  Bounds,
  useBounds,
} from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { Loader2, RotateCw, Grid, Maximize2, Sun, Moon, Aperture, UploadCloud, AlertTriangle } from "lucide-react";
import { buildProceduralMesh } from "@/lib/procedural";

interface ModelViewerProps {
  url: string;
  prompt?: string;
}

const ENV_PRESETS = ["studio", "sunset", "city", "warehouse", "forest", "night"] as const;
type EnvPreset = (typeof ENV_PRESETS)[number];

/** Upgrade every mesh in a scene with max-quality texture filtering + correct color space. */
function enhanceSceneQuality(scene: THREE.Object3D, anisotropy: number, wireframe: boolean) {
  scene.traverse((child: any) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.geometry && !child.geometry.attributes.normal) {
      child.geometry.computeVertexNormals();
    }
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m: any) => {
      if (!m) return;
      m.wireframe = wireframe;
      // sharpest possible textures at any angle
      ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "bumpMap"].forEach((slot) => {
        const tex = m[slot];
        if (tex && tex.isTexture) {
          tex.anisotropy = anisotropy;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = true;
          if (slot === "map" || slot === "emissiveMap") {
            tex.colorSpace = THREE.SRGBColorSpace;
          }
          tex.needsUpdate = true;
        }
      });
      // Punch up PBR look: stronger env reflections, crisper normals, gentler
      // roughness so albedo textures (like fur) read sharper instead of muddy.
      if (m.envMapIntensity !== undefined) m.envMapIntensity = 1.45;
      if (m.normalScale && m.normalScale.set) m.normalScale.set(1.15, 1.15);
      if (typeof m.roughness === "number") m.roughness = Math.max(0.35, Math.min(m.roughness, 0.92));
      if (m.aoMapIntensity !== undefined) m.aoMapIntensity = 1.1;
      m.needsUpdate = true;
    });
  });
}

function Model({
  url,
  playAnimations,
  wireframe,
}: {
  url: string;
  playAnimations: boolean;
  wireframe: boolean;
}) {
  const group = useRef<any>(null);
  const { scene, animations } = useGLTF(url);
  const { actions, names } = useAnimations(animations, group);
  const { gl } = useThree();
  // Cap anisotropy at 8 — visually indistinguishable from 16 but cheaper on the GPU
  const anisotropy = useMemo(() => Math.min(gl.capabilities.getMaxAnisotropy() || 16, 16), [gl]);

  useEffect(() => {
    if (scene) enhanceSceneQuality(scene, anisotropy, wireframe);
  }, [scene, wireframe, anisotropy]);

  useEffect(() => {
    if (names.length > 0 && actions) {
      if (playAnimations) {
        names.forEach((name) => actions[name]?.reset().fadeIn(0.5).play());
      } else {
        names.forEach((name) => actions[name]?.fadeOut(0.5).stop());
      }
    }
  }, [playAnimations, names, actions]);

  return <primitive ref={group} object={scene} />;
}

function ProceduralWrapper({ prompt, wireframe }: { prompt: string; wireframe: boolean }) {
  const groupRef = useRef<any>(null);
  const group = useMemo(() => buildProceduralMesh(prompt), [prompt]);
  const { gl } = useThree();
  const anisotropy = useMemo(() => Math.min(gl.capabilities.getMaxAnisotropy() || 16, 16), [gl]);

  useEffect(() => {
    if (group) enhanceSceneQuality(group, anisotropy, wireframe);
  }, [group, wireframe, anisotropy]);

  return <primitive ref={groupRef} object={group} />;
}

/** Frame the model nicely on first load. */
function AutoFrame({ trigger }: { trigger: any }) {
  const api = useBounds();
  useEffect(() => {
    const t = setTimeout(() => api?.refresh().clip().fit(), 60);
    return () => clearTimeout(t);
  }, [trigger, api]);
  return null;
}

export function ModelViewer({ url, prompt }: ModelViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [playAnims, setPlayAnims] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [envPreset, setEnvPreset] = useState<EnvPreset>("studio");
  const [dark, setDark] = useState(false);
  const controlsRef = useRef<any>(null);
  const [perfTier, setPerfTier] = useState<"high" | "low">("high");

  // Tune DPR + shadow budget per device. Desktop caps at 1.75x DPR (sweet spot
  // for 4K-ish sharpness without melting a 4070), mobile caps at 1.5x.
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  const dpr: [number, number] = isMobile ? [1, 1.5] : [1, perfTier === "high" ? 1.75 : 1.25];
  const shadowMapSize = isMobile ? 1024 : perfTier === "high" ? 2048 : 1024;

  const isProcedural = url === "__procedural__" || url === "/demo-model.glb" || url.includes("demo-model");
  const isRealModel = !isProcedural && (url.startsWith("blob:") || url.startsWith("http") || url.startsWith("/"));
  const isGltf = url.toLowerCase().includes(".glb") || url.toLowerCase().includes(".gltf") || url.startsWith("blob:");

  const cycleEnv = () => {
    const i = ENV_PRESETS.indexOf(envPreset);
    setEnvPreset(ENV_PRESETS[(i + 1) % ENV_PRESETS.length]);
  };

  const recenter = () => controlsRef.current?.reset();

  return (
    <div className="h-full w-full relative group overflow-hidden rounded-[inherit]">
      {/* Soft luxe backdrop — gradient sits behind transparent canvas */}
      <div
        className="absolute inset-0 -z-0 transition-colors duration-500"
        style={{
          background: dark
            ? "radial-gradient(ellipse at 50% 30%, oklch(0.22 0.04 280) 0%, oklch(0.08 0.02 270) 70%)"
            : "radial-gradient(ellipse at 50% 30%, oklch(0.95 0.02 280) 0%, oklch(0.78 0.04 260) 70%)",
        }}
      />

      <Suspense
        fallback={
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">Loading 3D model…</p>
          </div>
        }
      >
        <Canvas
          shadows
          dpr={dpr}
          frameloop={autoRotate ? "always" : "demand"}
          gl={{
            antialias: !isMobile,
            alpha: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.18,
          }}
          camera={{ position: [2.4, 1.6, 3.4], fov: 38, near: 0.05, far: 100 }}
          onCreated={({ gl, scene }) => {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            // Crisper IBL — boosts reflection sharpness on PBR surfaces.
            (scene as any).environmentIntensity = 1.15;
            scene.background = null;
          }}
        >
          <PerformanceMonitor
            onIncline={() => setPerfTier("high")}
            onDecline={() => setPerfTier("low")}
            flipflops={3}
          />
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />
          {/* Bake static shadows once instead of recomputing every frame */}
          <BakeShadows />
          {/* Studio key + fill + rim, dialled to flatter PBR materials */}
          <ambientLight intensity={0.35} />
          <directionalLight
            castShadow
            position={[4, 6, 3]}
            intensity={2.2}
            shadow-mapSize-width={shadowMapSize}
            shadow-mapSize-height={shadowMapSize}
            shadow-bias={-0.0001}
            shadow-camera-near={0.5}
            shadow-camera-far={20}
            shadow-camera-left={-5}
            shadow-camera-right={5}
            shadow-camera-top={5}
            shadow-camera-bottom={-5}
          />
          <directionalLight position={[-4, 3, -2]} intensity={0.7} color="#a5c4ff" />
          <directionalLight position={[0, 2, -5]} intensity={0.5} color="#ffd1a8" />

          <Environment preset={envPreset} background={false} />

          <Bounds fit clip observe margin={1.2}>
            <Center>
              {isProcedural && prompt ? (
                <ProceduralWrapper prompt={prompt} wireframe={wireframe} />
              ) : isRealModel && isGltf ? (
                <Model url={url} playAnimations={playAnims} wireframe={wireframe} />
              ) : prompt ? (
                <ProceduralWrapper prompt={prompt} wireframe={wireframe} />
              ) : null}
            </Center>
            <AutoFrame trigger={`${url}|${prompt}`} />
          </Bounds>

          {/* Soft grounded contact shadow — single pass, GPU-cheap */}
          <ContactShadows
            position={[0, -1.0, 0]}
            opacity={0.6}
            scale={10}
            blur={2.4}
            far={4}
            resolution={isMobile ? 384 : perfTier === "high" ? 768 : 512}
            color="#000000"
            frames={1}
          />


          <OrbitControls
            ref={controlsRef}
            makeDefault
            autoRotate={autoRotate}
            autoRotateSpeed={1.4}
            enablePan
            enableDamping
            dampingFactor={0.08}
            minDistance={0.5}
            maxDistance={20}
            zoomSpeed={0.8}
            rotateSpeed={0.9}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          />
        </Canvas>
      </Suspense>

      {/* Controls Overlay — desktop top-right, mobile glassy bottom dock */}
      <div className="absolute top-3 right-3 z-10 hidden sm:flex flex-col gap-2">
        <ViewerBtn active={wireframe} onClick={() => setWireframe(!wireframe)} title="Wireframe">
          <Grid className="h-4 w-4" />
        </ViewerBtn>
        <ViewerBtn active={autoRotate} onClick={() => setAutoRotate(!autoRotate)} title="Auto-rotate">
          <RotateCw className={`h-4 w-4 ${autoRotate ? "animate-spin" : ""}`} style={{ animationDuration: "4s" }} />
        </ViewerBtn>
        <ViewerBtn onClick={cycleEnv} title={`Lighting: ${envPreset}`}>
          <Aperture className="h-4 w-4" />
        </ViewerBtn>
        <ViewerBtn active={dark} onClick={() => setDark(!dark)} title="Backdrop">
          {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </ViewerBtn>
        <ViewerBtn onClick={recenter} title="Recenter">
          <Maximize2 className="h-4 w-4" />
        </ViewerBtn>
      </div>

      {/* Mobile bottom dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex sm:hidden gap-1.5 rounded-2xl border border-white/15 bg-black/55 backdrop-blur-xl px-2 py-1.5 shadow-2xl">
        <ViewerBtn active={wireframe} onClick={() => setWireframe(!wireframe)} title="Wireframe" small>
          <Grid className="h-4 w-4" />
        </ViewerBtn>
        <ViewerBtn active={autoRotate} onClick={() => setAutoRotate(!autoRotate)} title="Auto-rotate" small>
          <RotateCw className="h-4 w-4" />
        </ViewerBtn>
        <ViewerBtn onClick={cycleEnv} title="Lighting" small>
          <Aperture className="h-4 w-4" />
        </ViewerBtn>
        <ViewerBtn active={dark} onClick={() => setDark(!dark)} title="Backdrop" small>
          {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </ViewerBtn>
        <ViewerBtn onClick={recenter} title="Recenter" small>
          <Maximize2 className="h-4 w-4" />
        </ViewerBtn>
      </div>

      {/* Desktop interaction hint */}
      <div className="absolute bottom-3 left-0 right-0 hidden sm:flex justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] text-white/80 font-medium tracking-wide">
          Drag to rotate • Scroll to zoom • Right-drag to pan
        </div>
      </div>

      {isRealModel && !isGltf && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-6 text-center z-20">
          <UploadCloud className="h-10 w-10 text-primary-glow mb-3 animate-pulse" />
          <h3 className="font-semibold text-foreground text-sm tracking-wide">3D Preview Unavailable</h3>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-xs leading-relaxed">
            Direct 3D preview is only supported for GLB files. Download the OBJ or ZIP archive containing your model using the download buttons.
          </p>
        </div>
      )}
    </div>
  );
}

function ViewerBtn({
  children,
  onClick,
  active,
  title,
  small,
}: {
  children: any;
  onClick: () => void;
  active?: boolean;
  title: string;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`${small ? "p-2" : "p-2.5"} rounded-xl bg-black/55 backdrop-blur-xl text-white/90 transition-all border border-white/10 hover:bg-black/75 hover:scale-105 active:scale-95 ${
        active ? "text-primary-glow border-primary/40 shadow-[0_0_12px_-2px_var(--primary)]" : ""
      }`}
    >
      {children}
    </button>
  );
}
