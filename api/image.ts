import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import {
  getCachedImage,
  setCachedImage,
  parseImageData,
  extractVersion,
  NEUTRAL_SVG_BUFFER
} from './cache.ts';

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
    return res.status(400).send('Missing document ID parameter');
  }

  // 1. Check in-memory cache first (instant, 0 Firestore reads)
  const cached = getCachedImage(id, type);
  if (cached) {
    if (cached.externalUrl) {
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
      return res.redirect(302, cached.externalUrl);
    }
    if (cached.buffer && cached.buffer.length > 0 && cached.contentType) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
      return res.status(200).send(cached.buffer);
    }
  }

  // 2. Read from Firestore with up to 2 retries on temporary errors (429/5xx/timeout/resource-exhausted)
  let docSnap: any = null;
  let lastError: any = null;
  const collectionName = type === 'pack' ? 'packs' : 'products';

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      const docRef = doc(db, collectionName, id);
      docSnap = await getDoc(docRef);
      lastError = null;
      break; // Success
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err?.code === 'resource-exhausted' ||
        err?.code === 'unavailable' ||
        err?.code === 'deadline-exceeded' ||
        err?.status === 429 ||
        err?.status >= 500;

      if (isRetryable && attempt < 2) {
        await delay(150 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  // If Firestore read threw an error (e.g. quota exhausted or network error)
  if (lastError || !docSnap) {
    console.warn(`Firestore read failure for image ${type}:${id}:`, lastError?.code || lastError?.message);
    // If quota exceeded or temporary failure: serve the neutral SVG placeholder with status 200
    // so user never sees a broken icon, but with short cache so it revalidates soon
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(NEUTRAL_SVG_BUFFER);
  }

  if (!docSnap.exists()) {
    // Document truly missing: serve neutral SVG placeholder with status 200 and short cache
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(NEUTRAL_SVG_BUFFER);
  }

  const data = docSnap.data();
  const version = extractVersion(data);

  // Check for external HTTPS / HTTP URL
  let externalUrl = '';
  if (typeof data.imageUrl === 'string' && (data.imageUrl.startsWith('http://') || data.imageUrl.startsWith('https://'))) {
    externalUrl = data.imageUrl;
  } else if (typeof data.image === 'string' && (data.image.startsWith('http://') || data.image.startsWith('https://'))) {
    externalUrl = data.image;
  } else if (Array.isArray(data.images) && typeof data.images[0] === 'string' && (data.images[0].startsWith('http://') || data.images[0].startsWith('https://'))) {
    externalUrl = data.images[0];
  }

  if (externalUrl) {
    setCachedImage(id, type, {
      buffer: Buffer.alloc(0),
      contentType: '',
      version,
      externalUrl
    });
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    return res.redirect(302, externalUrl);
  }

  // Check for embedded base64 image data
  const rawImageStr = (typeof data.imageData === 'string' && data.imageData.trim())
    ? data.imageData.trim()
    : (Array.isArray(data.images) && typeof data.images[0] === 'string' && data.images[0].trim())
    ? data.images[0].trim()
    : (typeof data.image === 'string' && data.image.trim())
    ? data.image.trim()
    : '';

  if (!rawImageStr) {
    // Truly missing image: return neutral SVG placeholder
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(NEUTRAL_SVG_BUFFER);
  }

  const parsed = parseImageData(rawImageStr);
  if (!parsed || !parsed.buffer || parsed.buffer.length === 0) {
    // Corrupted image data: return neutral SVG placeholder
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(NEUTRAL_SVG_BUFFER);
  }

  // Store in memory cache
  setCachedImage(id, type, {
    buffer: parsed.buffer,
    contentType: parsed.contentType,
    version
  });

  // Successful response: long edge & browser cache headers
  res.setHeader('Content-Type', parsed.contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  return res.status(200).send(parsed.buffer);
}
