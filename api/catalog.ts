import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { extractVersion, parseImageData, setCachedImage } from './cache.ts';

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

let lastSuccessfulCatalogPayload: any = null;

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let prodSnap: any = null;
    let packSnap: any = null;
    let setSnap: any = null;
    let lastError: any = null;

    // Retry up to 2 times (3 attempts total) on temporary/quota errors
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

        const results = await Promise.all([
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'packs')),
          getDocs(collection(db, 'settings'))
        ]);
        prodSnap = results[0];
        packSnap = results[1];
        setSnap = results[2];
        lastError = null;
        break;
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

    if (lastError || !prodSnap || !packSnap || !setSnap) {
      console.warn('Firestore read error in /api/catalog:', lastError?.code || lastError?.message);
      if (lastSuccessfulCatalogPayload) {
        res.setHeader('Cache-Control', 'public, s-maxage=60');
        return res.status(200).json(lastSuccessfulCatalogPayload);
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(503).json({
        error: 'Service Unavailable',
        message: lastError?.message || 'Failed to fetch catalog from Firestore'
      });
    }

    const products: any[] = [];
    prodSnap.forEach((doc: any) => {
      const data = doc.data();
      const version = extractVersion(data);

      // Check external URL candidates
      let externalUrl = '';
      if (typeof data.imageUrl === 'string' && (data.imageUrl.startsWith('http://') || data.imageUrl.startsWith('https://'))) {
        externalUrl = data.imageUrl;
      } else if (typeof data.image === 'string' && (data.image.startsWith('http://') || data.image.startsWith('https://'))) {
        externalUrl = data.image;
      } else if (Array.isArray(data.images) && typeof data.images[0] === 'string' && (data.images[0].startsWith('http://') || data.images[0].startsWith('https://'))) {
        externalUrl = data.images[0];
      }

      // Check embedded image data candidates
      const rawImageStr = (typeof data.imageData === 'string' && data.imageData.trim())
        ? data.imageData.trim()
        : (Array.isArray(data.images) && typeof data.images[0] === 'string' && data.images[0].trim())
        ? data.images[0].trim()
        : (typeof data.image === 'string' && data.image.trim())
        ? data.image.trim()
        : '';

      let finalImageUrl = externalUrl;

      if (!finalImageUrl && rawImageStr) {
        // Pre-parse and warm the in-memory cache
        const parsed = parseImageData(rawImageStr);
        if (parsed) {
          setCachedImage(doc.id, 'product', {
            buffer: parsed.buffer,
            contentType: parsed.contentType,
            version
          });
        }
        finalImageUrl = `/api/image?id=${encodeURIComponent(doc.id)}&type=product&v=${version}`;
      } else if (externalUrl) {
        setCachedImage(doc.id, 'product', {
          buffer: Buffer.alloc(0),
          contentType: '',
          version,
          externalUrl
        });
      }

      products.push({
        id: doc.id,
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
        imageUrl: finalImageUrl,
        images: finalImageUrl ? [finalImageUrl] : []
      });
    });

    const packs: any[] = [];
    packSnap.forEach((doc: any) => {
      const data = doc.data();
      const version = extractVersion(data);

      let externalUrl = '';
      if (typeof data.imageUrl === 'string' && (data.imageUrl.startsWith('http://') || data.imageUrl.startsWith('https://'))) {
        externalUrl = data.imageUrl;
      } else if (typeof data.image === 'string' && (data.image.startsWith('http://') || data.image.startsWith('https://'))) {
        externalUrl = data.image;
      }

      const rawImageStr = (typeof data.image === 'string' && data.image.trim())
        ? data.image.trim()
        : (typeof data.imageData === 'string' && data.imageData.trim())
        ? data.imageData.trim()
        : (Array.isArray(data.images) && typeof data.images[0] === 'string' && data.images[0].trim())
        ? data.images[0].trim()
        : '';

      let finalImageUrl = externalUrl;

      if (!finalImageUrl && rawImageStr) {
        const parsed = parseImageData(rawImageStr);
        if (parsed) {
          setCachedImage(doc.id, 'pack', {
            buffer: parsed.buffer,
            contentType: parsed.contentType,
            version
          });
        }
        finalImageUrl = `/api/image?id=${encodeURIComponent(doc.id)}&type=pack&v=${version}`;
      } else if (externalUrl) {
        setCachedImage(doc.id, 'pack', {
          buffer: Buffer.alloc(0),
          contentType: '',
          version,
          externalUrl
        });
      }

      packs.push({
        id: doc.id,
        name: data.name || { fr: '', ar: '' },
        category: data.category || 'men',
        description: data.description || { fr: '', ar: '' },
        price: typeof data.price === 'number' ? data.price : 0,
        isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
        image: finalImageUrl,
        imageUrl: finalImageUrl
      });
    });

    let whatsappNumber = '212603288119';
    let storeName = 'ABDOU FRAGRANCES';
    let announcementText = {
      fr: "ABDOU FRAGRANCES — VENTE EN FLACONS ET DÉCANTS SUR-MESURE VIA WHATSAPP",
      ar: "ABDOU FRAGRANCES — بيع الزجاجات الأصلية والتقسيم (ديكانت) حصرياً عبر خدمة واتساب"
    };

    setSnap.forEach((doc: any) => {
      const data = doc.data();
      if (doc.id === 'whatsapp' && data.whatsapp_number) {
        whatsappNumber = data.whatsapp_number;
      }
      if (doc.id === 'general') {
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

    const payload = {
      products,
      packs,
      settings,
      timestamp: Date.now()
    };

    lastSuccessfulCatalogPayload = payload;
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error('Error in /api/catalog:', error);
    if (lastSuccessfulCatalogPayload) {
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).json(lastSuccessfulCatalogPayload);
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      error: 'Service Unavailable',
      message: error?.message || String(error)
    });
  }
}
