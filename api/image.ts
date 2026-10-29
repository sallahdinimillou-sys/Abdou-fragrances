import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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
  const query = req.query || {};
  // Handle query from URL parameters if req.query is not pre-parsed
  let id = query.id;
  let type = query.type || 'product';

  if (!id && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      id = parsedUrl.searchParams.get('id');
      type = parsedUrl.searchParams.get('type') || 'product';
    } catch (_) {}
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).send('Missing document ID parameter');
  }

  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    const collectionName = type === 'pack' ? 'packs' : 'products';
    const docSnap = await getDoc(doc(db, collectionName, id));

    if (!docSnap.exists()) {
      return res.status(404).send('Document not found');
    }

    const data = docSnap.data();
    let imageStr = '';
    if (type === 'pack') {
      imageStr = data.image || data.imageUrl || '';
    } else {
      imageStr = data.imageData || (data.images && data.images[0]) || data.imageUrl || '';
    }

    if (!imageStr) {
      return res.status(404).send('No image available for this item');
    }

    // If already an external HTTP URL, redirect
    if (imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
      return res.redirect(imageStr);
    }

    // Parse data URI (e.g. data:image/jpeg;base64,...)
    const match = imageStr.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const contentType = match[1];
      const buffer = Buffer.from(match[2], 'base64');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).send(buffer);
    }

    return res.status(400).send('Unrecognized image format');
  } catch (error: any) {
    console.error('Error in /api/image:', error);
    return res.status(500).send('Internal server error loading image');
  }
}
