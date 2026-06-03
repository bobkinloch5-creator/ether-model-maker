// @ts-nocheck — legacy ported file; full typing pending
import * as THREE from "three";

export function getProceduralColorAndMaterial(prompt: string) {
  const p = prompt.toLowerCase();

  // Generate a deterministic beautiful HSL color from the prompt hash
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = prompt.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  let color = `hsl(${hue}, 85%, 60%)`;

  // Specific overrides if user explicitly mentions a color in their prompt
  if (p.includes("red") || p.includes("crimson") || p.includes("ruby")) color = "#ef4444";
  else if (p.includes("blue") || p.includes("sapphire") || p.includes("aqua")) color = "#3b82f6";
  else if (p.includes("green") || p.includes("emerald") || p.includes("lime")) color = "#10b981";
  else if (
    p.includes("yellow") ||
    p.includes("gold") ||
    p.includes("golden") ||
    p.includes("amber")
  )
    color = "#eab308";
  else if (p.includes("orange")) color = "#f97316";
  else if (p.includes("pink") || p.includes("rose")) color = "#ec4899";
  else if (p.includes("purple") || p.includes("violet") || p.includes("amethyst"))
    color = "#a855f7";
  else if (p.includes("white") || p.includes("silver") || p.includes("platinum")) color = "#f3f4f6";
  else if (p.includes("black") || p.includes("dark") || p.includes("obsidian")) color = "#111827";
  else if (p.includes("brown") || p.includes("wood") || p.includes("wooden")) color = "#78350f";

  // Material properties detection
  let metalness = 0.35;
  let roughness = 0.4;
  let emissive = "#000000";
  let emissiveIntensity = 0;
  let transparent = false;
  let opacity = 1;

  if (
    p.includes("metal") ||
    p.includes("metallic") ||
    p.includes("steel") ||
    p.includes("iron") ||
    p.includes("gold") ||
    p.includes("bronze") ||
    p.includes("silver")
  ) {
    metalness = 0.9;
    roughness = 0.15;
  }
  if (
    p.includes("glass") ||
    p.includes("crystal") ||
    p.includes("ice") ||
    p.includes("translucent")
  ) {
    metalness = 0.1;
    roughness = 0.05;
    transparent = true;
    opacity = 0.6;
  }
  if (
    p.includes("glow") ||
    p.includes("glowing") ||
    p.includes("neon") ||
    p.includes("magic") ||
    p.includes("magical") ||
    p.includes("runes") ||
    p.includes("light")
  ) {
    emissive = color;
    emissiveIntensity = 1.2;
  }

  return { color, metalness, roughness, emissive, emissiveIntensity, transparent, opacity };
}

