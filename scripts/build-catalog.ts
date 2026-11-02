import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDPvX5DkZHCFp5mo-qHFdHN2SsEFw2q9IU",
  authDomain: "vivid-solution-tk7s0.firebaseapp.com",
  projectId: "vivid-solution-tk7s0",
  storageBucket: "vivid-solution-tk7s0.firebasestorage.app",
  messagingSenderId: "358663154812",
  appId: "1:358663154812:web:56d1140f9d18b72632adf9",
  firestoreDatabaseId: "ai-studio-lessenceatelier-c05e6153-c979-4e4e-b21f-8a8a38f148bb"
};

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const IMG_DIR = path.join(PUBLIC_DIR, 'img');
const CATALOG_PATH = path.join(PUBLIC_DIR, 'catalog.json');

/**
 * Parses image data from any format into a Buffer
 */
async function parseImageBuffer(raw?: any): Promise<Buffer | null> {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // External URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const resp = await fetch(trimmed, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (resp.ok) {
          const arr = await resp.arrayBuffer();
          return Buffer.from(arr);
        }
      } catch (err: any) {
        console.warn(`[WARN] Failed to fetch external image (${trimmed.slice(0, 50)}...):`, err.message);
      }
      return null;
    }

    // Data URL
    const dataUrlMatch = trimmed.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]+)$/i);
    if (dataUrlMatch) {
      try {
        const cleanBase64 = dataUrlMatch[2].replace(/\s+/g, '');
        const buf = Buffer.from(cleanBase64, 'base64');
        if (buf.length > 0) return buf;
      } catch (_) {}
    }

    // SVG string
    if (trimmed.startsWith('<svg') || trimmed.includes('<svg xmlns=')) {
      try {
        return Buffer.from(trimmed, 'utf-8');
      } catch (_) {}
    }

    // Raw Base64 string without prefix
    const cleanBase64 = trimmed.replace(/\s+/g, '');
    if (cleanBase64.length > 20 && /^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
      try {
        const buf = Buffer.from(cleanBase64, 'base64');
        if (buf.length > 0) return buf;
      } catch (_) {}
    }
  }

  return null;
}

/**
 * Extracts raw image candidates from a document
 */
function extractImageCandidate(data: any): string | null {
  if (!data || typeof data !== 'object') return null;

  if (typeof data.imageData === 'string' && data.imageData.trim()) {
    return data.imageData.trim();
  }
  if (typeof data.image === 'string' && data.image.trim()) {
    return data.image.trim();
  }
  if (typeof data.imageUrl === 'string' && data.imageUrl.trim()) {
    return data.imageUrl.trim();
  }
  if (Array.isArray(data.images)) {
    for (const item of data.images) {
      if (typeof item === 'string' && item.trim()) {
        return item.trim();
      }
    }
  }
  return null;
}

/**
 * Sanitizes a document ID for use in a file name
 */
function sanitizeFileName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

