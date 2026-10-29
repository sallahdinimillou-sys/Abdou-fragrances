import { Pack } from '../types';
import { cleanData, catalogService } from './catalogService';

const LOCAL_PACKS_KEY = 'abdou_perfumes_packs_cache_v1';

export const packService = {
  // Get initial local packs cache (from catalog cache or dedicated packs cache)
  getInitialPacks(): Pack[] {
    const fromCatalog = catalogService.getCachedPacks();
    if (fromCatalog && fromCatalog.length > 0) {
      return fromCatalog;
    }
    try {
      const stored = localStorage.getItem(LOCAL_PACKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some((p) => p.id === 'pack-women-1')) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading local packs cache:', e);
    }
    return [];
  },

  /**
   * Real-time subscription to packs in Firestore (admin use).
   * Dynamically loads Firebase SDK.
   */
  subscribeToPacks(
    onPacksChange: (packs: Pack[]) => void,
    onStatusChange?: (isOnline: boolean) => void
  ): () => void {
    let unsubscribeFn: (() => void) | null = null;
    let isCancelled = false;

    import('./firebase').then(({ db }) => {
      if (isCancelled) return;
      if (!db) {
        onPacksChange(this.getInitialPacks());
        return;
      }

      import('firebase/firestore').then(({ collection, onSnapshot }) => {
        if (isCancelled) return;
        try {
          const packsColRef = collection(db, 'packs');
          unsubscribeFn = onSnapshot(
            packsColRef,
            (snapshot) => {
              if (snapshot.empty) {
                onPacksChange([]);
                return;
              }

              const remotePacks: Pack[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data() as Pack;
                remotePacks.push({
                  ...data,
                  id: docSnap.id
                });
              });

              remotePacks.sort((a, b) => {
                if (a.category === b.category) {
                  return (a.name?.fr || '').localeCompare(b.name?.fr || '');
                }
                return a.category === 'women' ? -1 : 1;
              });

              onStatusChange?.(true);
              onPacksChange(remotePacks);
            },
            (error) => {
              console.warn('Firestore packs snapshot error, fallback to cache:', error);
              onStatusChange?.(false);
              onPacksChange(this.getInitialPacks());
            }
          );
        } catch (e) {
          onPacksChange(this.getInitialPacks());
        }
      });
    }).catch(() => {
      onPacksChange(this.getInitialPacks());
    });

    return () => {
      isCancelled = true;
      if (unsubscribeFn) {
        try { unsubscribeFn(); } catch (_) {}
      }
    };
  },

  /**
   * Save or update a pack in Firestore (admin use).
   */
  async savePack(pack: Pack): Promise<void> {
    const { db, serverTimestamp, withTimeout } = await import('./firebase');
    const { doc, setDoc } = await import('firebase/firestore');

    const cleaned = cleanData({
      ...pack,
      updatedAt: serverTimestamp(),
      createdAt: pack.createdAt || serverTimestamp()
    });

    if (db) {
      const packRef = doc(db, 'packs', pack.id);
      await withTimeout(
        setDoc(packRef, cleaned, { merge: true }),
        20000,
        'Délai d’attente dépassé (20s) lors de l’enregistrement du pack'
      );
    }

    try {
      const current = this.getInitialPacks();
      const existingIdx = current.findIndex((p) => p.id === pack.id);
      let updated: Pack[];
      if (existingIdx > -1) {
        updated = [...current];
        updated[existingIdx] = { ...pack };
      } else {
        updated = [pack, ...current];
      }
      localStorage.setItem(LOCAL_PACKS_KEY, JSON.stringify(updated));
    } catch (_) {}
  },

  /**
   * Delete a pack from Firestore (admin use).
   */
  async deletePack(packId: string): Promise<void> {
    const { db, withTimeout } = await import('./firebase');
    const { doc, deleteDoc } = await import('firebase/firestore');

    if (db) {
      const packRef = doc(db, 'packs', packId);
      await withTimeout(
        deleteDoc(packRef),
        15000,
        'Délai d’attente dépassé (15s) lors de la suppression du pack'
      );
    }

    try {
      const current = this.getInitialPacks();
      const updated = current.filter((p) => p.id !== packId);
      localStorage.setItem(LOCAL_PACKS_KEY, JSON.stringify(updated));
    } catch (_) {}
  }
};
