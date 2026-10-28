import { Product, StoreSettings } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialCatalog';
import { db, deleteProductImage, serverTimestamp, withTimeout, formatFirebaseErrorMessage } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';

const LOCAL_PRODUCTS_KEY = 'abdou_perfumes_catalog_cache_v3';
const LOCAL_SETTINGS_KEY = 'abdou_perfume_settings_v3';

const DEFAULT_SETTINGS: StoreSettings = {
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

/**
 * Recursively removes all undefined and NaN keys from objects and arrays.
 * Trims text, normalizes numbers, booleans, and preserves Firestore FieldValues (serverTimestamp()).
 */
export function cleanData<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  // Check if it's a Firestore FieldValue, Timestamp, Date, etc.
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
  // Get Store Settings from local cache or defaults
  getSettings(): StoreSettings {
    try {
      const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Error reading settings cache:', e);
    }
    return DEFAULT_SETTINGS;
  },

  // Save Store Settings to settings/whatsapp and settings/general
  async saveSettings(settings: StoreSettings): Promise<void> {
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
      if (db) {
        // 1. Save to settings/whatsapp (single source of truth for order number)
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

        // 2. Also sync to settings/general
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
   * Subscribe to settings/whatsapp and settings/general in real-time
   */
  subscribeToSettings(onSettingsChange: (settings: StoreSettings) => void): () => void {
    if (!db) {
      onSettingsChange(this.getSettings());
      return () => {};
    }

    try {
      const waDocRef = doc(db, 'settings', 'whatsapp');
      const unsubscribe = onSnapshot(
        waDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const current = this.getSettings();
            const updated: StoreSettings = {
              ...current,
              whatsappNumber: data.whatsapp_number || '212603288119'
            };
            try {
              localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updated));
            } catch (_) {}
            onSettingsChange(updated);
          } else {
            onSettingsChange(this.getSettings());
          }
        },
        (error) => {
          console.warn('settings/whatsapp snapshot error, using cached settings:', error);
          onSettingsChange(this.getSettings());
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn('Could not subscribe to settings/whatsapp:', e);
      onSettingsChange(this.getSettings());
      return () => {};
    }
  },

  /**
   * Get initial products from local cache or fallback to authentic default catalog.
   * Guarantees products appear instantly in Safari and on restricted networks.
   */
  getInitialProducts(): Product[] {
    try {
      const stored = localStorage.getItem(LOCAL_PRODUCTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading local products cache:', e);
    }
    return INITIAL_PRODUCTS;
  },

  /**
   * Subscribe to real-time products collection in Firestore (Single Source of Truth).
   * Delivers cached/default products immediately so Safari never renders a blank screen,
   * then seamlessly synchronizes with live Firestore changes.
   */
  subscribeToProducts(
    onProductsChange: (products: Product[]) => void,
    onConnectionChange?: (isOnline: boolean, error?: string) => void
  ): () => void {
    // 1. Immediately deliver local/initial catalog for 0ms paint in Safari
    const initial = this.getInitialProducts();
    onProductsChange(initial);

    if (!db) {
      console.warn('Firestore database instance not initialized, using local catalog.');
      onConnectionChange?.(false, 'Database instance not initialized');
      return () => {};
    }

    try {
      const productsColRef = collection(db, 'products');
      const unsubscribe = onSnapshot(
        productsColRef,
        (snapshot) => {
          if (snapshot.empty) {
            // If remote collection is temporarily empty, keep current initial catalog
            onProductsChange(initial);
            onConnectionChange?.(true);
            return;
          }

          const remoteProducts: Product[] = [];
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data() as Product;
            remoteProducts.push({
              ...data,
              id: docSnapshot.id
            });
          });

          try {
            localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(remoteProducts));
          } catch (_) {}

          onConnectionChange?.(true);
          onProductsChange(remoteProducts);
        },
        (error) => {
          console.warn('Firestore subscription status notice:', error.message);
          // Never leave the customer facing a blank screen on error or quota exceeded
          onProductsChange(this.getInitialProducts());
          onConnectionChange?.(false, error.message);
        }
      );
      return unsubscribe;
    } catch (e: any) {
      console.warn('Could not initialize snapshot listener:', e);
      onProductsChange(this.getInitialProducts());
      onConnectionChange?.(false, e?.message || 'Listener initialization failed');
      return () => {};
    }
  },

  /**
   * Save or update a product document in Firestore with 30s timeout.
   * Strips all undefined and NaN values.
   * On timeout, runs a diagnostic test write to _health to report exact cause.
   */
  async saveProduct(product: any): Promise<void> {
    if (!db) {
      const err: any = new Error('Base de données Firestore non initialisée.');
      err.code = 'unavailable';
      throw err;
    }

    const productRef = doc(db, 'products', product.id);

    // Recursively clean undefined and NaN values
    const cleanedPayload = cleanData(product);

    // 30-second timeout on Firestore write
    try {
      await withTimeout(
        setDoc(productRef, cleanedPayload, { merge: true }),
        30000,
        'Délai d’attente dépassé (30s) lors de l’enregistrement Firestore'
      );

      // Keep local cache immediately synchronized
      try {
        const current = this.getInitialProducts();
        const existingIdx = current.findIndex((p) => p.id === product.id);
        let updated: Product[];
        if (existingIdx >= 0) {
          updated = [...current];
          updated[existingIdx] = { ...updated[existingIdx], ...product };
        } else {
          updated = [product, ...current];
        }
        localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updated));
      } catch (_) {}
    } catch (writeErr: any) {
      if (writeErr?.code === 'timeout' || writeErr?.message?.includes('30s')) {
        let diagnosticMsg = '';
        try {
          const diagRef = doc(db, '_health', 'save-diagnostic');
          await withTimeout(
            setDoc(diagRef, { timestamp: Date.now(), ping: 'save-timeout-check' }),
            5000,
            'diagnostic-timeout'
          );
          diagnosticMsg = ' Diagnostic : La base de données est accessible mais le document produit est trop volumineux pour être enregistré dans le délai imparti.';
        } catch (diagErr: any) {
          const diagCode = diagErr?.code || 'timeout';
          if (diagCode === 'permission-denied') {
            diagnosticMsg = ` Diagnostic : Les règles de sécurité Firestore ont rejeté l'écriture (code: permission-denied).`;
          } else {
            diagnosticMsg = ` Diagnostic : La base de données Firestore est injoignable ou ne répond pas (code: ${diagCode}).`;
          }
        }
        const enrichedErr: any = new Error(`${writeErr.message}.${diagnosticMsg}`);
        enrichedErr.code = writeErr.code || 'timeout';
        throw enrichedErr;
      }
      throw writeErr;
    }
  },

  /**
   * Delete product document from Firestore and remove photograph from Storage with timeout.
   */
  async deleteProduct(productId: string, imageUrl?: string): Promise<void> {
    if (!db) {
      const err: any = new Error('Base de données Firestore non initialisée.');
      err.code = 'unavailable';
      throw err;
    }

    // 1. Delete document in Firestore (15s timeout)
    const productRef = doc(db, 'products', productId);
    await withTimeout(
      deleteDoc(productRef),
      15000,
      'Délai d’attente dépassé (15s) lors de la suppression Firestore'
    );

    // Keep local cache immediately synchronized
    try {
      const current = this.getInitialProducts();
      const updated = current.filter((p) => p.id !== productId);
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updated));
    } catch (_) {}

    // 2. Delete storage image if present (12s timeout)
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
   * Temporary Admin Self-Test:
   * Verifies create, read, edit, delete, and confirm deleted against Firestore with 15s timeouts.
   * Reports exact error codes.
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
  }
};