async function main() {
  console.log('[build-catalog] Starting static catalog generation from Firestore...');

  // Ensure directories exist
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }
  if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
  }

  // Check for previous snapshot for safety threshold comparison
  let previousSnapshot: any = null;
  if (fs.existsSync(CATALOG_PATH)) {
    try {
      previousSnapshot = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
    } catch (_) {}
  }

  let prodSnap: any = null;
  let packSnap: any = null;
  let setSnap: any = null;

  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    console.log('[build-catalog] Querying Firestore collections (products, packs, settings)...');
    const results = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'packs')),
      getDocs(collection(db, 'settings'))
    ]);

    prodSnap = results[0];
    packSnap = results[1];
    setSnap = results[2];
  } catch (err: any) {
    console.warn('[WARN] Firestore query failed during build-catalog:', err.code, err.message);
    if (previousSnapshot && Array.isArray(previousSnapshot.products) && previousSnapshot.products.length > 0) {
      console.warn(`[SAFETY] Keeping previous snapshot (${previousSnapshot.products.length} products). Build will continue.`);
      process.exit(0);
    } else {
      console.error('[FATAL] Firestore read failed and no previous snapshot exists.');
      process.exit(1);
    }
  }

  const remoteProductCount = prodSnap ? prodSnap.size : 0;
  console.log(`[build-catalog] Fetched ${remoteProductCount} products, ${packSnap ? packSnap.size : 0} packs from Firestore.`);

  // SAFETY CHECK: If fewer than 70% of previous products returned, do NOT overwrite!
  if (previousSnapshot && Array.isArray(previousSnapshot.products) && previousSnapshot.products.length > 0) {
    const threshold = Math.floor(previousSnapshot.products.length * 0.7);
    if (remoteProductCount < threshold) {
      console.warn(
        `[SAFETY] Fetched product count (${remoteProductCount}) is below 70% threshold of previous snapshot (${previousSnapshot.products.length}).`
      );
      console.warn('[SAFETY] Aborting snapshot update to preserve existing catalog. Existing files kept untouched.');
      process.exit(0);
    }
  }

  if (remoteProductCount === 0) {
    if (previousSnapshot && previousSnapshot.products?.length > 0) {
      console.warn('[SAFETY] Received 0 products from Firestore. Keeping previous snapshot.');
      process.exit(0);
    } else {
      console.error('[FATAL] 0 products received from Firestore and no previous snapshot exists.');
      process.exit(1);
    }
  }

  const generatedImageFiles = new Set<string>();
  const products: any[] = [];
  const noImageProducts: Array<{ id: string; name: string }> = [];

  // Process Products
  for (const docSnap of prodSnap.docs) {
    const data = docSnap.data();
    const id = docSnap.id;
    const safeId = sanitizeFileName(id);
    const candidate = extractImageCandidate(data);

    let staticImageUrl = '';
    if (candidate) {
      try {
        const rawBuffer = await parseImageBuffer(candidate);
        if (rawBuffer && rawBuffer.length > 0) {
          // Resize with Sharp to max 1000px, WebP quality 80
          const webpBuffer = await sharp(rawBuffer)
            .resize({
              width: 1000,
              height: 1000,
              fit: 'inside',
              withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .toBuffer();

          const hash = crypto.createHash('md5').update(webpBuffer).digest('hex').slice(0, 8);
          const fileName = `${safeId}-${hash}.webp`;
          const filePath = path.join(IMG_DIR, fileName);

          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, webpBuffer);
          }
          generatedImageFiles.add(fileName);
          staticImageUrl = `/img/${fileName}`;
        }
      } catch (err: any) {
        console.warn(`[WARN] Failed to process image for product ${id}:`, err.message);
      }
    }

    if (!staticImageUrl) {
      noImageProducts.push({
        id,
        name: data.name?.fr || data.name?.ar || id
      });
    }

    products.push({
      id,
      name: data.name || { fr: '', ar: '' },
      category: data.category || 'all',
      description: data.description || { fr: '', ar: '' },
      sizes: Array.isArray(data.sizes) ? data.sizes : [],
      brand: data.brand || 'ABDOU FRAGRANCES',
      collection: data.collection || '',
      family: data.family || '',
      gender: data.gender || 'Unisex',
      pyramid: data.pyramid || null,
      inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
      featured: typeof data.featured === 'boolean' ? data.featured : false,
      imageUrl: staticImageUrl,
      images: staticImageUrl ? [staticImageUrl] : []
    });
  }

  // Process Packs
  const packs: any[] = [];
  const noImagePacks: Array<{ id: string; name: string }> = [];

  for (const docSnap of packSnap.docs) {
    const data = docSnap.data();
    const id = docSnap.id;
    const safeId = sanitizeFileName(id);
    const candidate = extractImageCandidate(data);

    let staticImageUrl = '';
    if (candidate) {
      try {
        const rawBuffer = await parseImageBuffer(candidate);
        if (rawBuffer && rawBuffer.length > 0) {
          const webpBuffer = await sharp(rawBuffer)
            .resize({
              width: 1000,
              height: 1000,
              fit: 'inside',
              withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .toBuffer();

          const hash = crypto.createHash('md5').update(webpBuffer).digest('hex').slice(0, 8);
          const fileName = `${safeId}-${hash}.webp`;
          const filePath = path.join(IMG_DIR, fileName);

          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, webpBuffer);
          }
          generatedImageFiles.add(fileName);
          staticImageUrl = `/img/${fileName}`;
        }
      } catch (err: any) {
        console.warn(`[WARN] Failed to process image for pack ${id}:`, err.message);
      }
    }

    if (!staticImageUrl) {
      noImagePacks.push({
        id,
        name: data.name?.fr || data.name?.ar || id
      });
    }

    packs.push({
      id,
      name: data.name || { fr: '', ar: '' },
      category: data.category || 'men',
      description: data.description || { fr: '', ar: '' },
      price: typeof data.price === 'number' ? data.price : 0,
      isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
      image: staticImageUrl,
      imageUrl: staticImageUrl,
      includedPerfumes: Array.isArray(data.includedPerfumes) ? data.includedPerfumes : [],
      includedProductIds: Array.isArray(data.includedProductIds) ? data.includedProductIds : []
    });
  }

  // Process Settings
  let whatsappNumber = '212603288119';
  let storeName = 'ABDOU FRAGRANCES';
  let announcementText = {
    fr: "ABDOU FRAGRANCES — VENTE EN FLACONS ET DÉCANTS SUR-MESURE VIA WHATSAPP",
    ar: "ABDOU FRAGRANCES — بيع الزجاجات الأصلية والتقسيم (ديكانت) حصرياً عبر خدمة واتساب"
  };

  setSnap.forEach((docSnap: any) => {
    const data = docSnap.data();
    if (docSnap.id === 'whatsapp' && data.whatsapp_number) {
      whatsappNumber = data.whatsapp_number;
    }
    if (docSnap.id === 'general') {
      if (data.store_name) storeName = data.store_name;
      if (data.whatsapp_number) whatsappNumber = data.whatsapp_number;
      if (data.announcementText) announcementText = data.announcementText;
    }
  });

  const settings = {
    whatsappNumber,
    storeName,
    announcementText
  };

  // Clean up stale files in public/img that no longer belong to any product/pack
  if (fs.existsSync(IMG_DIR)) {
    const existingImgFiles = fs.readdirSync(IMG_DIR);
    let removedCount = 0;
    for (const file of existingImgFiles) {
      if (file.endsWith('.webp') && !generatedImageFiles.has(file)) {
        try {
          fs.unlinkSync(path.join(IMG_DIR, file));
          removedCount++;
        } catch (_) {}
      }
    }
    if (removedCount > 0) {
      console.log(`[build-catalog] Cleaned up ${removedCount} stale image file(s).`);
    }
  }

  // Compute version hash based on catalog contents
  const versionHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ products, packs, settings }))
    .digest('hex')
    .slice(0, 12);

  const snapshotPayload = {
    version: versionHash,
    generatedAt: new Date().toISOString(),
    products,
    packs,
    settings
  };

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(snapshotPayload, null, 2), 'utf-8');

  // Calculate total size of public/img
  let totalImgBytes = 0;
  if (fs.existsSync(IMG_DIR)) {
    const allImgs = fs.readdirSync(IMG_DIR);
    for (const f of allImgs) {
      totalImgBytes += fs.statSync(path.join(IMG_DIR, f)).size;
    }
  }

  console.log('=== BUILD CATALOG SNAPSHOT COMPLETED SUCCESSFULLY ===');
  console.log(`Total Products: ${products.length} (without image: ${noImageProducts.length})`);
  console.log(`Total Packs: ${packs.length} (without image: ${noImagePacks.length})`);
  console.log(`Total Static Images Generated: ${generatedImageFiles.size}`);
  console.log(`Total public/img Size: ${(totalImgBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Snapshot Version Hash: ${versionHash}`);
  if (noImageProducts.length > 0) {
    console.log('Products without image:', noImageProducts);
  }
  if (noImagePacks.length > 0) {
    console.log('Packs without image:', noImagePacks);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('[build-catalog] Uncaught error:', e);
  process.exit(1);
});
