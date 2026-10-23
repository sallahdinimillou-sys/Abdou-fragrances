import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { Product, Language, ActiveView } from '../types';
import { SocialLinks } from './SocialLinks';

interface HeaderProps {
  onOpenMenu: () => void;
  onToggleMenu?: () => void;
  isMenuOpen?: boolean;
  onOpenProduct: (product: Product) => void;
  products: Product[];
  currentView: ActiveView;
  setCurrentView: (view: ActiveView) => void;
  onNavigateToSection: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMenu,
  onToggleMenu,
  isMenuOpen = false,
  onOpenProduct,
  products,
  currentView,
  setCurrentView,
  onNavigateToSection
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { totalItems, setIsCartOpen, settings } = useCart();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  // Bag badge scale animation when items are added
  const [isBadgePopping, setIsBadgePopping] = useState(false);
  const prevTotalRef = useRef(totalItems);

  useEffect(() => {
    if (totalItems > prevTotalRef.current) {
      setIsBadgePopping(true);
      const timer = setTimeout(() => setIsBadgePopping(false), 350);
      return () => clearTimeout(timer);
    }
    prevTotalRef.current = totalItems;
  }, [totalItems]);

  // Sticky behavior:
  // - transparent-looking ivory at top;
  // - on scroll down the header shrinks smoothly (logo goes from 52px to 40px),
  //   gains a 1px hairline and a very light shadow;
  // - on scroll up it reappears instantly. Smooth 250ms transitions, no backdrop-filter.
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;

      setIsScrolled(currentY > 25);

