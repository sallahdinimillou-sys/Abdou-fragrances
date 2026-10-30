import React, { useState } from 'react';

export const BrowserBlockScreen: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    if (!currentUrl) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        })
        .catch(() => fallbackCopy(currentUrl));
    } else {
      fallbackCopy(currentUrl);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {}
  };

  return (
    <div className="min-h-screen w-full bg-[#F4EFE7] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full flex flex-col items-center">
        {/* 1. Site logo on top */}
        <img
          src="/logo-v2.png"
          alt="ABDOU FRAGRANCES"
          width={96}
          height={96}
          className="w-24 h-24 object-contain mb-8 drop-shadow-sm"
        />

        {/* 2. French Message */}
        <h1 className="font-display text-xl sm:text-2xl text-[#14110F] font-medium leading-snug">
          Veuillez ouvrir ce site avec Google Chrome.
        </h1>

        {/* 3. Arabic Message below it */}
        <p dir="rtl" className="text-base sm:text-lg text-[#5A1A24] font-medium mt-3 font-sans">
          المرجو الدخول من جوجل كروم.
        </p>

        {/* 4. Site link as selectable text; tapping it copies it */}
        <div
          onClick={handleCopyLink}
          className="mt-8 w-full p-4 rounded-xl bg-[#EAE4DC]/80 border border-[#D9D1C5] hover:border-[#14110F]/40 transition-colors cursor-pointer text-center relative group"
        >
          <div className="text-xs sm:text-sm text-[#14110F] font-mono break-all select-all">
            {currentUrl}
          </div>

          <div className="mt-2 text-[11px] font-medium transition-colors">
            {copied ? (
              <span className="text-[#5A1A24] font-semibold animate-fadeIn">
                ✓ Lien copié
              </span>
            ) : (
              <span className="text-[#8C857B] group-hover:text-[#14110F]">
                Appuyez pour copier le lien
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
