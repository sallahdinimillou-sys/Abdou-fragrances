import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { Product, Language, ActiveView } from '../types';
import { SocialLinks } from './SocialLinks';
import { CloseButton } from './CloseButton';

interface NavigationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentView?: ActiveView;
  setCurrentView: (view: ActiveView) => void;
  onNavigateToSection: (sectionId: string) => void;
  products: Product[];
  onOpenProduct: (product: Product) => void;
}

export const NavigationOverlay: React.FC<NavigationOverlayProps> = ({
  isOpen,
  onClose,
  currentView = 'home',
  setCurrentView,
  onNavigateToSection,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const { settings } = useCart();

  // Lock body scroll while menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // French and Arabic only
  const languages: { code: Language; label: string }[] = [
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' }
  ];

  const handleLinkClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#14110F] text-[#F4EFE7] flex flex-col justify-between p-6 sm:p-10 md:p-14 overflow-y-auto transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
    >
      {/* Top Bar: Store Wordmark & Close button (X) */}
      <div className="flex items-center justify-between gap-4 border-b border-[#D9D1C5]/20 pb-5">
        <div>
          <span className="font-brand text-lg text-[#F4EFE7] tracking-wider select-none">
            ABDOU FRAGRANCES
          </span>
        </div>

        <CloseButton
          onClick={onClose}
          ariaLabel="Close"
          variant="light"
          className="border border-[#D9D1C5]/30 hover:border-[#A68A5B]"
        />
      </div>

      {/* Centered Store Logo at 130px width with ABDOU FRAGRANCES beneath it */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2 text-center">
        <img
          src="/logo-v2.png"
          alt="Abdou Fragrances — Logo Parfumerie Guelmim"
          width={130}
          height={130}
          loading="lazy"
          decoding="async"
          className="w-[130px] h-[130px] object-contain mx-auto mb-2 select-none"
        />
        <span className="font-brand text-lg text-[#F4EFE7] tracking-wider select-none">
          ABDOU FRAGRANCES
        </span>
      </div>

      {/* Main Nav Links in simple clean typography */}
      <div className="my-auto py-6">
        <nav className="flex flex-col gap-6 sm:gap-8">
          
          {/* 01 / Boutique */}
          <div
            className={`transition-all duration-300 delay-75 transform ${
              isOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
            }`}
          >
            <button
              onClick={() =>
                handleLinkClick(() => {
                  setCurrentView('shop');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                })
              }
              className={`font-display text-3xl sm:text-5xl md:text-6xl transition-colors cursor-pointer text-left rtl:text-right flex items-center gap-3 ${
                currentView === 'shop'
                  ? 'text-[#A68A5B] font-semibold'
                  : 'text-[#F4EFE7] hover:text-[#A68A5B]'
              }`}
            >
              <span>01 / {t('navBoutique')}</span>
              {currentView === 'shop' && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#A68A5B] inline-block ml-2 rtl:mr-2" />
              )}
            </button>
          </div>

          {/* 02 / باكات العطور / Packs */}
          <div
            className={`transition-all duration-300 delay-100 transform ${
              isOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
            }`}
          >
            <button
              onClick={() =>
                handleLinkClick(() => {
                  onNavigateToSection('collection');
                })
              }
              className="font-display text-3xl sm:text-5xl md:text-6xl text-[#C5A880] hover:text-white transition-colors cursor-pointer text-left rtl:text-right flex items-center gap-3"
            >
              <span>02 / {language === 'ar' ? 'باكات العطور' : 'Nos Packs'}</span>
              <span className="text-xs bg-[#5A1A24] text-[#F4EFE7] px-2 py-0.5 uppercase tracking-editorial font-sans">
                {language === 'ar' ? 'عروض' : 'Offres'}
              </span>
            </button>
          </div>

          {/* 03 / Notre histoire */}
          <div
            className={`transition-all duration-300 delay-150 transform ${
              isOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
            }`}
          >
            <button
              onClick={() =>
                handleLinkClick(() => {
                  onNavigateToSection('story');
                })
              }
              className="font-display text-3xl sm:text-5xl md:text-6xl text-[#F4EFE7] hover:text-[#A68A5B] transition-colors cursor-pointer text-left rtl:text-right flex items-center gap-3"
            >
              <span>03 / {t('navOurStory')}</span>
            </button>
          </div>

          {/* 04 / Notre Magasin */}
          <div
            className={`transition-all duration-300 delay-200 transform ${
              isOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
            }`}
          >
            <button
              onClick={() =>
                handleLinkClick(() => {
                  onNavigateToSection('location');
                })
              }
              className="font-display text-3xl sm:text-5xl md:text-6xl text-[#F4EFE7] hover:text-[#A68A5B] transition-colors cursor-pointer text-left rtl:text-right flex items-center gap-3"
            >
              <span>04 / {t('navStoreLocation')}</span>
            </button>
          </div>

          {/* 05 / Contact */}
          <div
            className={`transition-all duration-300 delay-250 transform ${
              isOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
            }`}
          >
            <button
              onClick={() =>
                handleLinkClick(() => {
                  onNavigateToSection('contact');
                })
              }
              className="font-display text-3xl sm:text-5xl md:text-6xl text-[#F4EFE7] hover:text-[#A68A5B] transition-colors cursor-pointer text-left rtl:text-right flex items-center gap-3"
            >
              <span>05 / {t('navContactHeader')}</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Bottom: Social links, Language switcher (FR · AR only) and WhatsApp contact line */}
      <div className="border-t border-[#D9D1C5]/20 pt-6 space-y-4">
        {/* Social Media Section */}
        <div className="pb-1">
          <SocialLinks
            variant="dark"
            showHeading={true}
            showHandle={true}
            size="md"
            align="start"
          />
        </div>

        <div className="flex items-center gap-6 text-sm tracking-editorial uppercase">
          <span className="text-xs text-[#8C857B]">Langue :</span>
          {languages.map((item) => (
            <button
              key={item.code}
              onClick={() => setLanguage(item.code)}
              className={`cursor-pointer min-h-[44px] px-2 flex items-center transition-colors ${
                language === item.code
                  ? 'text-[#F4EFE7] font-semibold border-b border-[#A68A5B]'
                  : 'text-[#8C857B] hover:text-[#F4EFE7]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#8C857B] gap-2 pt-2">
          <a
            href="https://wa.me/212603288119"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#A68A5B] hover:text-[#F4EFE7] transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4 stroke-current fill-none stroke-[1.2]" viewBox="0 0 24 24">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>WhatsApp ABDOU FRAGRANCES : 06 03 28 81 19</span>
          </a>

          <button
            onClick={() => {
              setCurrentView('admin');
              onClose();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-[10px] uppercase tracking-editorial text-[#8C857B] hover:text-[#A68A5B] cursor-pointer self-start sm:self-auto min-h-[44px] flex items-center"
          >
            {t('navAdmin')}
          </button>
        </div>
      </div>
    </div>
  );
};
