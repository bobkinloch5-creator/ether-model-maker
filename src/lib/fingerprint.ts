// Browser fingerprint — stable per (device + browser). Not VPN-defeating on its own;
// the server also hashes the request IP as a second signal.

async function sha256(input: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    // Fallback: simple non-crypto hash
    let h = 0;
    for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
    return `fb_${h.toString(16)}`;
  }
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function canvasSignature(): string {
  try {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 60;
    const ctx = c.getContext("2d");
    if (!ctx) return "no-ctx";
    ctx.textBaseline = "top";
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 60, 30);
    ctx.fillStyle = "#069";
    ctx.fillText("KingDavez🎨", 2, 2);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("KingDavez🎨", 4, 14);
    return c.toDataURL();
  } catch {
    return "canvas-err";
  }
}

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "ssr";
  const persisted = localStorage.getItem("kd_fp_v1");
  if (persisted) return persisted;

  const parts = [
    navigator.userAgent,
    navigator.language,
    (navigator.languages || []).join(","),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency || 0),
    String((navigator as any).deviceMemory || 0),
    String((navigator as any).maxTouchPoints || 0),
    navigator.platform || "",
    canvasSignature(),
  ];
  const hash = await sha256(parts.join("|"));
  try { localStorage.setItem("kd_fp_v1", hash); } catch {}
  return hash;
}
