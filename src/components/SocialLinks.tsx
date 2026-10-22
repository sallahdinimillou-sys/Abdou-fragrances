import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export interface SocialLinksProps {
  variant?: 'dark' | 'light';
  showHeading?: boolean;
  showHandle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  align?: 'center' | 'start' | 'end';
}

export const SOCIAL_ACCOUNTS = [
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@abdou_fragrances',
    url: 'https://www.instagram.com/abdou_fragrances',
    ariaLabel: 'Instagram ABDOU FRAGRANCES (@abdou_fragrances)',
    icon: (
      <svg
        className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.4] transition-transform duration-300 group-hover:scale-105"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    )
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@abdou_fragrances',
    url: 'https://www.tiktok.com/@abdou_fragrances',
    ariaLabel: 'TikTok ABDOU FRAGRANCES (@abdou_fragrances)',
    icon: (
      <svg
        className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.4] transition-transform duration-300 group-hover:scale-105"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
      </svg>
    )
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'ABDOU FRAGRANCES',
    url: 'https://www.facebook.com/share/16SUgcf5qeq/',
    ariaLabel: 'Facebook ABDOU FRAGRANCES',
    icon: (
      <svg
        className="w-[19px] h-[19px] stroke-current fill-none stroke-[1.4] transition-transform duration-300 group-hover:scale-105"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    )
  }
];

export const SocialLinks: React.FC<SocialLinksProps> = ({
  variant = 'dark',
  showHeading = false,
  showHandle = false,
  size = 'md',
  className = '',
  align = 'center'
}) => {
  const { language } = useLanguage();

  const alignClasses = {
    center: 'items-center text-center justify-center',
    start: 'items-start text-left rtl:text-right justify-start',
    end: 'items-end text-right rtl:text-left justify-end'
  }[align];

  // Button sizes with minimum 44px touch targets on mobile
  const buttonDimensions = {
    sm: 'w-10 h-10 min-w-[40px] min-h-[40px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px]',
    md: 'w-11 h-11 min-w-[44px] min-h-[44px]',
    lg: 'w-12 h-12 min-w-[48px] min-h-[48px]'
  }[size];

  // Theme styling for dark surface (footer/overlay) vs light surface (header)
  const isDark = variant === 'dark';
  const buttonStyle = isDark
    ? 'border border-[#A68A5B]/30 text-[#A68A5B] bg-[#14110F]/60 hover:text-[#F4EFE7] hover:border-[#A68A5B] hover:bg-[#A68A5B]/15 hover:shadow-[0_4px_16px_rgba(166,138,91,0.22)]'
    : 'border border-[#D9D1C5] text-[#14110F] bg-transparent hover:text-[#A68A5B] hover:border-[#A68A5B] hover:bg-[#A68A5B]/10 hover:shadow-[0_2px_8px_rgba(166,138,91,0.15)]';

  return (
    <div className={`flex flex-col ${alignClasses} ${className}`}>
      {showHeading && (
        <div className="mb-3 space-y-0.5">
          <p
            className={`font-display text-base sm:text-lg tracking-wide ${
              isDark ? 'text-[#F4EFE7]/90' : 'text-[#14110F]'
            }`}
          >
            {language === 'ar' ? 'تابعونا على وسائل التواصل' : 'Suivez la Maison'}
          </p>
          {showHandle && (
            <p className="text-[11px] tracking-editorial uppercase text-[#A68A5B] font-light">
              @abdou_fragrances
            </p>
          )}
        </div>
      )}

      <div className={`flex items-center gap-3 sm:gap-4 ${alignClasses}`}>
        {SOCIAL_ACCOUNTS.map((account) => (
          <a
            key={account.id}
            href={account.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={account.ariaLabel}
            className={`group rounded-full flex items-center justify-center transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${buttonDimensions} ${buttonStyle}`}
          >
            {account.icon}
          </a>
        ))}
      </div>
    </div>
  );
};
