import { Product, StoreSettings, Pack } from '../types';

const STOREFRONT_CATALOG_CACHE = 'abdou_catalog_cache_v4';
const CACHE_FRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes fresh TTL
const CACHE_MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days stale TTL

export interface CatalogCacheEnvelope {
  timestamp: number;
  products: Product[];
  packs: Pack[];
  settings: StoreSettings;
}

const LOCAL_SETTINGS_KEY = 'abdou_perfume_settings_v3';

export const DEFAULT_SETTINGS: StoreSettings = {
  whatsappNumber: '212603288119', // Moroccan international format: 06 03 28 81 19
  storeName: 'ABDOU FRAGRANCES',
  announcementText: {
    fr: "ABDOU FRAGRANCES — VENTE EN FLACONS ET DÉCANTS SUR-MESURE VIA WHATSAPP",
    ar: "ABDOU FRAGRANCES — بيع الزجاجات الأصلية والتقسيم (ديكانت) حصرياً عبر خدمة واتساب"
  }
};

export interface DatabaseTestStepResult {
  step: number;
  name: string;
  status: 'pending' | 'success' | 'failed';
  details?: string;
  error?: string;
}

// In-memory cache copy (kept in JS variable so view changes never trigger requests)
let memoryCatalogEnvelope: CatalogCacheEnvelope | null = null;
let activeCatalogFetchPromise: Promise<{
  products: Product[];
  packs: Pack[];
  settings: StoreSettings;
  fromCache: boolean;
  error?: string;
}> | null = null;

// Subscribers for catalog updates (e.g. background refresh)
const catalogListeners = new Set<(envelope: CatalogCacheEnvelope) => void>();

function isValidEnvelope(data: any): boolean {
  return (
    data !== null &&
    typeof data === 'object' &&
    typeof data.timestamp === 'number' &&
    Array.isArray(data.products) &&
    data.products.length > 0
  );
}

function readStorageEnvelope(): CatalogCacheEnvelope | null {
  if (memoryCatalogEnvelope && isValidEnvelope(memoryCatalogEnvelope)) {
    return memoryCatalogEnvelope;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(STOREFRONT_CATALOG_CACHE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidEnvelope(parsed)) {
          memoryCatalogEnvelope = parsed;
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading catalog from localStorage:', e);
  }
  return memoryCatalogEnvelope;
}

function writeStorageEnvelope(envelope: CatalogCacheEnvelope): void {
  // Never save an empty or invalid response as cache (require at least one product)
  if (!isValidEnvelope(envelope)) {
    return;
  }
  memoryCatalogEnvelope = envelope;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STOREFRONT_CATALOG_CACHE, JSON.stringify(envelope));
      if (envelope.settings) {
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(envelope.settings));
      }
    }
  } catch (e) {
    console.warn('Error writing catalog to localStorage:', e);
  }

  // Notify any active listeners
  catalogListeners.forEach((fn) => {
    try { fn(envelope); } catch (_) {}
  });
}

/**
 * Recursively removes all undefined and NaN keys from objects and arrays.
 * Preserves Date and Firestore FieldValues.
 */
export function cleanData<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj as any;
    if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
      return obj;
    }
    if ('_methodName' in obj) {
      return obj;
    }
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => {
        if (typeof item === 'object' && item !== null) return cleanData(item);
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'number') return isNaN(item) ? 0 : item;
        return item;
      }) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        if (typeof val === 'number') {
          cleaned[key] = isNaN(val) ? 0 : val;
        } else if (typeof val === 'string') {
          cleaned[key] = val.trim();
        } else if (typeof val === 'boolean') {
          cleaned[key] = val;
        } else if (typeof val === 'object' && val !== null) {
          cleaned[key] = cleanData(val);
        } else {
          cleaned[key] = val;
        }
      }
    }
    return cleaned as T;
  }
  if (typeof obj === 'number') {
    return (isNaN(obj) ? 0 : obj) as any;
  }
  if (typeof obj === 'string') {
    return obj.trim() as any;
  }
  return obj;
}

