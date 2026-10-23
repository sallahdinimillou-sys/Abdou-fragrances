import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export const StoreLocation: React.FC = () => {
  const { t, language } = useLanguage();

  const storeInfo = {
    name: 'abdou_fragrances',
    addressFr: 'Complexe Golden Sands, Rue Ibn Rochd, Guelmim 81000, Maroc (Plus Code : XWQW+GG)',
    phoneFormatted: '06 03 28 81 19',
    phoneRaw: '+212603288119',
    whatsappUrl: `https://wa.me/212603288119?text=${encodeURIComponent(
      'Bonjour abdou_fragrances, je vous contacte au sujet des parfums de votre boutique.'
    )}`,
    directionsUrl: 'https://maps.app.goo.gl/WvK4e5ie4yyPBmMX9',
    embedMapUrl: 'https://maps.google.com/maps?q=abdou_fragrances+Golden+Sands+Guelmim&t=&z=17&ie=UTF8&iwloc=&output=embed'
  };

  return (
    <section
      id="location"
      className="py-20 sm:py-28 bg-[#F4EFE7] border-t border-[#D9D1C5] scroll-mt-24 sm:scroll-mt-28"
      aria-labelledby="store-location-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
          <span className="text-[10px] sm:text-xs font-medium tracking-editorial uppercase text-[#5A1A24] block mb-2.5">
            {t('storeLocationBadge')}
          </span>
          <h2
            id="store-location-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl text-[#14110F] mb-4"
          >
            {t('storeLocationTitle')}
          </h2>
          <div className="w-12 h-[1px] bg-[#A68A5B] mx-auto mb-4" />
          <p className="text-xs sm:text-sm text-[#8C857B] font-light leading-relaxed">
            {t('storeLocationSubtitle')}
          </p>
        </div>

        {/* 2-Column Responsive Layout: Store Details + Interactive Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          
          {/* Left Column: Store Details & Actions (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#FDFCFA] border border-[#D9D1C5] p-6 sm:p-8 lg:p-10 shadow-[0_4px_24px_rgba(20,17,15,0.04)]">
            <div className="space-y-6 sm:space-y-7">
              {/* Boutique Brand & Status */}
              <div className="border-b border-[#D9D1C5]/60 pb-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[10px] tracking-editorial uppercase font-medium text-[#A68A5B]">
                    Guelmim · Maroc
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-editorial uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Boutique Ouverte
                  </span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl text-[#14110F] font-semibold">
                  {storeInfo.name}
                </h3>
              </div>

              {/* Address in French */}
              <div className="space-y-4">
                <div className="p-4 border-l-2 border-[#5A1A24] bg-[#F4EFE7]/50">
                  <p className="text-[10px] tracking-editorial uppercase text-[#8C857B] mb-1 font-medium">
                    Adresse de la Boutique
                  </p>
                  <p className="text-xs sm:text-sm text-[#14110F] font-normal leading-relaxed">
                    {storeInfo.addressFr}
                  </p>
                </div>
              </div>

              {/* Contact: Phone & WhatsApp */}
              <div className="border-t border-[#D9D1C5]/60 pt-5 space-y-3">
                <p className="text-[10px] tracking-editorial uppercase text-[#8C857B] font-medium">
                  {t('storePhoneLabel')}
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#5A1A24]/10 text-[#5A1A24] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 fill-none stroke-current stroke-[1.5]" viewBox="0 0 24 24">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div>
                    <a
                      href={`tel:${storeInfo.phoneRaw}`}
                      className="text-base sm:text-lg font-medium tracking-wide text-[#14110F] hover:text-[#5A1A24] transition-colors inline-block"
                      aria-label={`Appeler le magasin ${storeInfo.phoneFormatted}`}
                    >
                      {storeInfo.phoneFormatted}
                    </a>
                    <span className="block text-[11px] text-[#8C857B]">
                      {t('storeHoursValue')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons: Get Directions & Chat on WhatsApp */}
            <div className="mt-8 pt-6 border-t border-[#D9D1C5] flex flex-col sm:flex-row gap-3">
              {/* Get Directions Button */}
              <a
                href={storeInfo.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[46px] px-5 bg-[#14110F] text-[#F4EFE7] hover:bg-[#5A1A24] text-xs tracking-editorial uppercase font-medium inline-flex items-center justify-center gap-2.5 transition-all duration-200 shadow-sm group"
                aria-label="Ouvrir l'itinéraire Google Maps vers Abdou Fragrances"
              >
                <svg
                  className="w-4 h-4 stroke-current fill-none stroke-[1.6] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                  viewBox="0 0 24 24"
                >
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
                <span>Itinéraire Google Maps</span>
              </a>

              {/* Chat on WhatsApp Button */}
              <a
                href={storeInfo.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[46px] px-5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs tracking-editorial uppercase font-medium inline-flex items-center justify-center gap-2.5 transition-all duration-200 shadow-sm"
                aria-label="Discuter avec Abdou Fragrances sur WhatsApp"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 2C6.494 2 2 6.494 2 12.031c0 1.97.57 3.81 1.558 5.367L2 22l4.743-1.528A9.97 9.97 0 0 0 12.031 22C17.568 22 22 17.506 22 12.031 22 6.494 17.568 2 12.031 2zm5.772 14.175c-.241.677-1.404 1.298-1.928 1.341-.524.043-1.002.215-3.328-.718-2.775-1.114-4.563-3.924-4.704-4.11-.14-.187-1.127-1.5-1.127-2.863 0-1.364.717-2.035.973-2.313.256-.278.558-.348.744-.348.187 0 .373.003.535.011.173.009.404-.066.632.482.238.575.814 1.986.885 2.13.07.143.117.311.023.498-.093.187-.14.303-.278.466-.14.163-.294.364-.42.49-.14.14-.287.291-.124.571.163.279.725 1.196 1.557 1.938 1.071.954 1.974 1.25 2.253 1.389.279.14.442.117.605-.07.163-.186.698-.813.884-1.092.187-.279.373-.233.629-.14.256.093 1.628.767 1.908.907.279.14.465.209.535.326.07.116.07.674-.171 1.351z" />
                </svg>
                <span>{t('chatOnWhatsApp')}</span>
              </a>
            </div>
          </div>

          {/* Right Column: Google Maps Embed (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="relative w-full h-full min-h-[380px] sm:min-h-[440px] border border-[#D9D1C5] bg-[#E9E4DC] shadow-[0_4px_24px_rgba(20,17,15,0.06)] overflow-hidden">
              {/* Google Maps Free Iframe Embed (No API key needed) */}
              <iframe
                title="Emplacement Abdou Fragrances - Guelmim"
                src={storeInfo.embedMapUrl}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '380px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full absolute inset-0"
              />

              {/* Elegant floating overlay badge on top-left of the map */}
              <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 pointer-events-none z-10">
                <div className="bg-[#14110F]/90 backdrop-blur-sm text-[#F4EFE7] px-3.5 py-1.5 border border-[#A68A5B]/40 shadow-md flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#A68A5B]" />
                  <span className="text-[10px] tracking-editorial uppercase font-medium">
                    Abdou Fragrances · Guelmim
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