export function buildProceduralMesh(prompt: string): THREE.Group {
  const group = new THREE.Group();
  const p = prompt.toLowerCase();
  const matConfig = getProceduralColorAndMaterial(prompt);

  // Standard material constructor helper
  const createMaterial = (
    color: string,
    metalness = matConfig.metalness,
    roughness = matConfig.roughness,
  ) => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness,
      roughness,
      emissive: new THREE.Color(matConfig.emissive),
      emissiveIntensity: matConfig.emissiveIntensity,
      transparent: matConfig.transparent,
      opacity: matConfig.opacity,
    });
  };

  if (
    p.includes("sword") ||
    p.includes("blade") ||
    p.includes("weapon") ||
    p.includes("dagger") ||
    p.includes("saber")
  ) {
    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.15, 1.8, 0.04);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.includes("gold") ? "#eab308" : "#9ca3af"),
      metalness: 0.9,
      roughness: 0.1,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.8;
    group.add(blade);

    // Guard
    const guardGeo = new THREE.BoxGeometry(0.6, 0.08, 0.1);
    const guardMat = createMaterial(matConfig.color);
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = -0.1;
    group.add(guard);

    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 32);
    const handleMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#451a03"),
      roughness: 0.9,
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.4;
    group.add(handle);

    // Pommel
    const pommelGeo = new THREE.SphereGeometry(0.09, 32, 32);
    const pommelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(matConfig.color),
      metalness: 0.8,
    });
    const pommel = new THREE.Mesh(pommelGeo, pommelMat);
    pommel.position.y = -0.68;
    group.add(pommel);

    // Rune glow line
    if (matConfig.emissiveIntensity > 0) {
      const runeGeo = new THREE.BoxGeometry(0.02, 1.4, 0.005);
      const runeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(matConfig.color) });
      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.position.set(0, 0.8, 0.021);
      group.add(rune);
    }
  } else if (
    p.includes("helmet") ||
    p.includes("mask") ||
    p.includes("head") ||
    p.includes("visor") ||
    p.includes("helm")
  ) {
    // Dome
    const domeGeo = new THREE.SphereGeometry(0.7, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.85);
    const domeMat = createMaterial(matConfig.color);
    const dome = new THREE.Mesh(domeGeo, domeMat);
    group.add(dome);

    // Visor
    const visorGeo = new THREE.BoxGeometry(0.8, 0.25, 0.3);
    const visorColor = p.includes("red") ? "#ef4444" : p.includes("blue") ? "#3b82f6" : "#10b981";
    const visorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(visorColor),
      emissive: new THREE.Color(visorColor),
      emissiveIntensity: 2,
      roughness: 0.05,
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.1, 0.45);
    group.add(visor);

    // Cheek pads
    const cheekGeo = new THREE.BoxGeometry(0.25, 0.35, 0.35);
    const cheekMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1f2937"),
      metalness: 0.5,
      roughness: 0.5,
    });

    const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
    cheekL.position.set(-0.45, -0.2, 0.3);
    cheekL.rotation.set(0.2, -0.4, 0);
    group.add(cheekL);

    const cheekR = new THREE.Mesh(cheekGeo, cheekMat);
    cheekR.position.set(0.45, -0.2, 0.3);
    cheekR.rotation.set(0.2, 0.4, 0);
    group.add(cheekR);
  } else if (p.includes("shield")) {
    group.rotation.x = Math.PI / 6;

    // Rim
    const rimGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.1, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#9ca3af"),
      metalness: 0.9,
      roughness: 0.1,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    group.add(rim);

    // Plate
    const plateGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.08, 64);
    const plateMat = createMaterial(matConfig.color);
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.z = 0.02;
    group.add(plate);

    // Boss
    const bossGeo = new THREE.SphereGeometry(0.25, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const bossMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#eab308"),
      metalness: 0.9,
      roughness: 0.1,
    });
    const boss = new THREE.Mesh(bossGeo, bossMat);
    boss.position.z = 0.07;
    group.add(boss);

    if (matConfig.emissiveIntensity > 0) {
      const ringGeo = new THREE.TorusGeometry(0.4, 0.03, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(matConfig.color) });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = 0.075;
      group.add(ring);
    }
  } else if (
    p.includes("tree") ||
    p.includes("forest") ||
    p.includes("plant") ||
    p.includes("flower") ||
    p.includes("cactus")
  ) {
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 1.0, 24);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#78350f"),
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = -0.4;
    group.add(trunk);

    const leavesColor = matConfig.color === "#78350f" ? "#15803d" : matConfig.color;

    // Bottom leaves
    const leavesGeo1 = new THREE.ConeGeometry(0.7, 1.2, 32);
    const leavesMat1 = createMaterial(leavesColor);
    const leaves1 = new THREE.Mesh(leavesGeo1, leavesMat1);
    leaves1.position.y = 0.5;
    group.add(leaves1);

    // Top leaves
    const leavesGeo2 = new THREE.ConeGeometry(0.5, 0.9, 32);
    const leavesMat2 = createMaterial(matConfig.color === "#78350f" ? "#16a34a" : matConfig.color);
    const leaves2 = new THREE.Mesh(leavesGeo2, leavesMat2);
    leaves2.position.y = 1.1;
    group.add(leaves2);
  } else if (
    p.includes("chest") ||
    p.includes("box") ||
    p.includes("crate") ||
    p.includes("coffin")
  ) {
    const woodColor = matConfig.color === "#111827" ? "#3b2314" : matConfig.color;

    // Bottom
    const bottomGeo = new THREE.BoxGeometry(1.2, 0.6, 0.8);
    const bottomMat = createMaterial(woodColor);
    const bottom = new THREE.Mesh(bottomGeo, bottomMat);
    bottom.position.y = -0.2;
    group.add(bottom);

    // Lid
    const lidGeo = new THREE.BoxGeometry(1.2, 0.35, 0.8);
    const lidMat = createMaterial(matConfig.color === "#111827" ? "#451a03" : matConfig.color);
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 0.2;
    group.add(lid);

    // Gold bands
    const bandGeo = new THREE.BoxGeometry(0.06, 1.0, 0.82);
    const bandMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#eab308"),
      metalness: 0.9,
      roughness: 0.2,
    });

    const bandL = new THREE.Mesh(bandGeo, bandMat);
    bandL.position.x = -0.58;
    group.add(bandL);

    const bandR = new THREE.Mesh(bandGeo, bandMat);
    bandR.position.x = 0.58;
    group.add(bandR);

    // Lock
    const lockGeo = new THREE.BoxGeometry(0.15, 0.15, 0.05);
    const lockMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#eab308"),
      metalness: 0.9,
      roughness: 0.1,
    });
    const lock = new THREE.Mesh(lockGeo, lockMat);
    lock.position.set(0, 0.05, 0.41);
    group.add(lock);
  } else if (
    p.includes("potion") ||
    p.includes("bottle") ||
    p.includes("flask") ||
    p.includes("glass")
  ) {
    const liquidColor = p.includes("red")
      ? "#ef4444"
      : p.includes("green")
        ? "#10b981"
        : p.includes("blue")
          ? "#3b82f6"
          : matConfig.color;

    // Glass bottle
    const glassGeo = new THREE.SphereGeometry(0.6, 64, 64);
    const glassMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ffffff"),
      transparent: true,
      opacity: 0.3,
      roughness: 0.01,
      metalness: 0.9,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = -0.1;
    group.add(glass);

    // Liquid
    const liquidGeo = new THREE.SphereGeometry(0.52, 48, 48);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(liquidColor),
      emissive: new THREE.Color(liquidColor),
      emissiveIntensity: 1.0,
      roughness: 0.1,
    });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.position.y = -0.18;
    group.add(liquid);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 32);
    const neck = new THREE.Mesh(neckGeo, glassMat);
    neck.position.y = 0.6;
    group.add(neck);

    // Cork
    const corkGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.22, 32);
    const corkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#7c2d12"),
      roughness: 0.9,
    });
    const cork = new THREE.Mesh(corkGeo, corkMat);
    cork.position.y = 0.88;
    group.add(cork);
  } else if (
    p.includes("dragon") ||
    p.includes("monster") ||
    p.includes("creature") ||
    p.includes("animal") ||
    p.includes("fox") ||
    p.includes("wolf") ||
    p.includes("dinosaur")
  ) {
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.6, 1.2);
    const bodyMat = createMaterial(matConfig.color);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.6);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.5, 0.7);
    group.add(head);

    // Snout
    const snoutGeo = new THREE.BoxGeometry(0.3, 0.25, 0.4);
    const snoutMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1f2937"),
      roughness: 0.9,
    });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, 0.4, 1.1);
    group.add(snout);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(p.includes("red") ? "#ef4444" : "#eab308"),
    });

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 0.55, 0.98);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.18, 0.55, 0.98);
    group.add(eyeR);

    // Tail
    const tailGeo = new THREE.CylinderGeometry(0.1, 0.02, 0.8, 8);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(0, 0.1, -0.8);
    tail.rotation.x = 0.4;
    group.add(tail);

    // Wings
    const wingGeo = new THREE.BoxGeometry(0.8, 0.05, 0.5);
    const wingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#111827"),
      roughness: 0.9,
    });

    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(-0.6, 0.4, -0.1);
    wingL.rotation.set(0.2, 0, 0.4);
    group.add(wingL);

    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.set(0.6, 0.4, -0.1);
    wingR.rotation.set(0.2, 0, -0.4);
    group.add(wingR);
  } else if (
    p.includes("crown") ||
    p.includes("ring") ||
    p.includes("necklace") ||
    p.includes("jewelry")
  ) {
    // Base ring
    const ringGeo = new THREE.TorusGeometry(0.55, 0.1, 16, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#eab308"),
      metalness: 0.95,
      roughness: 0.08,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Crown peaks
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const x = Math.cos(angle) * 0.55;
      const z = Math.sin(angle) * 0.55;

      const peakGroup = new THREE.Group();
      peakGroup.position.set(x, 0.2, z);
      peakGroup.rotation.y = -angle;
      peakGroup.rotation.z = 0.35;

      const coneGeo = new THREE.ConeGeometry(0.1, 0.4, 4);
      const cone = new THREE.Mesh(coneGeo, ringMat);
      peakGroup.add(cone);

      const gemGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const gemMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(matConfig.color === "#eab308" ? "#ef4444" : matConfig.color),
        emissive: new THREE.Color(matConfig.color),
        emissiveIntensity: 0.6,
        roughness: 0.05,
      });
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.y = 0.22;
      peakGroup.add(gem);

      group.add(peakGroup);
    }
  } else if (
    p.includes("robot") ||
    p.includes("android") ||
    p.includes("cyborg") ||
    p.includes("mech")
  ) {
    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.8, 0.5);
    const torsoMat = createMaterial(matConfig.color);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.1;
    group.add(torso);

    // Power core
    const coreGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const coreColor = p.includes("red")
      ? "#ef4444"
      : p.includes("green")
        ? "#10b981"
        : p.includes("blue")
          ? "#3b82f6"
          : matConfig.color;
    const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(coreColor) });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0.2, 0.26);
    group.add(core);

    // Head
    const headGeo = new THREE.BoxGeometry(0.45, 0.4, 0.45);
    const headMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1f2937"),
      metalness: 0.7,
      roughness: 0.3,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.7;
    group.add(head);

    // Visor
    const visorGeo = new THREE.BoxGeometry(0.3, 0.08, 0.05);
    const visorColor = p.includes("red")
      ? "#ef4444"
      : p.includes("green")
        ? "#10b981"
        : p.includes("blue")
          ? "#3b82f6"
          : matConfig.color;
    const visorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(visorColor) });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.72, 0.23);
    group.add(visor);

    // Shoulders
    const shoulderGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const shoulderMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#eab308"),
      metalness: 0.8,
    });

    const shoulderL = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulderL.position.set(-0.45, 0.35, 0);
    group.add(shoulderL);

    const shoulderR = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulderR.position.set(0.45, 0.35, 0);
    group.add(shoulderR);
  } else if (
    p.includes("car") ||
    p.includes("vehicle") ||
    p.includes("truck") ||
    p.includes("spaceship") ||
    p.includes("plane") ||
    p.includes("rocket")
  ) {
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 1.4);
    const bodyMat = createMaterial(matConfig.color);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.05;
    group.add(body);

    // Canopy
    const canopyGeo = new THREE.BoxGeometry(0.4, 0.25, 0.5);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1e293b"),
      transparent: true,
      opacity: 0.6,
      roughness: 0.05,
      metalness: 0.9,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.3, 0.2);
    group.add(canopy);

    // Wings
    const wingGeo = new THREE.BoxGeometry(0.4, 0.08, 0.8);
    const wingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(matConfig.color),
      metalness: 0.7,
    });

    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(-0.5, -0.05, -0.2);
    group.add(wingL);

    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.set(0.5, -0.05, -0.2);
    group.add(wingR);

    // Thruster
    const thrusterGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 32);
    const thrusterMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(p.includes("green") ? "#10b981" : "#ef4444"),
    });
    const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    thruster.position.set(0, 0.05, -0.71);
    thruster.rotation.x = Math.PI / 2;
    group.add(thruster);
  } else if (
    p.includes("sphere") ||
    p.includes("ball") ||
    p.includes("orb") ||
    p.includes("crystal ball")
  ) {
    const geo = new THREE.SphereGeometry(0.8, 64, 64);
    const mesh = new THREE.Mesh(geo, createMaterial(matConfig.color));
    group.add(mesh);
  } else if (
    p.includes("cylinder") ||
    p.includes("pillar") ||
    p.includes("column") ||
    p.includes("pipe")
  ) {
    const geo = new THREE.CylinderGeometry(0.45, 0.45, 1.4, 64);
    const mesh = new THREE.Mesh(geo, createMaterial(matConfig.color));
    group.add(mesh);
  } else if (p.includes("cone") || p.includes("pyramid") || p.includes("spike")) {
    const geo = new THREE.ConeGeometry(0.6, 1.3, 32);
    const mesh = new THREE.Mesh(geo, createMaterial(matConfig.color));
    group.add(mesh);
  } else if (p.includes("torus") || p.includes("donut")) {
    const geo = new THREE.TorusGeometry(0.6, 0.22, 32, 120);
    const mesh = new THREE.Mesh(geo, createMaterial(matConfig.color));
    mesh.rotation.x = Math.PI / 2;
    group.add(mesh);
  } else if (
    p.includes("house") ||
    p.includes("cabin") ||
    p.includes("cottage") ||
    p.includes("building") ||
    p.includes("home")
  ) {
    const wallColor =
      matConfig.color === `hsl(${Math.abs(0) % 360}, 85%, 60%)` ? "#a8a29e" : matConfig.color;
    // Walls
    const wallGeo = new THREE.BoxGeometry(1.2, 0.9, 1.0);
    const wallMat = createMaterial(
      p.includes("stone") ? "#78716c" : p.includes("wood") ? "#78350f" : wallColor,
    );
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 0.0;
    group.add(walls);
    // Roof
    const roofGeo = new THREE.ConeGeometry(1.0, 0.6, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.includes("stone") ? "#44403c" : "#7c2d12"),
      roughness: 0.9,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 0.75;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    // Door
    const doorGeo = new THREE.BoxGeometry(0.25, 0.4, 0.05);
    const doorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#451a03"),
      roughness: 0.9,
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, -0.25, 0.51);
    group.add(door);
    // Windows
    const winGeo = new THREE.BoxGeometry(0.18, 0.18, 0.05);
    const winMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#93c5fd"),
      emissive: new THREE.Color("#60a5fa"),
      emissiveIntensity: 0.5,
      roughness: 0.05,
    });
    const winL = new THREE.Mesh(winGeo, winMat);
    winL.position.set(-0.35, 0.1, 0.51);
    group.add(winL);
    const winR = new THREE.Mesh(winGeo, winMat);
    winR.position.set(0.35, 0.1, 0.51);
    group.add(winR);
    // Chimney
    const chimGeo = new THREE.BoxGeometry(0.15, 0.4, 0.15);
    const chimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#57534e"),
      roughness: 0.8,
    });
    const chimney = new THREE.Mesh(chimGeo, chimMat);
    chimney.position.set(0.35, 0.9, -0.2);
    group.add(chimney);
  } else if (
    p.includes("castle") ||
    p.includes("fortress") ||
    p.includes("tower") ||
    p.includes("keep")
  ) {
    // Main tower
    const towerGeo = new THREE.CylinderGeometry(0.5, 0.55, 1.6, 32);
    const towerMat = createMaterial(p.includes("stone") ? "#78716c" : matConfig.color);
    const tower = new THREE.Mesh(towerGeo, towerMat);
    group.add(tower);
    // Battlements
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const bGeo = new THREE.BoxGeometry(0.18, 0.2, 0.12);
      const bMesh = new THREE.Mesh(bGeo, towerMat);
      bMesh.position.set(Math.cos(angle) * 0.45, 0.9, Math.sin(angle) * 0.45);
      group.add(bMesh);
    }
    // Conical roof
    const cRoofGeo = new THREE.ConeGeometry(0.6, 0.5, 32);
    const cRoofMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#7c2d12"),
      roughness: 0.8,
    });
    const cRoof = new THREE.Mesh(cRoofGeo, cRoofMat);
    cRoof.position.y = 1.15;
    group.add(cRoof);
    // Door arch
    const archGeo = new THREE.BoxGeometry(0.22, 0.35, 0.1);
    const archMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1c1917"),
      roughness: 0.9,
    });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(0, -0.55, 0.52);
    group.add(arch);
  } else if (p.includes("bow") || p.includes("longbow") || p.includes("crossbow")) {
    // Bow arc
    const bowGeo = new THREE.TorusGeometry(0.7, 0.04, 16, 48, Math.PI);
    const bowMat = createMaterial(
      p.includes("wood") || !p.includes("metal") ? "#78350f" : matConfig.color,
    );
    const bow = new THREE.Mesh(bowGeo, bowMat);
    bow.rotation.z = Math.PI / 2;
    group.add(bow);
    // String
    const strGeo = new THREE.CylinderGeometry(0.005, 0.005, 1.4, 8);
    const strMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#d6d3d1"),
      roughness: 0.9,
    });
    const string = new THREE.Mesh(strGeo, strMat);
    group.add(string);
    // Arrow
    const shaftGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.0, 8);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#78350f"),
      roughness: 0.8,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = 0.1;
    group.add(shaft);
    const tipGeo = new THREE.ConeGeometry(0.04, 0.12, 8);
    const tipMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#9ca3af"),
      metalness: 0.9,
      roughness: 0.1,
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.rotation.z = -Math.PI / 2;
    tip.position.x = 0.62;
    group.add(tip);
  } else if (p.includes("axe") || p.includes("hatchet")) {
    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 16);
    const handleMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#78350f"),
      roughness: 0.9,
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    group.add(handle);
    // Axe head
    const headGeo = new THREE.BoxGeometry(0.5, 0.35, 0.06);
    const headMat = createMaterial(p.includes("gold") ? "#eab308" : "#9ca3af");
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0.15, 0.5, 0);
    group.add(head);
    // Edge bevel
    const edgeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8);
    const edge = new THREE.Mesh(edgeGeo, headMat);
    edge.position.set(0.4, 0.5, 0);
    group.add(edge);
  } else if (p.includes("staff") || p.includes("wand") || p.includes("scepter")) {
    // Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.8, 16);
    const shaftMat = createMaterial(p.includes("wood") ? "#78350f" : matConfig.color);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    group.add(shaft);
    // Orb
    const orbGeo = new THREE.SphereGeometry(0.15, 32, 32);
    const orbColor = p.includes("red")
      ? "#ef4444"
      : p.includes("blue")
        ? "#3b82f6"
        : p.includes("green")
          ? "#10b981"
          : matConfig.color;
    const orbMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(orbColor),
      emissive: new THREE.Color(orbColor),
      emissiveIntensity: 1.5,
      roughness: 0.05,
      metalness: 0.1,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 1.05;
    group.add(orb);
    // Claw prongs
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI * 2) / 4;
      const clawGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.25, 8);
      const claw = new THREE.Mesh(clawGeo, shaftMat);
      claw.position.set(Math.cos(angle) * 0.08, 0.95, Math.sin(angle) * 0.08);
      claw.rotation.x = Math.cos(angle) * 0.4;
      claw.rotation.z = Math.sin(angle) * 0.4;
      group.add(claw);
    }
  } else if (p.includes("armor") || p.includes("chestplate") || p.includes("breastplate")) {
    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
    const torsoMat = createMaterial(matConfig.color);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    group.add(torso);
    // Shoulders
    const shGeo = new THREE.SphereGeometry(0.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const shL = new THREE.Mesh(shGeo, torsoMat);
    shL.position.set(-0.5, 0.35, 0);
    group.add(shL);
    const shR = new THREE.Mesh(shGeo, torsoMat);
    shR.position.set(0.5, 0.35, 0);
    group.add(shR);
    // Belt
    const beltGeo = new THREE.BoxGeometry(0.82, 0.1, 0.52);
    const beltMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#78350f"),
      roughness: 0.8,
    });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = -0.45;
    group.add(belt);
    // Buckle
    const buckleGeo = new THREE.BoxGeometry(0.1, 0.1, 0.06);
    const buckleMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#eab308"),
      metalness: 0.9,
      roughness: 0.1,
    });
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, -0.45, 0.27);
    group.add(buckle);
  } else if (
    p.includes("table") ||
    p.includes("desk") ||
    p.includes("bench") ||
    p.includes("chair") ||
    p.includes("throne") ||
    p.includes("stool")
  ) {
    const woodCol = p.includes("stone") ? "#78716c" : "#78350f";
    // Top/seat
    const topGeo = new THREE.BoxGeometry(1.2, 0.08, 0.7);
    const topMat = createMaterial(woodCol);
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.35;
    group.add(top);
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8);
    const legMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(woodCol),
      roughness: 0.8,
    });
    const positions = [
      [-0.5, 0, -0.28],
      [0.5, 0, -0.28],
      [-0.5, 0, 0.28],
      [0.5, 0, 0.28],
    ];
    for (const pos of positions) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      group.add(leg);
    }
    // Back (for chair/throne)
    if (p.includes("chair") || p.includes("throne") || p.includes("stool")) {
      const backGeo = new THREE.BoxGeometry(1.2, 0.7, 0.06);
      const back = new THREE.Mesh(backGeo, topMat);
      back.position.set(0, 0.7, -0.32);
      group.add(back);
    }
  } else if (
    p.includes("gun") ||
    p.includes("pistol") ||
    p.includes("rifle") ||
    p.includes("blaster")
  ) {
    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 16);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1f2937"),
      metalness: 0.8,
      roughness: 0.2,
    });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.3, 0.1, 0);
    group.add(barrel);
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.2, 0.12);
    const bodyMat = createMaterial(matConfig.color);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(-0.1, 0.1, 0);
    group.add(body);
    // Grip
    const gripGeo = new THREE.BoxGeometry(0.12, 0.3, 0.1);
    const gripMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#78350f"),
      roughness: 0.9,
    });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(-0.2, -0.12, 0);
    grip.rotation.z = 0.15;
    group.add(grip);
    // Muzzle glow
    if (matConfig.emissiveIntensity > 0) {
      const muzzleGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const muzzleMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(matConfig.color) });
      const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
      muzzle.position.set(0.76, 0.1, 0);
      group.add(muzzle);
    }
  } else if (p.includes("barrel") || p.includes("keg") || p.includes("cask")) {
    // Barrel — slightly bulged cylinder using a lathe
    const woodColor = p.includes("metal") ? matConfig.color : "#78350f";
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const y = -0.6 + t * 1.2;
      const bulge = Math.sin(t * Math.PI) * 0.12;
      points.push(new THREE.Vector2(0.45 + bulge, y));
    }
    const bodyGeo = new THREE.LatheGeometry(points, 48);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(woodColor),
      roughness: 0.85,
      metalness: 0.05,
    });
    group.add(new THREE.Mesh(bodyGeo, bodyMat));
    // Iron bands
    const bandMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#3f3f46"),
      metalness: 0.9,
      roughness: 0.4,
    });
    [-0.4, 0, 0.4].forEach((y) => {
      const r = 0.45 + Math.sin(((y + 0.6) / 1.2) * Math.PI) * 0.12 + 0.005;
      const bandGeo = new THREE.TorusGeometry(r, 0.025, 12, 64);
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      group.add(band);
    });
    // Top and bottom lids
    const lidGeo = new THREE.CircleGeometry(0.45, 48);
    const lidMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(woodColor).multiplyScalar(0.85),
      roughness: 0.9,
    });
    const topLid = new THREE.Mesh(lidGeo, lidMat);
    topLid.rotation.x = -Math.PI / 2;
    topLid.position.y = 0.6;
    group.add(topLid);
    const botLid = new THREE.Mesh(lidGeo, lidMat);
    botLid.rotation.x = Math.PI / 2;
    botLid.position.y = -0.6;
    group.add(botLid);
  } else if (
    p.includes("rock") ||
    p.includes("stone") ||
    p.includes("boulder") ||
    p.includes("asteroid")
  ) {
    const geo = new THREE.IcosahedronGeometry(0.6, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const n = (Math.sin(pos.getX(i) * 9 + pos.getY(i) * 7) + Math.cos(pos.getZ(i) * 8)) * 0.06;
      pos.setXYZ(i, pos.getX(i) + n, pos.getY(i) + n * 0.6, pos.getZ(i) + n);
    }
    geo.computeVertexNormals();
    group.add(
      new THREE.Mesh(
        geo,
        createMaterial(
          p.includes("stone") || !p.includes("rock") ? "#78716c" : matConfig.color,
          0.05,
          0.95,
        ),
      ),
    );
  } else if (
    p.includes("coin") ||
    p.includes("medallion") ||
    p.includes("disc") ||
    p.includes("disk")
  ) {
    const geo = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 64);
    group.add(
      new THREE.Mesh(geo, createMaterial(p.includes("silver") ? "#d4d4d8" : "#eab308", 0.95, 0.2)),
    );
  } else if (
    p.includes("book") ||
    p.includes("tome") ||
    p.includes("grimoire") ||
    p.includes("journal")
  ) {
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.15, 1.2),
      createMaterial(p.includes("red") ? "#7f1d1d" : "#451a03", 0.1, 0.9),
    );
    group.add(cover);
    const pages = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.1, 1.15),
      createMaterial("#f5f5dc", 0, 1),
    );
    pages.position.y = 0.01;
    group.add(pages);
  } else if (p.includes("mushroom") || p.includes("toadstool")) {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.6, 24),
      createMaterial("#f5f5dc", 0, 0.95),
    );
    stem.position.y = -0.05;
    group.add(stem);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      createMaterial(p.includes("blue") ? "#3b82f6" : "#ef4444", 0.1, 0.7),
    );
    cap.position.y = 0.25;
    group.add(cap);
  } else {
    // Smart default — choose a primitive based on prompt cues instead of a generic torus knot
    let geo: THREE.BufferGeometry;
    if (/round|sphere|ball|orb|egg|fruit|apple|orange|berry|planet|moon/.test(p)) {
      geo = new THREE.SphereGeometry(0.55, 48, 48);
    } else if (/tall|long|stick|rod|pole|log|trunk|bottle/.test(p)) {
      geo = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 32);
    } else if (/flat|plate|tile|board|panel/.test(p)) {
      geo = new THREE.BoxGeometry(1.2, 0.08, 1.2);
    } else if (/sharp|spike|tooth|fang|horn/.test(p)) {
      geo = new THREE.ConeGeometry(0.4, 1.1, 32);
    } else if (/cube|block|brick|crate|box/.test(p)) {
      geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    } else {
      // Rounded organic blob — friendlier default than a torus knot
      const base = new THREE.IcosahedronGeometry(0.55, 2);
      const pos = base.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i),
          y = pos.getY(i),
          z = pos.getZ(i);
        const n = Math.sin(x * 4) * Math.cos(y * 4) * Math.sin(z * 4) * 0.08;
        pos.setXYZ(i, x + n, y + n, z + n);
      }
      base.computeVertexNormals();
      geo = base;
    }
    const mesh = new THREE.Mesh(geo, createMaterial(matConfig.color));
    group.add(mesh);

    if (matConfig.emissiveIntensity > 0) {
      const ringGeo = new THREE.TorusGeometry(0.85, 0.02, 16, 128);
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(matConfig.color) });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.set(Math.PI / 4, Math.PI / 4, 0);
      group.add(ring);
    }
  }

  // Set shadows for all child meshes
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}