export const catalogService = {
  /**
   * Subscribe to catalog cache updates (e.g. background refresh)
   */
  onCatalogUpdated(callback: (envelope: CatalogCacheEnvelope) => void): () => void {
    catalogListeners.add(callback);
    return () => {
      catalogListeners.delete(callback);
    };
  },

  /**
   * Read cached catalog envelope from memory or localStorage.
   */
  getCachedCatalog(): CatalogCacheEnvelope | null {
    return readStorageEnvelope();
  },

  /**
   * Check if client cache is fresh (< 10 minutes old).
   * While fresh, the storefront must NOT call /api/catalog at all.
   */
  isCatalogCacheFresh(): boolean {
    const cached = readStorageEnvelope();
    if (!cached) return false;
    return (Date.now() - cached.timestamp) < CACHE_FRESH_TTL_MS;
  },

  /**
   * Check if client cache is usable (< 7 days old).
   */
  isCatalogCacheUsable(): boolean {
    const cached = readStorageEnvelope();
    if (!cached) return false;
    return (Date.now() - cached.timestamp) < CACHE_MAX_STALE_MS;
  },

  getCachedProducts(): Product[] | null {
    const cached = readStorageEnvelope();
    return cached?.products && cached.products.length > 0 ? cached.products : null;
  },

  getCachedPacks(): Pack[] | null {
    const cached = readStorageEnvelope();
    return cached?.packs && cached.packs.length > 0 ? cached.packs : null;
  },

  getSettings(): StoreSettings {
    try {
      const cached = readStorageEnvelope();
      if (cached?.settings?.whatsappNumber) {
        return { ...DEFAULT_SETTINGS, ...cached.settings };
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
        if (stored) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
      }
    } catch (e) {
      console.warn('Error reading settings cache:', e);
    }
    return DEFAULT_SETTINGS;
  },

  /**
   * Fetches fresh catalog from /api/catalog with promise deduplication.
   */
  async fetchFreshCatalog(): Promise<{
    products: Product[];
    packs: Pack[];
    settings: StoreSettings;
    fromCache: boolean;
    error?: string;
  }> {
    // If a fetch is already in flight, reuse it to prevent duplicate simultaneous requests
    if (activeCatalogFetchPromise) {
      return activeCatalogFetchPromise;
    }

    activeCatalogFetchPromise = (async () => {
      try {
        const response = await fetch('/api/catalog', {
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        const products: Product[] = Array.isArray(data.products) ? data.products : [];
        const packs: Pack[] = Array.isArray(data.packs) ? data.packs : [];
        const settings: StoreSettings = data.settings || DEFAULT_SETTINGS;

        // Never save an empty or invalid response as cache (require at least one product)
        if (products.length > 0) {
          const envelope: CatalogCacheEnvelope = {
            timestamp: Date.now(),
            products,
            packs,
            settings
          };
          writeStorageEnvelope(envelope);
          return { products, packs, settings, fromCache: false };
        } else {
          throw new Error('Empty catalog received from server');
        }
      } catch (err: any) {
        console.warn('Failed to fetch /api/catalog:', err?.message || err);
        const stale = readStorageEnvelope();
        if (stale && stale.products.length > 0) {
          // Keep old copy and do not erase it
          return {
            products: stale.products,
            packs: stale.packs || [],
            settings: stale.settings || DEFAULT_SETTINGS,
            fromCache: true,
            error: err?.message
          };
        }
        return {
          products: [],
          packs: [],
          settings: DEFAULT_SETTINGS,
          fromCache: false,
          error: err?.message || 'Erreur réseau'
        };
      } finally {
        activeCatalogFetchPromise = null;
      }
    })();

    return activeCatalogFetchPromise;
  },

  /**
   * Storefront catalog loader:
   * 1. If copy is < 10 minutes old: loads from memory/localStorage and does NOT call /api/catalog at all.
   * 2. If copy is 10 min - 7 days old: shows it immediately, refreshes in background, replaces only on success.
   * 3. If no copy exists: calls /api/catalog. If it fails, returns empty list with error.
   */
  async loadCatalog(forceRefresh = false): Promise<{
    products: Product[];
    packs: Pack[];
    settings: StoreSettings;
    fromCache: boolean;
    error?: string;
  }> {
    const cached = readStorageEnvelope();

    // 1. Fresh cache (< 10 minutes) -> NO NETWORK REQUEST AT ALL
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_FRESH_TTL_MS)) {
      return {
        products: cached.products,
        packs: cached.packs || [],
        settings: cached.settings || DEFAULT_SETTINGS,
        fromCache: true
      };
    }

    // 2. Stale copy (10 min to 7 days) -> Show immediately and refresh in background
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_MAX_STALE_MS)) {
      // Background refresh (non-blocking)
      this.fetchFreshCatalog().catch((err) => {
        console.warn('Background catalog refresh notice:', err);
      });

      return {
        products: cached.products,
        packs: cached.packs || [],
        settings: cached.settings || DEFAULT_SETTINGS,
        fromCache: true
      };
    }

    // 3. No copy or forced refresh -> Await fetch
    return this.fetchFreshCatalog();
  },

  /**
   * Admin-only: Save store settings to Firestore.
   * Dynamically loads Firebase SDK.
   */
  async saveSettings(settings: StoreSettings): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
      }
      const { db, withTimeout } = await import('./firebase');
      const { doc, setDoc } = await import('firebase/firestore');

      if (db) {
        const waRef = doc(db, 'settings', 'whatsapp');
        await withTimeout(
          setDoc(waRef, cleanData({
            whatsapp_number: settings.whatsappNumber || '212603288119',
            formatted: '06 03 28 81 19',
            phone: '06 03 28 81 19',
            updatedAt: Date.now()
          }), { merge: true }),
          15000,
          'Délai d’attente dépassé (15s) lors de l’enregistrement de settings/whatsapp'
        );

        const genRef = doc(db, 'settings', 'general');
        await withTimeout(
          setDoc(genRef, cleanData({
            whatsapp_number: settings.whatsappNumber || '212603288119',
            store_name: settings.storeName || 'ABDOU FRAGRANCES',
            updatedAt: Date.now()
          }), { merge: true }),
          15000,
          'Délai d’attente dépassé (15s) lors de l’enregistrement de settings/general'
        );
      }
    } catch (error: any) {
      console.warn('Could not sync settings to Firestore, saved locally:', error);
      throw error;
    }
  },

  /**
   * Admin-only: Real-time subscription to products collection in Firestore.
   * Dynamically loads Firebase SDK.
   */
  subscribeToProducts(
    onProductsChange: (products: Product[]) => void,
    onConnectionChange?: (isOnline: boolean, error?: string) => void
  ): () => void {
    let unsubscribeFn: (() => void) | null = null;
    let isCancelled = false;

    import('./firebase').then(({ db }) => {
      if (isCancelled) return;
      if (!db) {
        onConnectionChange?.(false, 'Database not initialized');
        return;
      }

      import('firebase/firestore').then(({ collection, onSnapshot }) => {
        if (isCancelled) return;
        try {
          const productsColRef = collection(db, 'products');
          unsubscribeFn = onSnapshot(
            productsColRef,
            (snapshot) => {
              const remoteProducts: Product[] = [];
              snapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data() as Product;
                remoteProducts.push({
                  ...data,
                  id: docSnapshot.id
                });
              });
              onConnectionChange?.(true);
              onProductsChange(remoteProducts);
            },
            (error) => {
              console.warn('Firestore subscription status notice:', error.message);
              onConnectionChange?.(false, error.message);
            }
          );
        } catch (e: any) {
          onConnectionChange?.(false, e?.message);
        }
      });
    }).catch((err) => {
      onConnectionChange?.(false, err?.message);
    });

    return () => {
      isCancelled = true;
      if (unsubscribeFn) {
        try { unsubscribeFn(); } catch (_) {}
      }
    };
  },

  /**
   * Admin-only: Save or update a product in Firestore.
   */
  async saveProduct(product: any): Promise<void> {
    const { db, withTimeout } = await import('./firebase');
    const { doc, setDoc } = await import('firebase/firestore');

    if (!db) {
      const err: any = new Error('Base de données Firestore non initialisée.');
      err.code = 'unavailable';
      throw err;
    }

    const productRef = doc(db, 'products', product.id);
    const cleanedPayload = cleanData(product);

    await withTimeout(
      setDoc(productRef, cleanedPayload, { merge: true }),
      30000,
      'Délai d’attente dépassé (30s) lors de l’enregistrement Firestore'
    );
  },

  /**
   * Admin-only: Delete product document from Firestore.
   */
  async deleteProduct(productId: string, imageUrl?: string): Promise<void> {
    const { db, withTimeout, deleteProductImage } = await import('./firebase');
    const { doc, deleteDoc } = await import('firebase/firestore');

    if (!db) {
      const err: any = new Error('Base de données Firestore non initialisée.');
      err.code = 'unavailable';
      throw err;
    }

    const productRef = doc(db, 'products', productId);
    await withTimeout(
      deleteDoc(productRef),
      15000,
      'Délai d’attente dépassé (15s) lors de la suppression Firestore'
    );

    if (imageUrl) {
      try {
        await withTimeout(
          deleteProductImage(imageUrl),
          12000,
          'Délai d’attente dépassé (12s) lors de la suppression Storage'
        );
      } catch (storageErr) {
        console.warn('Image deletion warning (non-fatal):', storageErr);
      }
    }
  },

  /**
   * Admin-only: Self-test routine.
   */
  async runDatabaseSelfTest(
    onStepUpdate: (steps: DatabaseTestStepResult[]) => void
  ): Promise<boolean> {
    const steps: DatabaseTestStepResult[] = [
      { step: 1, name: 'CREATE (setDoc)', status: 'pending' },
      { step: 2, name: 'READ (getDoc)', status: 'pending' },
      { step: 3, name: 'UPDATE (updateDoc)', status: 'pending' },
      { step: 4, name: 'DELETE (deleteDoc)', status: 'pending' },
      { step: 5, name: 'CONFIRM GONE (getDoc exists check)', status: 'pending' }
    ];

    const updateStep = (idx: number, status: 'pending' | 'success' | 'failed', details?: string, error?: string) => {
      steps[idx] = { ...steps[idx], status, details, error };
      onStepUpdate([...steps]);
    };

    onStepUpdate([...steps]);

    try {
      const { db, withTimeout, serverTimestamp } = await import('./firebase');
      const { doc, setDoc, getDoc, updateDoc, deleteDoc } = await import('firebase/firestore');

      if (!db) {
        updateStep(0, 'failed', undefined, '[unavailable] db instance is null');
        return false;
      }

      const testId = `self-test-${Date.now()}`;
      const testDocRef = doc(db, 'products', testId);

      // STEP 1: CREATE
      try {
        const initialPayload = cleanData({
          id: testId,
          name: { fr: 'Test Automatisé', ar: 'اختبار مؤقت' },
          category: 'french',
          description: { fr: 'Test de diagnostic', ar: 'فحص الاتصال' },
          sizes: [{ id: 'test-1', label: '5 ml', price: 100, inStock: true }],
          images: ['https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=200&q=80'],
          imageUrl: '',
          inStock: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await withTimeout(
          setDoc(testDocRef, initialPayload),
          15000,
          'Délai d’attente dépassé (15s) lors de CREATE'
        );
        updateStep(0, 'success', `Document ${testId} créé`);
      } catch (err: any) {
        const code = err?.code || 'error';
        updateStep(0, 'failed', undefined, `[${code}] ${err?.message || String(err)}`);
        return false;
      }

      // STEP 2: READ
      try {
        const snap = await withTimeout(
          getDoc(testDocRef),
          15000,
          'Délai d’attente dépassé (15s) lors de READ'
        );
        if (!snap.exists()) {
          throw new Error('Created document could not be read back');
        }
        const data = snap.data();
        if (data?.name?.fr !== 'Test Automatisé') {
          throw new Error('Data read back did not match written content');
        }
        updateStep(1, 'success', `Lecture confirmée: name.fr="${data.name.fr}"`);
      } catch (err: any) {
        const code = err?.code || 'error';
        updateStep(1, 'failed', undefined, `[${code}] ${err?.message || String(err)}`);
        try { await deleteDoc(testDocRef); } catch {}
        return false;
      }

      // STEP 3: UPDATE
      try {
        await withTimeout(
          updateDoc(testDocRef, cleanData({
            'name.fr': 'Test Automatisé (Modifié)',
            updatedAt: serverTimestamp()
          })),
          15000,
          'Délai d’attente dépassé (15s) lors de UPDATE'
        );
        const snapAfterUpdate = await withTimeout(
          getDoc(testDocRef),
          15000,
          'Délai d’attente dépassé (15s) lors de la vérification UPDATE'
        );
        if (snapAfterUpdate.data()?.name?.fr !== 'Test Automatisé (Modifié)') {
          throw new Error('Updated data verification failed');
        }
        updateStep(2, 'success', 'Modification confirmée sur le serveur');
      } catch (err: any) {
        const code = err?.code || 'error';
        updateStep(2, 'failed', undefined, `[${code}] ${err?.message || String(err)}`);
        try { await deleteDoc(testDocRef); } catch {}
        return false;
      }

      // STEP 4: DELETE
      try {
        await withTimeout(
          deleteDoc(testDocRef),
          15000,
          'Délai d’attente dépassé (15s) lors de DELETE'
        );
        updateStep(3, 'success', `Document ${testId} supprimé`);
      } catch (err: any) {
        const code = err?.code || 'error';
        updateStep(3, 'failed', undefined, `[${code}] ${err?.message || String(err)}`);
        return false;
      }

      // STEP 5: CONFIRM GONE
      try {
        const confirmSnap = await withTimeout(
          getDoc(testDocRef),
          15000,
          'Délai d’attente dépassé (15s) lors de CONFIRM GONE'
        );
        if (confirmSnap.exists()) {
          throw new Error('Document still exists after deleteDoc execution');
        }
        updateStep(4, 'success', 'Confirmation: le document est définitivement effacé');
      } catch (err: any) {
        const code = err?.code || 'error';
        updateStep(4, 'failed', undefined, `[${code}] ${err?.message || String(err)}`);
        return false;
      }

      return true;
    } catch (e: any) {
      updateStep(0, 'failed', undefined, e?.message);
      return false;
    }
  }
};