      // Scroll direction detection:
      // When scrolling down past 120px and menu is closed, hide smoothly;
      // On scroll up, instantly reappear!
      if (currentY > 120 && currentY > lastY + 4 && !isMenuOpen) {
        setIsHidden(true);
      } else if (currentY < lastY - 4 || currentY <= 30) {
        setIsHidden(false);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMenuOpen]);

  const handleNavClick = (sectionId: string) => {
    onNavigateToSection(sectionId);
  };

  const handleMenuClick = () => {
    if (onToggleMenu) {
      onToggleMenu();
    } else {
      onOpenMenu();
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-250 ease-out ${
        isHidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* 1. Announcement bar: one line, slow continuous marquee with delivery across Morocco */}
      <div className="bg-[#F4EFE7] text-[#5A1A24] border-b border-[#D9D1C5] h-[30px] flex items-center overflow-hidden px-4 select-none">
        <div className="w-full overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-marquee text-[10px] sm:text-[11px] tracking-editorial uppercase font-medium">
            <span>{settings.announcementText?.fr || 'Haute Parfumerie & Extraits Rares'}</span>
            <span className="mx-6 text-[#A68A5B]">·</span>
            <span className="font-semibold text-[#14110F]">
              Livraison dans tout le Maroc
            </span>
            <span className="mx-6 text-[#A68A5B]">·</span>
            <span>Guelmim, Maroc</span>
            <span className="mx-6 text-[#A68A5B]">·</span>
            <span className="font-semibold text-[#14110F]">
              Livraison dans tout le Maroc
            </span>
            <span className="mx-6 text-[#A68A5B]">·</span>
          </div>
        </div>
      </div>

      {/* 2. Mobile Header (under 768px):
          - Height: 68px at top, shrinks smoothly to 60px on scroll
          - 3 zones with CSS grid 1fr auto 1fr
          - Start: Hamburger morphing into X (min 44px touch target)
          - Center: Logo (52px shrinking to 40px) + ABDOU FRAGRANCES wordmark as ONE centered group (single line, Bodoni Moda, clamp(14px, 4vw, 19px), letter-spacing 0.1em)
          - End: Bag icon with oxblood count badge (min 44px touch target)
      */}
      <div
        className={`md:hidden bg-[#F4EFE7] transition-all duration-250 ease-out ${
          isScrolled
            ? 'h-[60px] border-b border-[#D9D1C5] shadow-[0_2px_10px_rgba(20,17,15,0.05)]'
            : 'h-[68px] border-b border-transparent'
        }`}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full px-2.5 sm:px-4">
          
          {/* Start Zone: Hamburger morphing into X */}
          <div className="flex items-center justify-start">
            <button
              onClick={handleMenuClick}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-start cursor-pointer text-[#14110F] hover:text-[#5A1A24] transition-colors p-2"
              aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <div className="w-5 h-3.5 relative flex flex-col justify-between pointer-events-none">
                <span
                  className={`block h-[1.5px] w-full bg-current transform transition-all duration-250 ease-out origin-center ${
                    isMenuOpen ? 'translate-y-[6px] rotate-45' : ''
                  }`}
                />
                <span
                  className={`block h-[1.5px] w-3.5 bg-current transition-all duration-250 ease-out ${
                    isMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`block h-[1.5px] w-full bg-current transform transition-all duration-250 ease-out origin-center ${
                    isMenuOpen ? '-translate-y-[6px] -rotate-45' : ''
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Center Zone: Logo + ABDOU FRAGRANCES as ONE centered group (sits together, single line, no wrapping) */}
          <div className="flex items-center justify-center overflow-hidden">
            <button
              onClick={() => {
                setCurrentView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer flex items-center justify-center gap-2 max-w-full overflow-hidden select-none"
              aria-label="ABDOU FRAGRANCES"
            >
              {/* Logo: 52px height on mobile, shrinks smoothly to 40px on scroll */}
              <img
                src="/logo-v2.png"
                alt="Abdou Fragrances — Haute Parfumerie à Guelmim"
                width={52}
                height={52}
                decoding="async"
                className={`object-contain flex-shrink-0 transition-all duration-250 opacity-100 ${
                  isScrolled ? 'w-[40px] h-[40px]' : 'w-[52px] h-[52px]'
                }`}
              />
              <span
                style={{
                  fontSize: 'clamp(14px, 4vw, 19px)',
                  whiteSpace: 'nowrap'
                }}
                className="font-brand text-[#14110F] leading-none whitespace-nowrap"
              >
                ABDOU FRAGRANCES
              </span>
            </button>
          </div>

          {/* End Zone: Bag Icon with oxblood count badge */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-end cursor-pointer text-[#14110F] hover:text-[#5A1A24] transition-colors p-2"
              aria-label="View Shopping Bag"
            >
              <svg
                className="w-5 h-5 stroke-current fill-none stroke-[1.2]"
                viewBox="0 0 24 24"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>

              {totalItems > 0 && (
                <span
                  className={`absolute top-1.5 right-1.5 min-w-[17px] h-[17px] px-1 bg-[#5A1A24] text-[#F4EFE7] text-[9px] font-bold flex items-center justify-center transition-transform duration-300 ${
                    isBadgePopping ? 'scale-125' : 'scale-100'
                  }`}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* 3. Desktop Header (768px and above):
          - Nav links on start (Boutique, Notre histoire, Contact)
          - Centered logo + wordmark (64px shrinking to 48px, Bodoni Moda, single line)
          - Language switch (FR · AR) and bag on end
          - Mirrors correctly for RTL
      */}
      <div
        className={`hidden md:block bg-[#F4EFE7] transition-all duration-250 ease-out px-6 lg:px-10 ${
          isScrolled
            ? 'h-[64px] border-b border-[#D9D1C5] shadow-[0_2px_12px_rgba(20,17,15,0.05)]'
            : 'h-[80px] border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto h-full grid grid-cols-[1fr_auto_1fr] items-center gap-6">
          
          {/* Start Zone: Nav links with animated underline & active page indicator */}
          <nav className="flex items-center justify-start gap-6 lg:gap-8 text-xs uppercase tracking-editorial font-medium">
            {/* Boutique */}
            <button
              onClick={() => {
                setCurrentView('shop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative group py-2 transition-colors cursor-pointer min-h-[44px] flex items-center ${
                currentView === 'shop' ? 'text-[#5A1A24] font-semibold' : 'text-[#14110F] hover:text-[#5A1A24]'
              }`}
            >
              <span>{t('navBoutique')}</span>
              <span
                className={`absolute bottom-2 left-0 right-0 h-[1.5px] bg-[#5A1A24] transition-all duration-250 ease-out ${
                  currentView === 'shop' ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </button>

            {/* باكات العطور / Packs */}
            <button
              onClick={() => handleNavClick('collection')}
              className="relative group py-2 text-[#5A1A24] hover:text-[#14110F] transition-colors cursor-pointer min-h-[44px] flex items-center gap-1 font-semibold"
            >
              <span>{language === 'ar' ? 'باكات العطور' : 'Nos Packs'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5A1A24]" />
              <span
                className="absolute bottom-2 left-0 right-0 h-[1.5px] bg-[#5A1A24] transition-all duration-250 ease-out w-0 group-hover:w-full"
              />
            </button>

            {/* Notre histoire */}
            <button
              onClick={() => handleNavClick('story')}
              className={`relative group py-2 transition-colors cursor-pointer min-h-[44px] flex items-center ${
                currentView === 'home' ? 'text-[#14110F] hover:text-[#5A1A24]' : 'text-[#14110F] hover:text-[#5A1A24]'
              }`}
            >
              <span>{t('navOurStory')}</span>
              <span
                className="absolute bottom-2 left-0 right-0 h-[1.5px] bg-[#5A1A24] transition-all duration-250 ease-out w-0 group-hover:w-full"
              />
            </button>

            {/* Notre Magasin */}
            <button
              onClick={() => handleNavClick('location')}
              className="relative group py-2 text-[#14110F] hover:text-[#5A1A24] transition-colors cursor-pointer min-h-[44px] flex items-center"
            >
              <span>{t('navStoreLocation')}</span>
              <span
                className="absolute bottom-2 left-0 right-0 h-[1.5px] bg-[#5A1A24] transition-all duration-250 ease-out w-0 group-hover:w-full"
              />
            </button>

            {/* Contact */}
            <button
              onClick={() => handleNavClick('contact')}
              className="relative group py-2 text-[#14110F] hover:text-[#5A1A24] transition-colors cursor-pointer min-h-[44px] flex items-center"
            >
              <span>{t('navContactHeader')}</span>
              <span
                className="absolute bottom-2 left-0 right-0 h-[1.5px] bg-[#5A1A24] transition-all duration-250 ease-out w-0 group-hover:w-full"
              />
            </button>
          </nav>

          {/* Center Zone: Centered Logo (64px) + Wordmark on single line */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => {
                setCurrentView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer flex items-center justify-center gap-3.5 group select-none"
              aria-label="ABDOU FRAGRANCES"
            >
              {/* Logo: 64px desktop height, shrinks to 48px on scroll */}
              <img
                src="/logo-v2.png"
                alt="Abdou Fragrances — Haute Parfumerie & Parfums Rares Guelmim"
                width={64}
                height={64}
                decoding="async"
                className={`object-contain flex-shrink-0 transition-all duration-250 opacity-100 ${
                  isScrolled ? 'w-[48px] h-[48px]' : 'w-[64px] h-[64px]'
                }`}
              />
              <div className="flex flex-col text-left rtl:text-right">
                <span
                  style={{
                    fontSize: 'clamp(17px, 2.3vw, 22px)',
                    whiteSpace: 'nowrap'
                  }}
                  className="font-brand text-[#14110F] leading-none whitespace-nowrap"
                >
                  ABDOU FRAGRANCES
                </span>
                {!isScrolled && (
                  <span className="text-[9px] tracking-editorial text-[#8C857B] uppercase mt-1">
                    {t('tagline')}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* End Zone: Social Links, Language switcher (FR · AR) and Bag */}
          {/* End Zone: Social Links and Bag */}
          <div className="flex items-center justify-end gap-4 lg:gap-6 text-xs">
            {/* Subtle Social Media Icons on wide desktop */}
            <div className="hidden xl:flex items-center gap-1 border-r border-[#D9D1C5]/80 pr-4">
              <SocialLinks variant="light" size="sm" showHeading={false} />
            </div>

            {/* Shopping Bag Button with oxblood count badge and pop animation */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#14110F] hover:text-[#5A1A24] transition-colors cursor-pointer p-2"
              aria-label="View Shopping Bag"
            >
              <svg
                className="w-5 h-5 stroke-current fill-none stroke-[1.2]"
                viewBox="0 0 24 24"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>

              {totalItems > 0 && (
                <span
                  className={`absolute top-1.5 right-1.5 min-w-[17px] h-[17px] px-1 bg-[#5A1A24] text-[#F4EFE7] text-[9px] font-bold flex items-center justify-center transition-transform duration-300 ${
                    isBadgePopping ? 'scale-125' : 'scale-100'
                  }`}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
