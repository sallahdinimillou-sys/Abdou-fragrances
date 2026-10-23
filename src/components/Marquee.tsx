import React from 'react';

export const Marquee: React.FC = () => {
  const notes = [
    "Oud Assam 1984",
    "Livraison dans tout le Maroc",
    "Rose de Mai de Grasse",
    "Ambre Gris Marin",
    "Musc Impérial",
    "Vétiver d'Haïti",
    "Livraison dans tout le Maroc",
    "Safran Rouge de Perse",
    "Santal de Mysore",
    "Encens Royal d'Oman",
    "Iris Pallida de Florence",
    "Fleur d'Oranger Sauvage"
  ];

  return (
    <div className="w-full border-y border-[#C5A880]/30 py-3 sm:py-3.5 overflow-hidden bg-[#14110F] text-[#F4EFE7] select-none shadow-md">
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Render twice for continuous loop */}
        {[...notes, ...notes].map((note, index) => (
          <div key={index} className="flex items-center mx-5 sm:mx-8">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-editorial text-[#EAE4DC]/90 font-light">
              {note}
            </span>
            <span className="mx-5 sm:mx-8 text-[#C5A880] text-xs">◆</span>
          </div>
        ))}
      </div>
    </div>
  );
};
