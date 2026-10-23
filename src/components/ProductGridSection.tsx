import React, { useState, useEffect, useMemo } from 'react';
import { Product, CategoryItem, Pack } from '../types';
import { ProductCard } from './ProductCard';
import { CategoryBar } from './CategoryBar';
import { PacksTopBanners } from './PacksTopBanners';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

interface ProductGridSectionProps {
  products: Product[];
  packs?: Pack[];
  onOpenDetails: (product: Product) => void;
  onOpenPacksPage?: (category: 'women' | 'men') => void;
  title?: string;
  subtitle?: string;
}

function normalizeSearchText(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove French accents
    .replace(/[\u064B-\u065F]/g, '') // remove Arabic tashkeel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export const ProductGridSection: React.FC<ProductGridSectionProps> = ({
  products,
  packs = [],
  onOpenDetails,
  onOpenPacksPage,
  title,
  subtitle
}) => {
  const { t, language } = useLanguage();
  const { settings } = useCart();

  // Search query on home page
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Read initial category from URL (?category=xyz) or default to 'all'
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('category');
      return catParam ? catParam.toLowerCase() : 'all';
    } catch {
      return 'all';
    }
  });

  const [visibleCount, setVisibleCount] = useState<number>(12);
  const [isFading, setIsFading] = useState<boolean>(false);

  // Sync category changes to URL without page reload
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

  // Base predefined categories + any custom categories configured in store settings
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

  // Filtering function for a product against a category
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
          p.featured === true ||
          p.family === 'Oud' ||
          p.id.includes('attar')
        );
      default:
        return p.category === catId;
    }
  };

  // Compute product counts for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allCategories.forEach((cat) => {
      counts[cat.id] = products.filter((p) => matchesCategory(p, cat.id)).length;
    });
    return counts;
  }, [products, allCategories]);

  // Filtered products list (Search by title + category)
  const filteredProducts = useMemo(() => {
    const query = normalizeSearchText(searchQuery);

    return products.filter((p) => {
      // Category check
      const matchesCat = matchesCategory(p, activeCategory);
      if (!matchesCat && query === '') return false;

      // Title check (French original product titles)
      if (query !== '') {
        const titleFr = normalizeSearchText(p.name?.fr || (typeof p.name === 'string' ? p.name : ''));
        const matchesTitle = titleFr.includes(query);
        return matchesCat ? matchesTitle : matchesTitle;
      }

      return matchesCat;
    });
  }, [products, activeCategory, searchQuery]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <section id="collection" className="pt-8 pb-16 sm:pb-24 bg-[#F4EFE7] scroll-mt-24 sm:scroll-mt-28">
      {/* Two Large Elegant "Packs" Boxes at the very top, just above Our Collection */}
      <PacksTopBanners packs={packs} onOpenPacksPage={onOpenPacksPage} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-10 sm:mt-14">
        {/* Section Header */}
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-[#5A1A24] block mb-1">
              Haute Parfumerie & Rares Attars
            </span>
            <h2 className="font-display text-2xl sm:text-4xl text-[#14110F]">
              {title || t('ourCollection')}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm font-light text-[#8C857B] mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Search Bar on Home Page (Requirement 3) */}
          <div className="relative w-full md:w-80 lg:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#8C857B]">
              <svg className="w-4 h-4 stroke-current fill-none stroke-[1.5]" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(12);
              }}
              placeholder="Rechercher un parfum par nom..."
              className="w-full bg-[#EAE4DC]/70 border border-[#D9D1C5] focus:border-[#14110F] pl-10 pr-10 py-2.5 text-xs sm:text-sm text-[#14110F] placeholder-[#8C857B] focus:outline-none transition-colors"
            />

            {/* Small X button to clear search and show all products again */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Effacer la recherche"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#8C857B] hover:text-[#14110F] cursor-pointer"
              >
                <svg className="w-4 h-4 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category Bar */}
        <CategoryBar
          categories={allCategories}
          activeCategoryId={activeCategory}
          onSelectCategory={handleSelectCategory}
          categoryCounts={categoryCounts}
        />

        {/* Product Grid with Smooth Fade */}
        <div
          className={`transition-opacity duration-300 ${
            isFading ? 'opacity-30' : 'opacity-100'
          }`}
        >
          {displayedProducts.length === 0 ? (
            <div className="py-20 text-center border border-[#D9D1C5] bg-[#EAE4DC]/40 p-8 space-y-3">
              {searchQuery.trim() !== '' ? (
                // Friendly message in French when nothing matches
                <div className="space-y-3">
                  <p className="font-display text-xl sm:text-2xl text-[#14110F]">
                    Aucun parfum trouvé sous ce nom
                  </p>
                  <p className="text-xs text-[#8C857B] font-light max-w-sm mx-auto">
                    Veuillez vérifier l’orthographe du nom ou explorer l’ensemble de notre catalogue de parfums.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setSearchQuery('')}
                      className="btn-secondary-invert px-5 py-2 text-xs uppercase tracking-wider font-medium cursor-pointer"
                    >
                      Voir tous les parfums
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-display text-xl sm:text-2xl text-[#14110F]">
                    {t('noProductsInCategory')}
                  </h3>
                  <p className="text-xs text-[#8C857B] font-light max-w-sm mx-auto">
                    Veuillez sélectionner une autre catégorie ou explorer l’ensemble de nos créations.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => handleSelectCategory('all')}
                      className="editorial-underline-link text-xs uppercase tracking-wider text-[#5A1A24]"
                    >
                      {t('catAll')} →
                    </button>
                  </div>
                </div>
              )}
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
                className="btn-secondary-invert h-[50px] px-8 text-xs uppercase tracking-wider font-medium cursor-pointer"
              >
                {t('loadMore')} ({filteredProducts.length - visibleCount} restants)
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
