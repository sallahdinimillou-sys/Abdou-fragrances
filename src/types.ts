export type Language = 'fr' | 'ar';

export type CollectionSlug = 'french-haute-parfumerie' | 'arabian-oud-attars' | 'niche-creations';

export type ScentFamily = 'Woody' | 'Floral' | 'Oriental' | 'Fresh' | 'Gourmand' | 'Oud';

export type Gender = 'Unisex' | 'Pour Homme' | 'Pour Femme';

export interface LocalizedString {
  fr: string;
  ar: string;
}

export interface SizeOption {
  id: string;
  label: string; // e.g. "5 ml", "10 ml", "30 ml", "50 ml", "100 ml", "Flacon complet"
  price: number; // Price in MAD (Moroccan Dirham)
  inStock: boolean;
}

export interface CategoryItem {
  id: string;
  name: LocalizedString;
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'french', name: { fr: 'Française', ar: 'فرنسية' } },
  { id: 'arabic', name: { fr: 'Arabe', ar: 'عربية' } },
  { id: 'niche', name: { fr: 'Niche', ar: 'نيش' } },
  { id: 'men', name: { fr: 'Homme', ar: 'رجالي' } },
  { id: 'women', name: { fr: 'Femme', ar: 'نسائي' } },
  { id: 'unisex', name: { fr: 'Unisexe', ar: 'للجنسين' } },
  { id: 'gifts', name: { fr: 'Cadeaux', ar: 'هدايا' } }
];

export function getCategoryLabel(
  categoryKey?: string,
  lang: Language = 'fr',
  customCategories: CategoryItem[] = []
): string {
  if (!categoryKey) return lang === 'ar' ? 'عطر فاخر' : 'Haute Parfumerie';
  const all = [...DEFAULT_CATEGORIES, ...customCategories];
  const found = all.find((c) => c.id.toLowerCase() === categoryKey.toLowerCase());
  if (found) return found.name[lang] || found.name.fr;

  // Fallback for old collection slugs
  if (categoryKey === 'french-haute-parfumerie') return lang === 'ar' ? 'فرنسية' : 'Française';
  if (categoryKey === 'arabian-oud-attars') return lang === 'ar' ? 'عربية' : 'Arabe';
  if (categoryKey === 'niche-creations') return lang === 'ar' ? 'نيش' : 'Niche';

  return categoryKey;
}

export interface OlfactoryPyramid {
  top: string[];
  heart: string[];
  base: string[];
}

export interface Product {
  id: string;
  name: LocalizedString;
  category?: string; // Primary category id e.g. 'french', 'arabic', 'niche', etc.
  description: LocalizedString;
  sizes: SizeOption[];
  images: string[];
  imageUrl?: string; // Firebase Storage hosted image URL
  imageData?: string; // Base64 data URL fallback (<200KB) stored directly in Firestore document
  // Optional / metadata fields:
  brand?: string;
  collection?: CollectionSlug | string;
  family?: ScentFamily | string;
  gender?: Gender | string;
  pyramid?: OlfactoryPyramid;
  longevity?: number;
  sillage?: number;
  bestFor?: LocalizedString;
  inStock?: boolean;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Returns the best image source for a product:
 * Priority: imageUrl if present, otherwise imageData, otherwise images[0]
 */
export function getProductDisplayImage(product?: Product | null): string {
  if (!product) return 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80';
  if (product.imageUrl && product.imageUrl.trim() !== '') return product.imageUrl;
  if (product.imageData && product.imageData.trim() !== '') return product.imageData;
  if (product.images && product.images.length > 0 && product.images[0]) return product.images[0];
  return 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80';
}

/**
 * A product counts as in stock if at least one size row is in stock
 */
export function isProductInStock(product: Product): boolean {
  if (product.sizes && product.sizes.length > 0) {
    return product.sizes.some((s) => s.inStock);
  }
  return product.inStock ?? true;
}

export interface CartItem {
  product: Product;
  selectedSize: SizeOption;
  quantity: number;
  unitPrice: number; // Price in MAD
}

export interface StoreSettings {
  whatsappNumber: string; // international format e.g. "212612345678"
  storeName: string;
  announcementText: LocalizedString;
  customCategories?: CategoryItem[];
}

export interface CustomerOrderDetails {
  fullName: string;
  city: string;
  address: string;
  phone: string;
}

// Delivery fee constants (charged ONCE per order, never per product or quantity)
export const DEFAULT_DELIVERY_FEE = 35;
export const GUELMIM_DELIVERY_FEE = 10;

/**
 * Normalizes city name to detect Guelmim in any spelling or language:
 * Guelmim, Guelmime, Goulimine, كلميم, قلميم, قليميم, Glimim, etc.
 * Ignores case, accents, and extra whitespace.
 */
export function isGuelmimCity(city: string): boolean {
  if (!city || typeof city !== 'string') return false;
  const normalized = city
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[أإآ]/g, 'ا') // normalize alef
    .replace(/ة/g, 'ه') // normalize teh marbuta
    .replace(/\s+/g, '');

  const patterns = [
    'guelmim',
    'guelmime',
    'goulimine',
    'goulimin',
    'glimim',
    'golmim',
    'gulmim',
    'كلميم',
    'قلميم',
    'قليميم',
    'كليميم'
  ];

  return patterns.some((p) => normalized.includes(p));
}

export function getDeliveryFee(city: string): number {
  return isGuelmimCity(city) ? GUELMIM_DELIVERY_FEE : DEFAULT_DELIVERY_FEE;
}

export type ActiveView = 'home' | 'shop' | 'admin' | 'packs-women' | 'packs-men';

/**
 * Currency formatter for Moroccan Dirham (MAD)
 * French format: "1 200 DH"
 * Arabic format: "1200 درهم"
 */
export function formatPrice(amount: number, lang: Language): string {
  if (lang === 'ar') {
    return `${amount} درهم`;
  }
  return `${amount.toLocaleString('fr-FR')} DH`;
}

export type PackCategory = 'women' | 'men';

export interface Pack {
  id: string;
  category: PackCategory;
  name: LocalizedString;
  description?: LocalizedString;
  price: number; // in MAD
  image: string;
  isActive: boolean;
  // Optional legacy fields for backward compatibility with Firestore
  includedPerfumes?: string[];
  includedProductIds?: string[];
  badge?: LocalizedString;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Transforms a Pack into a Product object so it integrates seamlessly with CartContext
 */
export function convertPackToProduct(pack: Pack): { product: Product; sizeOption: SizeOption } {
  const sizeOption: SizeOption = {
    id: `size-pack-${pack.id}`,
    label: 'Pack Complet / باقة كاملة',
    price: pack.price,
    inStock: true
  };

  const product: Product = {
    id: `pack-${pack.id}`,
    name: pack.name,
    category: pack.category === 'women' ? 'women' : 'men',
    description: pack.description || {
      fr: pack.name.fr,
      ar: pack.name.ar
    },
    sizes: [sizeOption],
    images: [pack.image],
    imageUrl: pack.image,
    inStock: true
  };

  return { product, sizeOption };
}
