export { cn } from "cn";

import { z } from "zod";

const DATA_URL_RE = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/;

export function isValidImageDataUrl(value: string, maxBytes: number): boolean {
 if (value.length === 0) return true;
 const m = DATA_URL_RE.exec(value.replace(/\s/g, ""));
 if (!m) return false;
 const raw = m[2];
 let decoded: string;
 try {
 decoded = atob(raw);
 } catch {
 return false;
 }
 if (decoded.length === 0 || decoded.length > maxBytes) return false;
 return btoa(decoded).replace(/=+$/, "") === raw.replace(/=+$/, "");
}

/** Zod schema: data-URL gambar PNG/JPG/WebP, kosong diperbolehkan. */
export const imageDataUrl = (maxBytes: number, message?: string) =>
 z
 .string()
 .max(3_000_000)
 .refine(
 (v) => isValidImageDataUrl(v, maxBytes),
 message ?? `Gambar harus PNG/JPG/WebP (data URL) maksimal ${Math.round(maxBytes / 1024)} KB`,
 );
