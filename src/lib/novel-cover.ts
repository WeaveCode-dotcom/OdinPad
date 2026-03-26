import type { Novel } from "@/types/novel";

/** Stored in `Novel.coverImageDataUrl` — base64 data URL from local file import. */
export const MAX_COVER_DATA_URL_CHARS = 2_800_000;

/** Max width after client-side resize (keeps JSON and sync smaller). */
export const COVER_MAX_WIDTH_PX = 600;
const COVER_JPEG_QUALITY = 0.82;

/**
 * Downscales raster images to JPEG data URL for shelf storage.
 * GIF/WebP/PNG are flattened (no animation).
 */
export function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w < 1 || h < 1) {
        reject(new Error("Invalid image dimensions"));
        return;
      }
      if (w > COVER_MAX_WIDTH_PX) {
        h = Math.round((h * COVER_MAX_WIDTH_PX) / w);
        w = COVER_MAX_WIDTH_PX;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", COVER_JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

export function isValidCoverDataUrl(s: string): boolean {
  if (s.length === 0 || s.length > MAX_COVER_DATA_URL_CHARS) return false;
  return /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(s);
}

/** Image to show on cards; prefers Supabase Storage URL, then valid data URLs. */
export function getCoverDisplayUrl(
  novel: Pick<Novel, "coverImageDataUrl" | "coverImageStorageUrl">,
): string | undefined {
  const storage = novel.coverImageStorageUrl?.trim();
  if (storage && /^https?:\/\//.test(storage)) return storage;
  const u = novel.coverImageDataUrl;
  if (u && isValidCoverDataUrl(u)) return u;
  return undefined;
}
