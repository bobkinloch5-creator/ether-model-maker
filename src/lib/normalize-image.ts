/**
 * Normalize any image file (HEIC, WEBP, AVIF, BMP, TIFF, GIF, PNG, JPG, ...)
 * into a JPEG data URL. Uses createImageBitmap when available (handles HEIC
 * on Safari/iOS natively) and falls back to <img> decoding for everything
 * else. Caps the longest side and strips EXIF, ensuring downstream pipelines
 * get a predictable, reasonably-sized JPEG.
 */
export async function normalizeImageToJpeg(
  file: File,
  opts: { maxSide?: number; quality?: number } = {},
): Promise<string> {
  const maxSide = opts.maxSide ?? 2048;
  const quality = opts.quality ?? 0.92;

  let bitmap: ImageBitmap | null = null;
  let width = 0;
  let height = 0;
  let source: CanvasImageSource;

  try {
    // Preferred path — handles HEIC on Safari, WEBP/AVIF everywhere modern.
    bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    source = bitmap;
  } catch {
    // Fallback via <img> + object URL (covers most browser-decodable formats).
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Image decode failed"));
        el.src = url;
      });
      width = img.naturalWidth;
      height = img.naturalHeight;
      source = img;
    } finally {
      // Revoke after the canvas draw below — defer with a microtask.
      queueMicrotask(() => URL.revokeObjectURL(url));
    }
  }

  if (!width || !height) {
    throw new Error("Image has no dimensions");
  }

  // Scale down if needed.
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Fill white so transparent PNGs don't become black when encoded to JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(source, 0, 0, outW, outH);
  bitmap?.close?.();

  return canvas.toDataURL("image/jpeg", quality);
}
