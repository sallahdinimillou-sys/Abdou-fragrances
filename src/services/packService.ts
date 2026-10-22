import { Pack } from '../types';
import { db, serverTimestamp, withTimeout } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { cleanData } from './catalogService';

const LOCAL_PACKS_KEY = 'abdou_perfumes_packs_cache_v1';

// Clear any legacy seed pack cache to ensure only real products are loaded
try {
  const cached = localStorage.getItem(LOCAL_PACKS_KEY);
  if (cached && cached.includes('pack-women-1')) {
    localStorage.removeItem(LOCAL_PACKS_KEY);
  }
} catch (_) {}

export const packService = {
  // Get initial local packs cache (only real packs, no fake or demo seeds)
  getInitialPacks(): Pack[] {
    try {
      const stored = localStorage.getItem(LOCAL_PACKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some(p => p.id === 'pack-women-1')) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading local packs cache:', e);
    }
    return [];
  },

  /**
   * Real-time subscription to packs in Firestore
   * Displays only real packs added by the owner.
   */
  subscribeToPacks(
    onPacksChange: (packs: Pack[]) => void,
    onStatusChange?: (isOnline: boolean) => void
  ): () => void {
    if (!db) {
      onPacksChange(this.getInitialPacks());
      return () => {};
    }

    try {
      const packsColRef = collection(db, 'packs');
      const unsubscribe = onSnapshot(
        packsColRef,
        (snapshot) => {
          if (snapshot.empty) {
            // No fake packs: display only real packs added by user
            onPacksChange([]);
            try {
              localStorage.removeItem(LOCAL_PACKS_KEY);
            } catch (_) {}
            onStatusChange?.(true);
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

          // Sort by creation or maintain reliable order
          remotePacks.sort((a, b) => {
            if (a.category === b.category) {
              return (a.name?.fr || '').localeCompare(b.name?.fr || '');
            }
            return a.category === 'women' ? -1 : 1;
          });

          try {
            localStorage.setItem(LOCAL_PACKS_KEY, JSON.stringify(remotePacks));
          } catch (_) {}

          onStatusChange?.(true);
          onPacksChange(remotePacks);
        },
        (error) => {
          console.warn('Firestore packs snapshot error, fallback to cache:', error);
          onStatusChange?.(false);
          onPacksChange(this.getInitialPacks());
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn('Could not initialize packs subscription:', e);
      onPacksChange(this.getInitialPacks());
      return () => {};
    }
  },

  /**
   * Save or update a pack in Firestore
   */
  async savePack(pack: Pack): Promise<void> {
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

    // Update local cache
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
   * Delete a pack from Firestore
   */
  async deletePack(packId: string): Promise<void> {
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
