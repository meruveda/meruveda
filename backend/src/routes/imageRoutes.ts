import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Image derivative proxy used by the storefront's custom Next.js image loader.
 *
 * Product photos live in Supabase Storage and are multi-megabyte PNGs. Next's
 * own optimizer aborts upstream downloads after a hard-coded 7 seconds, so on a
 * slow link every remote image came back as an error and the site rendered with
 * no photos. This endpoint fetches with a generous timeout, resizes with sharp
 * and caches the result on disk, so the browser only ever receives a small WebP.
 *
 * SSRF: only https URLs on the Supabase host (and *.supabase.co) are accepted.
 */
const router = Router();

const CACHE_DIR = path.join(process.cwd(), '.cache', 'images');
const FETCH_TIMEOUT_MS = 60_000;
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

const supabaseHost = (() => {
  try {
    return new URL(process.env.SUPABASE_URL || '').hostname;
  } catch {
    return '';
  }
})();

function isAllowedSource(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (!supabaseHost) return false;
  return parsed.hostname === supabaseHost || parsed.hostname.endsWith('.supabase.co');
}

function clamp(value: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

router.get('/fetch', async (req: Request, res: Response) => {
  try {
    const source = String(req.query.url || '');
    if (!isAllowedSource(source)) {
      return res.status(400).json({ error: { message: 'Unsupported image URL.' } });
    }

    const width = clamp(String(req.query.w || ''), 16, 2048, 828);
    const quality = clamp(String(req.query.q || ''), 30, 95, 75);

    // Two-tier cache: the (slow) upstream download is stored once per URL, then
    // every requested width is rendered from disk — a single srcset page would
    // otherwise re-download the multi-megabyte original for each size.
    const sourceKey = crypto.createHash('sha1').update(source).digest('hex');
    const sourceFile = path.join(CACHE_DIR, `${sourceKey}.src`);
    const derivativeKey = crypto.createHash('sha1').update(`${source}|${width}|${quality}`).digest('hex');
    const derivativeFile = path.join(CACHE_DIR, `${derivativeKey}.webp`);

    fs.mkdirSync(CACHE_DIR, { recursive: true });

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (fs.existsSync(derivativeFile)) {
      return fs.createReadStream(derivativeFile).pipe(res);
    }

    if (!fs.existsSync(sourceFile)) {
      const upstream = await fetch(source, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: 'follow',
      });
      if (!upstream.ok) {
        return res.status(502).json({ error: { message: `Upstream image returned ${upstream.status}.` } });
      }

      const length = Number(upstream.headers.get('content-length') || 0);
      if (length > MAX_SOURCE_BYTES) {
        return res.status(502).json({ error: { message: 'Image too large.' } });
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      if (buffer.byteLength > MAX_SOURCE_BYTES) {
        return res.status(502).json({ error: { message: 'Image too large.' } });
      }

      const tmpSource = `${sourceFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmpSource, buffer);
      fs.renameSync(tmpSource, sourceFile);
    }

    const output = await sharp(fs.readFileSync(sourceFile))
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    const tmpDerivative = `${derivativeFile}.${process.pid}.tmp`;
    fs.writeFileSync(tmpDerivative, output);
    fs.renameSync(tmpDerivative, derivativeFile);

    return res.send(output);
  } catch (error: any) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    console.error('[Images] derivative failed:', error?.message || error);
    return res.status(timedOut ? 504 : 500).json({
      error: { message: timedOut ? 'Upstream image timed out.' : 'Could not process image.' },
    });
  }
});

export default router;
