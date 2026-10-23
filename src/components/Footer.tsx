import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { ActiveView } from '../types';
import { SocialLinks } from './SocialLinks';

interface FooterProps {
  setCurrentView: (view: ActiveView) => void;
  onNavigateToSection: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentView, onNavigateToSection }) => {
  const { t, language } = useLanguage();
  const { settings } = useCart();

  const handleNav = (view: ActiveView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="contact" className="w-full bg-[#14110F] text-[#F4EFE7] pt-16 sm:pt-20 pb-12 border-t border-[#D9D1C5]/20 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12 sm:space-y-16">
        {/* Top: Centered Store Logo (140px width, lazy-loaded) */}
        <div className="flex flex-col items-center justify-center text-center pb-10 border-b border-[#D9D1C5]/20">
          <img
            src="/logo-v2.png"
            alt="Abdou Fragrances — Emblème Maison de Haute Parfumerie Guelmim"
            width={140}
            height={140}
            loading="lazy"
            decoding="async"
            className="w-[140px] h-[140px] object-contain mx-auto mb-4"
          />
          <h2 className="font-brand text-2xl sm:text-4xl text-[#F4EFE7] leading-none tracking-wider">
            ABDOU FRAGRANCES
          </h2>
          <p className="text-xs sm:text-sm tracking-editorial uppercase text-[#A68A5B] mt-2 font-light">
            {t('tagline')}
          </p>

          <div className="mt-6 flex flex-col items-center gap-6">
            <a
              href="https://wa.me/212603288119"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp-outline min-h-[46px] px-6 inline-flex items-center justify-center gap-3 text-xs tracking-editorial uppercase text-[#F4EFE7] border-[#A68A5B] hover:bg-[#25D366] hover:border-[#25D366] hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 stroke-current fill-none stroke-[1.2]" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span>Conciergerie WhatsApp</span>
            </a>

            {/* Refined Social Media Section in site style */}
            <div className="pt-2">
              <SocialLinks
                variant="dark"
                showHeading={true}
                showHandle={true}
                size="md"
                align="center"
              />
            </div>
          </div>
        </div>

        {/* Middle: Information */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10 text-xs text-[#8C857B]">
          {/* About Column */}
          <div className="md:col-span-5 space-y-4">
            <span className="tracking-editorial uppercase text-[#F4EFE7] text-[11px] block">
              La Maison
            </span>
            <p className="leading-relaxed font-light text-[#F4EFE7]/80 text-sm">
              {t('footerAbout')}
            </p>
            <p className="text-[11px] text-[#A68A5B]">
              Flacons scellés & décants préparés sur-mesure · Livraison partout au Maroc
            </p>
          </div>

          {/* Navigation Column */}
          <div className="md:col-span-3 space-y-3">
            <span className="tracking-editorial uppercase text-[#F4EFE7] text-[11px] block">
              Navigation
            </span>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNav('home')}
                  className="hover:text-[#F4EFE7] transition-colors cursor-pointer min-h-[32px] flex items-center"
                >
                  Accueil
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('shop')}
                  className="hover:text-[#F4EFE7] transition-colors cursor-pointer min-h-[32px] flex items-center"
                >
                  {t('navShop')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateToSection('collection')}
                  className="hover:text-[#F4EFE7] transition-colors cursor-pointer min-h-[32px] flex items-center"
                >
                  {t('navCollection')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateToSection('location')}
                  className="hover:text-[#F4EFE7] transition-colors cursor-pointer min-h-[32px] flex items-center"
                >
                  {t('navStoreLocation')}
                </button>
              </li>
              <li>
                <a
                  href="https://wa.me/212603288119"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#F4EFE7] transition-colors cursor-pointer min-h-[32px] flex items-center"
                >
                  {t('navContact')}
                </a>
              </li>
            </ul>
          </div>

          {/* Concierge & Presence Column */}
          <div className="md:col-span-4 space-y-3">
            <span className="tracking-editorial uppercase text-[#F4EFE7] text-[11px] block">
              Commandes & Service Client
            </span>
            <p className="text-[#F4EFE7]/80 leading-relaxed">
              {t('footerHours')}
            </p>
            <div className="pt-2 space-y-1">
              <p>• Commandes directes & conseils personnalisés sur WhatsApp</p>
              <p>• Expédition express sécurisée dans toutes les villes du Maroc</p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => handleNav('admin')}
                className="text-[10px] tracking-editorial uppercase text-[#A68A5B] hover:underline cursor-pointer min-h-[32px] flex items-center"
              >
                {t('navAdmin')}
              </button>
            </div>
            <div className="pt-3 border-t border-[#D9D1C5]/10 mt-3">
              <span className="text-[10px] tracking-editorial uppercase text-[#A68A5B] block mb-2">
                Réseaux Sociaux
              </span>
              <SocialLinks variant="dark" showHeading={false} size="sm" align="start" />
            </div>
          </div>
        </div>

        {/* Bottom Bar: Clean Legal */}
        <div className="border-t border-[#D9D1C5]/20 pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8C857B] gap-4">
          <p>© {new Date().getFullYear()} {t('storeName')}. {t('footerLegal')}</p>
          <div className="flex items-center gap-6">
            <span>Casablanca</span>
            <span>·</span>
            <span>Rabat</span>
            <span>·</span>
            <span>Marrakech</span>
            <span>·</span>
            <span>Tanger</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
