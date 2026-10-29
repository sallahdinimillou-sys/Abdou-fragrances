import React, { useState, useMemo } from 'react';
import { Product, CategoryItem } from '../types';
import { ProductCard } from './ProductCard';
import { CategoryBar } from './CategoryBar';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

interface ShopViewProps {
  products: Product[];
  onOpenDetails: (product: Product) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ products, onOpenDetails }) => {
  const { t, language } = useLanguage();
  const { settings } = useCart();

  // Category state with URL synchronization
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('category');
      return catParam ? catParam.toLowerCase() : 'all';
    } catch {
      return 'all';
    }
  });

  // Default sort is strictly "Newest first"
  const [sortBy, setSortBy] = useState<'newest' | 'priceAsc' | 'priceDesc' | 'nameAsc'>('newest');
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const [isFading, setIsFading] = useState<boolean>(false);

  // Sync category changes to URL
  const handleSelectCategory = (catId: string) => {
    setIsFading(true);
    setActiveCategory(catId);
    setVisibleCount(12);

    try {
      const url = new URL(window.location.href);
      if (catId === 'all') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', catId);
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.warn('Could not update URL parameter:', e);
    }

    setTimeout(() => {
      setIsFading(false);
    }, 200);
  };

  // Base and custom categories
  const allCategories: CategoryItem[] = useMemo(() => {
    const base: CategoryItem[] = [
      { id: 'all', name: { fr: 'Tout', ar: 'الكل' } },
      { id: 'french', name: { fr: 'Française', ar: 'فرنسية' } },
      { id: 'arabic', name: { fr: 'Arabe', ar: 'عربية' } },
      { id: 'niche', name: { fr: 'Niche', ar: 'نيش' } },
      { id: 'men', name: { fr: 'Homme', ar: 'رجالي' } },
      { id: 'women', name: { fr: 'Femme', ar: 'نسائي' } },
      { id: 'unisex', name: { fr: 'Unisexe', ar: 'للجنسين' } },
      { id: 'gifts', name: { fr: 'Cadeaux', ar: 'هدايا' } }
    ];

    if (settings.customCategories && settings.customCategories.length > 0) {
      settings.customCategories.forEach((customCat) => {
        if (!base.some((b) => b.id === customCat.id)) {
          base.push(customCat);
        }
      });
    }

    return base;
  }, [settings.customCategories]);

  const matchesCategory = (p: Product, catId: string): boolean => {
    if (catId === 'all') return true;
    if (p.category && p.category.toLowerCase() === catId.toLowerCase()) return true;

    switch (catId) {
      case 'french':
        return p.collection === 'french-haute-parfumerie';
      case 'arabic':
        return p.collection === 'arabian-oud-attars';
      case 'niche':
        return p.collection === 'niche-creations';
      case 'men':
        return p.gender === 'Pour Homme' || p.gender === 'Unisex';
      case 'women':
        return p.gender === 'Pour Femme' || p.gender === 'Unisex';
      case 'unisex':
        return p.gender === 'Unisex';
      case 'gifts':
        return (
          p.category === 'gifts' ||
          p.family === 'Oud' ||
          p.id.includes('attar')
        );
      default:
        return p.category === catId;
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allCategories.forEach((cat) => {
      counts[cat.id] = products.filter((p) => matchesCategory(p, cat.id)).length;
    });
    return counts;
  }, [products, allCategories]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => matchesCategory(p, activeCategory))
      .sort((a, b) => {
        if (sortBy === 'newest') {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        }
        if (sortBy === 'priceAsc') {
          const minA = a.sizes && a.sizes.length > 0 ? Math.min(...a.sizes.map((s) => s.price)) : 0;
          const minB = b.sizes && b.sizes.length > 0 ? Math.min(...b.sizes.map((s) => s.price)) : 0;
          return minA - minB;
        }
        if (sortBy === 'priceDesc') {
          const minA = a.sizes && a.sizes.length > 0 ? Math.min(...a.sizes.map((s) => s.price)) : 0;
          const minB = b.sizes && b.sizes.length > 0 ? Math.min(...b.sizes.map((s) => s.price)) : 0;
          return minB - minA;
        }
        if (sortBy === 'nameAsc') {
          const nameA = a.name[language] || a.name.fr;
          const nameB = b.name[language] || b.name.fr;
          return nameA.localeCompare(nameB);
        }
        return 0;
      });
  }, [products, activeCategory, sortBy, language]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <div className="pt-28 pb-24 bg-[#F4EFE7] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Page Title Header */}
        <div className="border-b border-[#D9D1C5] pb-6 mb-8 space-y-2">
          <span className="text-[10px] sm:text-xs tracking-editorial uppercase text-[#5A1A24] font-medium block">
            Haute Parfumerie & Rares Attars
          </span>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="font-display text-3xl sm:text-5xl text-[#14110F]">
              {t('allFragrances')}
            </h2>
            <span className="text-xs tracking-editorial uppercase text-[#8C857B]">
              {filteredProducts.length} {t('productsCount')}
            </span>
          </div>
        </div>

        {/* Toolbar: Sort by with Newest First as default */}
        <div className="flex items-center justify-end gap-4 mb-8 pb-4 border-b border-[#D9D1C5]">
          <div className="flex items-center gap-2">
            <label className="text-[10px] tracking-editorial uppercase text-[#8C857B] whitespace-nowrap">
              {t('sortBy')} :
            </label>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="h-[40px] bg-[#EAE4DC] border border-[#D9D1C5] px-4 text-xs uppercase tracking-editorial text-[#14110F] focus:outline-none focus:border-[#14110F] cursor-pointer"
            >
              <option value="newest">{t('sortNewest')}</option>
              <option value="priceAsc">{t('sortPriceAsc')}</option>
              <option value="priceDesc">{t('sortPriceDesc')}</option>
              <option value="nameAsc">{t('sortNameAsc')}</option>
            </select>
          </div>
        </div>

        {/* Category Bar */}
        <CategoryBar
          categories={allCategories}
          activeCategoryId={activeCategory}
          onSelectCategory={handleSelectCategory}
          categoryCounts={categoryCounts}
        />

        {/* Products Grid (2 cols mobile, 3 tablet, 4 desktop) */}
        <div
          className={`transition-opacity duration-300 ${
            isFading ? 'opacity-30' : 'opacity-100'
          }`}
        >
          {products.length === 0 ? (
            <div className="py-24 text-center border border-[#D9D1C5] bg-[#EAE4DC]/40 p-8 space-y-3 max-w-xl mx-auto">
              <h3 className="font-display text-2xl text-[#14110F]">
                Catalogue momentanément indisponible, veuillez réessayer
              </h3>
              <p className="text-xs sm:text-sm text-[#8C857B] font-light max-w-md mx-auto">
                Nous rétablissons l'accès à l'ensemble de notre collection. Vous pouvez également nous contacter directement via WhatsApp.
              </p>
              <div className="pt-3">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-secondary-invert px-6 py-2.5 text-xs uppercase tracking-wider font-medium cursor-pointer"
                >
                  Réessayer
                </button>
              </div>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="py-24 text-center border border-[#D9D1C5] bg-[#EAE4DC]/40 p-8 space-y-3">
              <h3 className="font-display text-2xl text-[#14110F]">
                {t('noProductsInCategory')}
              </h3>
              <p className="text-xs sm:text-sm text-[#8C857B] font-light max-w-sm mx-auto">
                {language === 'ar'
                  ? 'لا توجد نتائج مطابقة لبحثك في هذا التصنيف.'
                  : 'Aucune création ne correspond à vos critères de recherche dans cette sélection.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => handleSelectCategory('all')}
                  className="editorial-underline-link text-xs uppercase tracking-editorial text-[#5A1A24]"
                >
                  {t('catAll')} →
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {displayedProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onOpenDetails={onOpenDetails}
                />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-12 sm:pt-16">
              <button
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="btn-secondary-invert h-[50px] px-8 text-xs uppercase tracking-editorial font-medium cursor-pointer"
              >
                {t('loadMore')} ({filteredProducts.length - visibleCount} restants)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
