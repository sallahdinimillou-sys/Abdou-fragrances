import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

interface FloatingWhatsAppProps {
  isProductModalOpen?: boolean;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ isProductModalOpen = false }) => {
  const { settings } = useCart();
  const { language, isRTL } = useLanguage();
  const [showTooltip, setShowTooltip] = useState(false);

  const cleanNumber = settings.whatsappNumber.replace(/[^0-9]/g, '');

  let greeting = '';
  if (language === 'ar') {
    greeting = "مرحباً ABDOU FRAGRANCES، أود الاستفسار عن توفر العطور والتقسيم لديكم.";
  } else {
    greeting = "Bonjour ABDOU FRAGRANCES, je souhaite des conseils pour une commande de parfums ou décants.";
  }

  const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(greeting)}`;

  // Tooltip appears once after 3 seconds, then fades away after 5 seconds
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowTooltip(true);
    }, 3000);

    const hideTimer = setTimeout(() => {
      setShowTooltip(false);
    }, 8500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const tooltipText = language === 'ar' ? 'اطلب عبر واتساب' : 'Commander sur WhatsApp';

  // On the product page/modal, raise above the mobile sticky action bar (~74px) so they never overlap
  const bottomPosition = isProductModalOpen
    ? 'max(5.5rem, calc(env(safe-area-inset-bottom) + 5rem))'
    : 'max(1.5rem, env(safe-area-inset-bottom))';

  return (
    <aside
      aria-label="WhatsApp Concierge"
      className="fixed z-40 transition-all duration-300"
      style={{
        bottom: bottomPosition,
        right: isRTL ? 'auto' : 'max(1.5rem, env(safe-area-inset-right))',
        left: isRTL ? 'max(1.5rem, env(safe-area-inset-left))' : 'auto'
      }}
    >
      <div className="relative flex items-center">
        {/* Tooltip that appears after 3 seconds */}
        <div
          className={`absolute bottom-full mb-3 right-0 rtl:right-auto rtl:left-0 transition-all duration-500 pointer-events-none whitespace-nowrap ${
            showTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <div className="bg-[#14110F] text-[#F4EFE7] border border-[#25D366]/40 text-xs tracking-wider px-3 py-1.5 shadow-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
            <span>{tooltipText}</span>
          </div>
        </div>

        {/* Circular Glowing WhatsApp Button (58px green circle with glow, perfectly centered) */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={tooltipText}
          className="whatsapp-circle-btn group relative flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform duration-200 animate-pulse-whatsapp"
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            overflow: 'hidden',
            aspectRatio: '1 / 1',
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            boxShadow: '0 4px 18px rgba(37, 211, 102, 0.45)'
          }}
          title={tooltipText}
        >
          {/* Large solid white WhatsApp official phone-inside-speech-bubble glyph (30px) */}
          <svg
            className="w-[30px] h-[30px] fill-white text-white transition-transform duration-300 group-hover:scale-110"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </a>
      </div>
    </aside>
  );
};
