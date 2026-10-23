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
      {/* 1. Full-width optimized Perfume Bottle Background with responsive modern formats */}
      <picture className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
        {/* AVIF format */}
        <source
          type="image/avif"
          media="(max-width: 768px)"
          srcSet="/assets/hero/hero-mobile.avif"
        />
        <source
          type="image/avif"
          media="(min-width: 769px)"
          srcSet="/assets/hero/hero-desktop.avif"
        />
        {/* WebP fallback */}
        <source
          type="image/webp"
          media="(max-width: 768px)"
          srcSet="/assets/hero/hero-mobile.webp"
        />
        <source
          type="image/webp"
          media="(min-width: 769px)"
          srcSet="/assets/hero/hero-desktop.webp"
        />
        <img
          src="/assets/hero/hero-desktop.webp"
          alt="Abdou Fragrances — Haute Parfumerie et Flacons d'Exception à Guelmim"
          width="1600"
          height="2000"
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover object-[50%_36%] sm:object-[50%_33%]"
        />
      </picture>

      {/* 2. Soft dark gradient overlay so logo and typography remain crisp and readable */}
      <div
        className="absolute inset-0 z-1 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(20, 17, 15, 0.55) 0%, rgba(20, 17, 15, 0.32) 42%, rgba(20, 17, 15, 0.70) 100%)'
        }}
      />
      {/* Soft radial vignette focused around the center logo area to ensure maximum logo legibility without dimming the bottles */}
      <div
        className="absolute inset-0 z-1 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(20, 17, 15, 0.56) 0%, rgba(20, 17, 15, 0.20) 55%, transparent 75%)'
        }}
      />

      {/* 3. Subtle 4% Grain overlay strictly on hero */}
      <div className="absolute inset-0 hero-grain-overlay z-2 pointer-events-none" />

      {/* 4. Top/Center Zone: Transparent White-and-Gold Logo Overlay (Centered, 70% width on mobile max 340px, 40% on desktop max 460px) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 flex-1 flex flex-col items-center justify-center my-auto py-6 sm:py-10">
        <div className="w-full flex items-center justify-center">
          <picture className="w-[70%] max-w-[340px] md:w-[48%] lg:w-[40%] lg:max-w-[460px] flex items-center justify-center">
            <source
              type="image/webp"
              srcSet="/logo-hero-v3.webp 1x, /logo-hero-v3@2x.webp 2x"
            />
            <img
              src="/logo-hero-v3.png"
              srcSet="/logo-hero-v3.png 1x, /logo-hero-v3@2x.png 2x"
              alt="Abdou Fragrances — Logo Officiel Maison de Haute Parfumerie Guelmim"
              width="460"
              height="460"
              fetchPriority="high"
              decoding="async"
              className="w-full h-auto object-contain hero-logo-fadein pointer-events-none select-none"
              style={{ filter: 'drop-shadow(0 2px 14px rgba(0, 0, 0, 0.65))' }}
            />
          </picture>
        </div>
      </div>

      {/* 5. Bottom Zone: Headline & "Découvrir la collection" Button over background in Ivory text (#F4EFE7) */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-8 text-center mt-auto pt-4">
        {/* Editorial Sub-Label in Warm Gold */}
        <div className="mb-2 sm:mb-3">
          <span className="text-[10px] sm:text-xs tracking-editorial text-[#C5A880] font-medium uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
            {t('heroLabel')}
          </span>
        </div>

        {/* Main single H1 for SEO: Clean sans-serif headline in Ivory (#F4EFE7) */}
        <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-5.5xl text-[#F4EFE7] leading-[1.15] tracking-tight-display mb-6 sm:mb-8 text-balance drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
          {t('heroHeadline')}
        </h1>

        {/* Editorial CTA Button in Gold & Ivory border */}
        <div className="flex justify-center pb-2">
          <button
            onClick={onDiscover}
            className="btn-secondary-invert border-[#C5A880] text-[#F4EFE7] hover:bg-[#C5A880] hover:text-[#14110F] px-8 py-3.5 min-h-[44px] text-xs sm:text-sm font-medium tracking-editorial uppercase cursor-pointer transition-all flex items-center gap-3 group shadow-xl"
          >
            <span>{t('heroCta')}</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 text-[#C5A880] group-hover:text-[#14110F]">
              →
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
