import React from 'react';
import { Pack, formatPrice, convertPackToProduct, NEUTRAL_PLACEHOLDER_IMAGE } from '../types';
import { useCart } from '../context/CartContext';

interface PackCardProps {
  pack: Pack;
  onOpenDetails?: (pack: Pack) => void;
  index?: number;
  isEager?: boolean;
}

export const PackCard: React.FC<PackCardProps> = ({ pack, onOpenDetails, index, isEager }) => {
  const { openOrderModal } = useCart();
  const isAboveFold = isEager ?? (typeof index === 'number' ? index < 4 : false);

  const title = pack.name?.fr || (typeof pack.name === 'string' ? pack.name : 'Pack Parfum');
  const description = pack.description?.fr || 'Sélection exclusive de parfums d’exception';

  const handleOrderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { product, sizeOption } = convertPackToProduct(pack);
    openOrderModal({ product, sizeOption, quantity: 1 });
  };

  return (
    <article
      onClick={() => onOpenDetails?.(pack)}
      className="group relative flex flex-col h-full bg-[#FDFCFA] border border-[#D9D1C5]/80 hover:border-[#14110F]/60 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(20,17,15,0.04)] hover:shadow-[0_8px_24px_rgba(20,17,15,0.1)] transition-all duration-300 ease-out hover:-translate-y-1 cursor-pointer select-none"
    >
      {/* 4:5 Image Area filling top of card */}
      <div className="relative aspect-[4/5] min-h-[180px] sm:min-h-[220px] w-full overflow-hidden bg-[#EAE4DC] flex items-center justify-center">
        <img
          src={pack.image || pack.imageUrl || NEUTRAL_PLACEHOLDER_IMAGE}
          alt={`${title} — Abdou Fragrances Guelmim`}
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          loading={isAboveFold ? 'eager' : 'lazy'}
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = NEUTRAL_PLACEHOLDER_IMAGE;
          }}
        />

        {/* Category Pill Tag */}
        <div className="absolute top-2.5 left-2.5 z-20 bg-[#14110F]/85 backdrop-blur-sm text-[#F4EFE7] text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full font-medium shadow-sm">
          {pack.category === 'women' ? 'Pack Femme' : 'Pack Homme'}
        </div>
      </div>

      {/* Structured Content Area: name -> short description/scent notes -> price -> full-width order button */}
      <div className="p-3.5 sm:p-5 flex flex-col flex-1 justify-between gap-3 bg-[#FDFCFA]">
        <div className="space-y-1.5">
          {/* 1. Name */}
          <h3 className="text-sm sm:text-base font-semibold text-[#14110F] group-hover:text-[#5A1A24] transition-colors leading-snug line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem]">
            {title}
          </h3>

          {/* 2. Short description or scent notes */}
          <p className="text-[11px] sm:text-xs text-[#8C857B] font-light leading-relaxed line-clamp-2 min-h-[2rem] sm:min-h-[2.25rem]">
            {description}
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t border-[#D9D1C5]/60">
          {/* 3. Price (Clearly Visible) */}
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm sm:text-base font-bold text-[#14110F]">
              {formatPrice(pack.price, 'fr')}
            </span>
            <span className="text-[10px] text-[#5A1A24] font-medium bg-[#5A1A24]/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
              Pack
            </span>
          </div>

          {/* 4. Full-width Order Button */}
          <button
            type="button"
            onClick={handleOrderClick}
            className="w-full min-h-[42px] sm:min-h-[44px] rounded-xl font-medium text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-sm bg-[#14110F] text-[#F4EFE7] hover:bg-[#25D366] hover:text-white active:scale-[0.98]"
            title="Commander ce Pack"
          >
            <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
              <path d="M12.031 2C6.494 2 2 6.494 2 12.031c0 1.97.57 3.81 1.558 5.367L2 22l4.743-1.528A9.97 9.97 0 0 0 12.031 22C17.568 22 22 17.506 22 12.031 22 6.494 17.568 2 12.031 2zm5.772 14.175c-.241.677-1.404 1.298-1.928 1.341-.524.043-1.002.215-3.328-.718-2.775-1.114-4.563-3.924-4.704-4.11-.14-.187-1.127-1.5-1.127-2.863 0-1.364.717-2.035.973-2.313.256-.278.558-.348.744-.348.187 0 .373.003.535.011.173.009.404-.066.632.482.238.575.814 1.986.885 2.13.07.143.117.311.023.498-.093.187-.14.303-.278.466-.14.163-.294.364-.42.49-.14.14-.287.291-.124.571.163.279.725 1.196 1.557 1.938 1.071.954 1.974 1.25 2.253 1.389.279.14.442.117.605-.07.163-.186.698-.813.884-1.092.187-.279.373-.233.629-.14.256.093 1.628.767 1.908.907.279.14.465.209.535.326.07.116.07.674-.171 1.351z" />
            </svg>
            <span>Commander le Pack</span>
          </button>
        </div>
      </div>
    </article>
  );
};
