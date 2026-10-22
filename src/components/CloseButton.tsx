import React from 'react';

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export const CloseButton: React.FC<CloseButtonProps> = ({
  onClick,
  className = '',
  ariaLabel = 'Close',
  variant = 'dark',
  size = 'md'
}) => {
  const colorClasses =
    variant === 'light'
      ? 'text-[#F4EFE7] hover:text-[#C5A880] border-transparent'
      : 'text-[#14110F] hover:text-[#5A1A24] border-transparent';

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center transition-all duration-200 cursor-pointer select-none group p-2.5 ${colorClasses} ${className}`}
    >
      <svg
        className={`${iconSizes[size]} stroke-current transition-transform duration-200 group-hover:scale-110 group-active:scale-95`}
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
};
