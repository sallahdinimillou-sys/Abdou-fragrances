import React, { useRef } from 'react';
import { CategoryItem } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CategoryBarProps {
  categories: CategoryItem[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  categoryCounts: Record<string, number>;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  categoryCounts
}) => {
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full border-b border-[#D9D1C5] mb-8 pb-1">
      <div
        ref={scrollRef}
        className="flex items-center gap-6 sm:gap-8 md:gap-10 overflow-x-auto hide-scrollbar py-2 px-1 text-xs sm:text-sm tracking-editorial uppercase select-none"
      >
        {categories.map((cat, index) => {
          const isActive = activeCategoryId === cat.id;
          const label = cat.name[language] || cat.name.fr || cat.id;
          const count = categoryCounts[cat.id] ?? 0;

          return (
            <React.Fragment key={cat.id}>
              <button
                onClick={() => onSelectCategory(cat.id)}
                className={`group relative py-2 whitespace-nowrap cursor-pointer transition-colors duration-200 min-h-[44px] flex items-center gap-1.5 ${
                  isActive
                    ? 'text-[#14110F] font-semibold'
                    : 'text-[#8C857B] hover:text-[#14110F]'
                }`}
              >
                <span>{label}</span>
                {isActive && (
                  <span className="text-[11px] font-normal text-[#5A1A24]">
                    ({count})
                  </span>
                )}
                {/* Thin underline on active tab */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#14110F] transition-all" />
                )}
              </button>

              {/* Minimal dot separator (not between last item) */}
              {index < categories.length - 1 && (
                <span className="text-[#D9D1C5] text-xs pointer-events-none select-none">
                  ·
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
