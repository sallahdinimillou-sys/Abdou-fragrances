import React from 'react';
import { Pack, PackCategory } from '../types';

interface PacksTopBannersProps {
  packs: Pack[];
  onOpenPacksPage?: (category: PackCategory) => void;
}

export const PacksTopBanners: React.FC<PacksTopBannersProps> = ({ packs, onOpenPacksPage }) => {
  const activePacks = packs.filter((p) => p.isActive);
  const womenPacks = activePacks.filter((p) => p.category === 'women');
  const menPacks = activePacks.filter((p) => p.category === 'men');

  const handleClick = (category: PackCategory) => {
    if (onOpenPacksPage) {
      onOpenPacksPage(category);
    } else {
      window.location.hash = category === 'women' ? '#packs-women' : '#packs-men';
    }
  };

  return (
    <div className="pt-6 sm:pt-10 pb-4 bg-[#F4EFE7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Label */}
        <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#5A1A24] rotate-45 flex-shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-[#5A1A24]">
              Offres & Packs Exclusifs
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-[#8C857B] tracking-wider uppercase hidden sm:inline">
            Économie & Qualité 100% Authentique
          </span>
        </div>

        {/* The Two Large Elegant Boxes (Fixed in place, 1st Women, 2nd Men) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
          
          {/* FIRST BOX: Packs Femme */}
          <div
            onClick={() => handleClick('women')}
            className="group relative overflow-hidden bg-[#14110F] text-[#F4EFE7] border border-[#D9D1C5] hover:border-[#5A1A24] transition-all duration-500 cursor-pointer select-none shadow-md hover:shadow-xl"
            style={{ minHeight: '260px' }}
          >
            {/* Background Luxury Image with Soft Zoom */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=80"
                alt="Packs Femme — Haute Parfumerie Abdou Fragrances Guelmim"
                className="w-full h-full object-cover object-center brightness-[0.42] group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14110F] via-[#14110F]/60 to-transparent" />
            </div>

            {/* Thin Gold Hairline Inner Frame */}
            <div className="absolute inset-3 sm:inset-4 border border-[#C5A880]/40 pointer-events-none z-10 transition-colors group-hover:border-[#C5A880]/80" />

            {/* Box Content */}
            <div className="relative z-20 h-full p-6 sm:p-8 flex flex-col justify-between" style={{ minHeight: '260px' }}>
              {/* Top Meta Tag */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-[#5A1A24] text-[#F4EFE7] text-[10px] tracking-wider uppercase px-3 py-1 font-medium shadow-sm">
                  1. Sélection Femme
                </span>
                <span className="text-[10px] sm:text-xs text-[#C5A880] tracking-wider uppercase font-medium bg-[#14110F]/80 backdrop-blur-sm px-2.5 py-0.5 border border-[#C5A880]/30">
                  {womenPacks.length} Packs
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2 mt-auto pt-6">
                <h3 className="font-display text-2xl sm:text-3xl text-[#F4EFE7] group-hover:text-[#C5A880] transition-colors font-medium">
                  Packs Femme
                </h3>
                <p className="text-xs sm:text-sm text-[#D9D1C5] font-light max-w-md leading-relaxed line-clamp-2">
                  Les plus prestigieuses fragrances féminines et muscs rares réunis dans des packs d’exception.
                </p>

                {/* Call to action bar */}
                <div className="pt-3 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#C5A880] flex items-center gap-2 group-hover:gap-3 transition-all">
                    <span>Voir les packs femme</span>
                    <span className="text-base">→</span>
                  </span>
                  <span className="text-[10px] sm:text-xs text-[#EAE4DC]/80 font-mono">
                    Dès 650 DH
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECOND BOX: Packs Homme */}
          <div
            onClick={() => handleClick('men')}
            className="group relative overflow-hidden bg-[#14110F] text-[#F4EFE7] border border-[#D9D1C5] hover:border-[#5A1A24] transition-all duration-500 cursor-pointer select-none shadow-md hover:shadow-xl"
            style={{ minHeight: '260px' }}
          >
            {/* Background Luxury Image with Soft Zoom */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=80"
                alt="Packs Homme — Haute Parfumerie Abdou Fragrances Guelmim"
                className="w-full h-full object-cover object-center brightness-[0.38] group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14110F] via-[#14110F]/60 to-transparent" />
            </div>

            {/* Thin Gold Hairline Inner Frame */}
            <div className="absolute inset-3 sm:inset-4 border border-[#C5A880]/40 pointer-events-none z-10 transition-colors group-hover:border-[#C5A880]/80" />

            {/* Box Content */}
            <div className="relative z-20 h-full p-6 sm:p-8 flex flex-col justify-between" style={{ minHeight: '260px' }}>
              {/* Top Meta Tag */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-[#5A1A24] text-[#F4EFE7] text-[10px] tracking-wider uppercase px-3 py-1 font-medium shadow-sm">
                  2. Sélection Homme
                </span>
                <span className="text-[10px] sm:text-xs text-[#C5A880] tracking-wider uppercase font-medium bg-[#14110F]/80 backdrop-blur-sm px-2.5 py-0.5 border border-[#C5A880]/30">
                  {menPacks.length} Packs
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2 mt-auto pt-6">
                <h3 className="font-display text-2xl sm:text-3xl text-[#F4EFE7] group-hover:text-[#C5A880] transition-colors font-medium">
                  Packs Homme
                </h3>
                <p className="text-xs sm:text-sm text-[#D9D1C5] font-light max-w-md leading-relaxed line-clamp-2">
                  Accords intenses, bois précieux et oud pur réunis pour affirmer une prestance remarquable.
                </p>

                {/* Call to action bar */}
                <div className="pt-3 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#C5A880] flex items-center gap-2 group-hover:gap-3 transition-all">
                    <span>Voir les packs homme</span>
                    <span className="text-base">→</span>
                  </span>
                  <span className="text-[10px] sm:text-xs text-[#EAE4DC]/80 font-mono">
                    Dès 690 DH
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
