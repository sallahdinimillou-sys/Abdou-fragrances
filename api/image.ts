import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import {
  getCachedImage,
  setCachedImage,
  parseImageData,
  extractImageSource,
  extractVersion
} from './cache.ts';
import type { ImageCacheEntry } from './cache.ts';

const firebaseConfig = {
  apiKey: "AIzaSyDPvX5DkZHCFp5mo-qHFdHN2SsEFw2q9IU",
  authDomain: "vivid-solution-tk7s0.firebaseapp.com",
  projectId: "vivid-solution-tk7s0",
  storageBucket: "vivid-solution-tk7s0.firebasestorage.app",
  messagingSenderId: "358663154812",
  appId: "1:358663154812:web:56d1140f9d18b72632adf9",
  firestoreDatabaseId: "ai-studio-lessenceatelier-c05e6153-c979-4e4e-b21f-8a8a38f148bb"
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Deduplicate simultaneous in-flight requests for the exact same image ID & type
const inFlightRequests = new Map<string, Promise<{
  cachedEntry?: ImageCacheEntry;
  notFound?: boolean;
  temporaryError?: string;
}>>();

// Concurrency limiter: maximum 6 concurrent Firestore reads across requests
const MAX_CONCURRENT_FIRESTORE_READS = 6;
let activeFirestoreReads = 0;
const readQueue: Array<() => void> = [];

function acquireFirestoreSlot(): Promise<void> {
  if (activeFirestoreReads < MAX_CONCURRENT_FIRESTORE_READS) {
    activeFirestoreReads++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    readQueue.push(() => {
      activeFirestoreReads++;
      resolve();
    });
  });
}

function releaseFirestoreSlot(): void {
  activeFirestoreReads--;
  if (readQueue.length > 0 && activeFirestoreReads < MAX_CONCURRENT_FIRESTORE_READS) {
    const next = readQueue.shift();
    if (next) next();
  }
}

/**
 * Reads a single document from Firestore with up to 3 retries on transient errors
 */
async function fetchDocWithRetry(type: 'product' | 'pack', id: string) {
  const collectionName = type === 'pack' ? 'packs' : 'products';
  let lastError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      return { docSnap, error: null };
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err?.code === 'resource-exhausted' ||
        err?.code === 'unavailable' ||
        err?.code === 'deadline-exceeded' ||
        err?.status === 429 ||
        err?.status >= 500;

      if (isRetryable && attempt < 2) {
        await delay(200 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  return { docSnap: null, error: lastError };
}

/**
 * Gets image from memory cache or fetches from Firestore with concurrency throttling & deduplication
 */
async function getOrFetchImage(type: 'product' | 'pack', id: string): Promise<{
  cachedEntry?: ImageCacheEntry;
  notFound?: boolean;
  temporaryError?: string;
}> {
  // 1. Check in-memory cache first (0 network calls)
  const existing = getCachedImage(id, type);
  if (existing) {
    return { cachedEntry: existing };
  }

  // 2. Reuse in-flight fetch promise if already requested simultaneously
  const reqKey = `${type}:${id}`;
  if (inFlightRequests.has(reqKey)) {
    return inFlightRequests.get(reqKey)!;
  }

  const fetchPromise = (async () => {
    await acquireFirestoreSlot();
    try {
      // Re-check memory cache after waiting in queue
      const cachedAfterQueue = getCachedImage(id, type);
      if (cachedAfterQueue) {
        return { cachedEntry: cachedAfterQueue };
      }

      const { docSnap, error } = await fetchDocWithRetry(type, id);

      if (error || !docSnap) {
        return { temporaryError: error?.message || 'Firestore temporary read error' };
      }

      if (!docSnap.exists()) {
        return { notFound: true };
      }

      const data = docSnap.data();
      const version = extractVersion(data);
      const { externalUrl, rawImageStr } = extractImageSource(data);

      if (externalUrl) {
        const entry: ImageCacheEntry = {
          buffer: Buffer.alloc(0),
          contentType: '',
          version,
          externalUrl
        };
        setCachedImage(id, type, entry);
        return { cachedEntry: entry };
      }

      if (rawImageStr) {
        const parsed = parseImageData(rawImageStr);
        if (parsed && parsed.buffer && parsed.buffer.length > 0) {
          const entry: ImageCacheEntry = {
            buffer: parsed.buffer,
            contentType: parsed.contentType,
            version
          };
          setCachedImage(id, type, entry);
          return { cachedEntry: entry };
        }
      }

      // Document exists but has no valid image attached
      return { notFound: true };
    } finally {
      releaseFirestoreSlot();
      inFlightRequests.delete(reqKey);
    }
  })();

  inFlightRequests.set(reqKey, fetchPromise);
  return fetchPromise;
}

function sendJson(res: any, statusCode: number, data: any) {
  res.statusCode = statusCode;
  if (typeof res.status === 'function') {
    try { res.status(statusCode); } catch (_) {}
  }
  if (typeof res.json === 'function') {
    return res.json(data);
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  const query = req.query || {};
  let id = query.id;
  let type: 'product' | 'pack' = query.type === 'pack' ? 'pack' : 'product';

  if (!id && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      id = parsedUrl.searchParams.get('id');
      if (parsedUrl.searchParams.get('type') === 'pack') {
        type = 'pack';
      }
    } catch (_) {}
  }

  // Set default CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!id || typeof id !== 'string') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status ? res.status(400).send('Missing document ID parameter') : res.end('Missing document ID parameter');
  }

  const result = await getOrFetchImage(type, id);

  // Success: redirect to external URL or serve image buffer with 1-year immutable cache
  if (result.cachedEntry) {
    const { externalUrl, buffer, contentType } = result.cachedEntry;
    if (externalUrl) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      return res.redirect(302, externalUrl);
    }
    if (buffer && buffer.length > 0 && contentType) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      return res.status ? res.status(200).send(buffer) : res.end(buffer);
    }
  }

  // Temporary failure (Firestore quota, timeout, 5xx): return 503 with no-store (never cached)
  if (result.temporaryError) {
    console.warn(`[api/image] Temporary read failure for ${type}:${id}:`, result.temporaryError);
    res.setHeader('Cache-Control', 'no-store');
    return sendJson(res, 503, {
      error: 'Service Unavailable',
      message: 'Temporary error loading image, please retry.'
    });
  }

  // Not found (document missing or no image attached): return 404 with no-store
  if (result.notFound) {
    res.setHeader('Cache-Control', 'no-store');
    return sendJson(res, 404, {
      error: 'Not Found',
      message: 'Product image not found.'
    });
  }

  // Fallback
  res.setHeader('Cache-Control', 'no-store');
  return sendJson(res, 503, {
    error: 'Service Unavailable',
    message: 'Unknown image loading failure'
  });
}
