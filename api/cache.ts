export interface ImageCacheEntry {
  buffer: Buffer;
  contentType: string;
  version: string;
  externalUrl?: string;
}

// In-memory cache shared across calls within the same Node/Serverless process
const memoryCache = new Map<string, ImageCacheEntry>();

export const NEUTRAL_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <rect width="400" height="500" fill="#EAE4DC"/>
  <g transform="translate(140, 140)" stroke="#8C857B" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="42" y="10" width="36" height="28" rx="3" fill="#D9D1C5"/>
    <rect x="50" y="38" width="20" height="12" fill="#D9D1C5"/>
    <rect x="15" y="50" width="90" height="130" rx="8" fill="#FDFCFA"/>
    <path d="M 22 110 Q 60 115 98 110 L 98 172 Q 60 176 22 172 Z" fill="#EAE4DC" opacity="0.6"/>
    <rect x="30" y="85" width="60" height="40" rx="2" stroke="#8C857B" stroke-width="1.5" fill="#F4EFE7"/>
    <line x1="42" y1="100" x2="78" y2="100" stroke="#5A1A24" stroke-width="1.5"/>
    <line x1="48" y1="110" x2="72" y2="110" stroke="#8C857B" stroke-width="1"/>
  </g>
  <text x="200" y="360" text-anchor="middle" font-family="sans-serif" font-size="11" letter-spacing="2" fill="#8C857B" text-transform="uppercase">Abdou Fragrances</text>
</svg>`;

export const NEUTRAL_SVG_BUFFER = Buffer.from(NEUTRAL_SVG_STRING, 'utf-8');

/**
 * Extracts a stable version string from a Firestore document
 */
export function extractVersion(data: any): string {
  if (data?.updatedAt) {
    if (typeof data.updatedAt === 'number') return String(data.updatedAt);
    if (typeof data.updatedAt === 'string') return String(Date.parse(data.updatedAt) || data.updatedAt.slice(-8));
    if (typeof data.updatedAt.seconds === 'number') return String(data.updatedAt.seconds);
  }
  if (data?.createdAt) {
    if (typeof data.createdAt === 'number') return String(data.createdAt);
    if (typeof data.createdAt === 'string') return String(Date.parse(data.createdAt) || data.createdAt.slice(-8));
    if (typeof data.createdAt.seconds === 'number') return String(data.createdAt.seconds);
  }
  const img = data?.imageData || (Array.isArray(data?.images) && data.images[0]) || data?.image || '';
  if (img && typeof img === 'string') {
    return String(img.length);
  }
  return '1';
}

/**
 * Parses any image string format:
 * - Data URLs: data:image/jpeg;base64,... (supports jpeg, png, webp, svg, gif)
 * - Raw base64 strings: detects magic bytes or defaults to image/jpeg
 * - SVG strings: <svg...
 * Returns Buffer and MIME contentType, or null if unparseable.
 */
export function parseImageData(imageStr?: string | null): { buffer: Buffer; contentType: string } | null {
  if (!imageStr || typeof imageStr !== 'string') return null;
  const trimmed = imageStr.trim();
  if (!trimmed) return null;

  // 1. Data URL format: data:image/...;base64,....
  const dataUrlMatch = trimmed.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    try {
      const contentType = dataUrlMatch[1].toLowerCase();
      const buffer = Buffer.from(dataUrlMatch[2], 'base64');
      if (buffer.length > 0) {
        return { buffer, contentType };
      }
    } catch (_) {}
  }

  // 2. SVG string format directly
  if (trimmed.startsWith('<svg') || trimmed.includes('<svg xmlns=')) {
    return {
      buffer: Buffer.from(trimmed, 'utf-8'),
      contentType: 'image/svg+xml'
    };
  }

  // 3. Raw Base64 string without data: prefix
  // Detect MIME type from common base64 magic bytes
  if (trimmed.length > 20 && /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed)) {
    try {
      const cleanBase64 = trimmed.replace(/[\r\n\s]+/g, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.length > 0) {
        let contentType = 'image/jpeg';
        if (cleanBase64.startsWith('/9j/')) {
          contentType = 'image/jpeg';
        } else if (cleanBase64.startsWith('iVBORw0KGgo') || cleanBase64.startsWith('iVBORw')) {
          contentType = 'image/png';
        } else if (cleanBase64.startsWith('UklGR')) {
          contentType = 'image/webp';
        } else if (cleanBase64.startsWith('R0lGOD')) {
          contentType = 'image/gif';
        } else if (cleanBase64.startsWith('PHN2Zy')) {
          contentType = 'image/svg+xml';
        }
        return { buffer, contentType };
      }
    } catch (_) {}
  }

  return null;
}

export function getCachedImage(id: string, type: 'product' | 'pack'): ImageCacheEntry | undefined {
  return memoryCache.get(`${type}:${id}`);
}

export function setCachedImage(id: string, type: 'product' | 'pack', entry: ImageCacheEntry): void {
  // Cap cache size at 200 items to keep memory well under 50 MB
  if (memoryCache.size > 200) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(`${type}:${id}`, entry);
}
