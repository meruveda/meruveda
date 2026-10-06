import type { ImageLoaderProps } from "next/image";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
const REMOTE_PATTERN = /^https?:\/\//i;

/**
 * Custom Next.js image loader.
 *
 * Remote photos are served through the backend proxy (which fetches with a long
 * timeout, resizes and caches) because Next's own optimizer gives up on the
 * upstream download after 7 seconds — see backend/src/routes/imageRoutes.ts.
 * Local /public assets keep going through /_next/image as usual.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!REMOTE_PATTERN.test(src)) {
    return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
  }

  return `${API_BASE}/images/fetch?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
