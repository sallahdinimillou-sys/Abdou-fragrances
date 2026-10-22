import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onDiscover: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onDiscover }) => {
  const { t } = useLanguage();

  return (
    <section
      id="story"
      className="relative w-full min-h-[100dvh] flex flex-col justify-between items-center overflow-hidden bg-[#14110F] text-[#F4EFE7] pt-24 pb-14 sm:pt-28 sm:pb-20 scroll-mt-24 sm:scroll-mt-28"
    >
      {/* 1. Full-width optimized WebP Perfume Bottle Background (min-height: 100dvh on mobile, no frame or border, no inner card) */}
      <img
        src="https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1600&q=80&fm=webp"
        alt="Abdou Fragrances — Haute Parfumerie et Flacon d'Exception à Guelmim"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
        loading="eager"
        fetchPriority="high"
      />

      {/* 2. Soft dark gradient overlay (rgba(20,17,15,0.45) to 0.25) so logo and typography remain crisp and readable without backdrop-filter */}
      <div
        className="absolute inset-0 z-1 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(20, 17, 15, 0.52) 0%, rgba(20, 17, 15, 0.32) 45%, rgba(20, 17, 15, 0.60) 100%)'
        }}
      />
      <div
        className="absolute inset-0 z-1 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(20, 17, 15, 0.45) 0%, rgba(20, 17, 15, 0.25) 75%)'
        }}
      />

      {/* 3. Subtle 4% Grain overlay strictly on hero */}
      <div className="absolute inset-0 hero-grain-overlay z-2 pointer-events-none" />

      {/* 4. Top/Center Zone: Transparent White-and-Gold Logo Overlay (Centered, 70% width on mobile max 340px, 40% on desktop max 460px) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 flex-1 flex flex-col items-center justify-center my-auto py-6 sm:py-10">
        <div className="w-full flex items-center justify-center">
          <img
            src="/logo-hero-v3.png"
            srcSet="/logo-hero-v3.png 1x, /logo-hero-v3@2x.png 2x"
            alt="Abdou Fragrances — Logo Officiel Maison de Haute Parfumerie Guelmim"
            width="460"
            height="460"
            className="w-[70%] max-w-[340px] md:w-[48%] lg:w-[40%] lg:max-w-[460px] h-auto object-contain hero-logo-fadein pointer-events-none select-none"
            style={{ filter: 'drop-shadow(0 2px 12px rgba(0, 0, 0, 0.45))' }}
          />
        </div>
      </div>

      {/* 5. Bottom Zone: Headline & "Découvrir la collection" Button over background in Ivory text (#F4EFE7) */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-8 text-center mt-auto pt-4">
        {/* Editorial Sub-Label */}
        <div className="mb-2 sm:mb-3">
          <span className="text-[10px] sm:text-xs tracking-editorial text-[#A68A5B] font-medium uppercase">
            {t('heroLabel')}
          </span>
        </div>

        {/* Main single H1 for SEO: Clean sans-serif headline in Ivory (#F4EFE7) */}
        <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-5.5xl text-[#F4EFE7] leading-[1.15] tracking-tight-display mb-6 sm:mb-8 text-balance">
          {t('heroHeadline')}
        </h1>

        {/* Ivory Editorial CTA Button (min 44px touch target) */}
        <div className="flex justify-center pb-2">
          <button
            onClick={onDiscover}
            className="btn-secondary-invert border-[#F4EFE7] text-[#F4EFE7] hover:bg-[#F4EFE7] hover:text-[#14110F] px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-medium tracking-editorial uppercase cursor-pointer transition-all flex items-center gap-3 group"
          >
            <span>{t('heroCta')}</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5">
              →
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
