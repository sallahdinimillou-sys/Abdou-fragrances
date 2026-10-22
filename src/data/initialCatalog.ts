import { Product } from '../types';

// Single source of truth:
// All product data resides strictly in Firestore.
// No mock, seed, or demo products are kept in code to guarantee deleted products never reappear.
export const INITIAL_PRODUCTS: Product[] = [];
