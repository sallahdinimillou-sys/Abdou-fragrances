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
    <div className="w-full border-y border-[#D9D1C5] py-3 sm:py-4 overflow-hidden bg-[#F4EFE7] select-none">
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Render twice for continuous loop */}
        {[...notes, ...notes].map((note, index) => (
          <div key={index} className="flex items-center mx-6 sm:mx-8">
            <span className="text-[11px] sm:text-xs uppercase tracking-editorial text-[#14110F]/80 font-light">
              {note}
            </span>
            <span className="mx-6 sm:mx-8 text-[#A68A5B] text-xs">·</span>
          </div>
        ))}
      </div>
    </div>
  );
};
