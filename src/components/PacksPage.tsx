import React, { useEffect } from 'react';
import { Pack, PackCategory } from '../types';
import { PackCard } from './PackCard';
import { CloseButton } from './CloseButton';
import { useLanguage } from '../context/LanguageContext';

interface PacksPageProps {
  category: PackCategory;
  packs: Pack[];
  onClose: () => void;
}

export const PacksPage: React.FC<PacksPageProps> = ({
  category,
  packs,
  onClose
}) => {
  const { language } = useLanguage();

  // Scroll to top when page opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [category]);

  const categoryPacks = packs.filter((p) => p.isActive && p.category === category);

  const pageTitle =
    category === 'women'
      ? (language === 'ar' ? 'باكات النساء' : 'Packs Femme')
      : (language === 'ar' ? 'باكات الرجال' : 'Packs Homme');

  const pageSubtitle =
    category === 'women'
      ? (language === 'ar' ? 'تشكيلات وعروض حصرية خاصة بالسيدات' : 'Sélection raffinée de packs pour femme')
      : (language === 'ar' ? 'تشكيلات وعروض حصرية خاصة بالرجال' : 'Sélection prestigieuse de packs pour homme');

  return (
    <div className="min-h-screen bg-[#F4EFE7] pt-24 sm:pt-28 pb-20 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Top Header Bar with Page Title and "X" Close Icon in Corner */}
        <div className="flex items-center justify-between pb-6 mb-8 sm:mb-12 border-b border-[#D9D1C5]">
          <div>
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-[#5A1A24] block mb-1">
              Abdou Fragrances · {category === 'women' ? (language === 'ar' ? 'مجموعة السيدات' : 'Pour Femme') : (language === 'ar' ? 'مجموعة الرجال' : 'Pour Homme')}
            </span>
            <h1 className="font-display text-2xl sm:text-4xl text-[#14110F]">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-[#8C857B] font-light mt-1">
              {pageSubtitle}
            </p>
          </div>

          {/* Requirement 1 & 7: "X" icon in the top corner that closes the page */}
          <div className="flex items-center">
            <CloseButton
              onClick={onClose}
              ariaLabel={language === 'ar' ? 'إغلاق والعودة إلى الصفحة الرئيسية' : 'Fermer et retourner'}
              className="border border-[#D9D1C5] hover:border-[#14110F] bg-[#EAE4DC]/60"
            />
          </div>
        </div>

        {/* Packs Grid (Showing ONLY the chosen category packs) */}
        {categoryPacks.length === 0 ? (
          <div className="py-20 text-center border border-[#D9D1C5] bg-[#EAE4DC]/40 p-8 space-y-4">
            <p className="font-display text-xl text-[#14110F]">
              {language === 'ar' ? 'لا توجد باكات متوفرة حالياً' : 'Aucun pack disponible pour le moment'}
            </p>
            <p className="text-xs text-[#8C857B] font-light">
              {language === 'ar'
                ? 'يرجى مراجعة الموقع لاحقاً أو استكشاف باقي مجموعات العطور.'
                : 'Veuillez revenir bientôt ou explorer notre catalogue de parfums.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {categoryPacks.map((pack) => (
              <PackCard key={pack.id} pack={pack} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
