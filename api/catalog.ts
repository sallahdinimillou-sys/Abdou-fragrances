import type { IncomingMessage, ServerResponse } from 'http';
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

export default async function handler(req: any, res: any) {
  // CORS and Cache-Control headers for Vercel Edge caching (30 min cache, 24h stale-while-revalidate)
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    const [prodSnap, packSnap, setSnap] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'packs')),
      getDocs(collection(db, 'settings'))
    ]);

    const products: any[] = [];
    prodSnap.forEach((doc) => {
      const data = doc.data();
      // Keep payload lightweight (~76 KB) to stay well under Vercel's 4.5 MB limit
      const imageUrl = data.imageUrl || (data.imageData ? `/api/image?id=${doc.id}&type=product` : '');
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
        imageUrl: imageUrl,
        images: imageUrl ? [imageUrl] : []
      });
    });

    const packs: any[] = [];
    packSnap.forEach((doc) => {
      const data = doc.data();
      const imageUrl = data.imageUrl || (data.image ? `/api/image?id=${doc.id}&type=pack` : '');
      packs.push({
        id: doc.id,
        name: data.name || { fr: '', ar: '' },
        category: data.category || 'men',
        description: data.description || { fr: '', ar: '' },
        price: typeof data.price === 'number' ? data.price : 0,
        isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
        image: imageUrl,
        imageUrl: imageUrl
      });
    });

    let whatsappNumber = '212603288119';
    let storeName = 'ABDOU FRAGRANCES';
    let announcementText = {
      fr: "ABDOU FRAGRANCES — VENTE EN FLACONS ET DÉCANTS SUR-MESURE VIA WHATSAPP",
      ar: "ABDOU FRAGRANCES — بيع الزجاجات الأصلية والتقسيم (ديكانت) حصرياً عبر خدمة واتساب"
    };

    setSnap.forEach((doc) => {
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

    return res.status(200).json(payload);
  } catch (error: any) {
    console.error('Error in /api/catalog:', error);
    return res.status(500).json({
      error: 'Failed to fetch catalog from Firestore',
      message: error?.message || String(error)
    });
  }
}
