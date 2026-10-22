import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export const Testimonials: React.FC = () => {
  const { t, language } = useLanguage();

  const reviews = [
    {
      quote: {
        fr: "Livraison ultra rapide à Casablanca et flacon parfaitement emballé. Un parfum 100% authentique avec une tenue impressionnante toute la journée.",
        ar: "توصيل سريع جداً في الدار البيضاء وتغليف أنيق ومحكم. العطر أصلي ١٠٠٪ وثباته يدوم طيلة اليوم."
      },
      name: "Youssef B.",
      city: {
        fr: "Casablanca",
        ar: "الدار البيضاء"
      }
    },
    {
      quote: {
        fr: "J'ai commandé deux décants pour tester avant le grand flacon. Le service client sur WhatsApp est irréprochable et les essences sont sublimes.",
        ar: "طلبت عينتين للتجربة قبل شراء الزجاجة الكبيرة. خدمة الزبناء عبر واتساب في غاية الاحترافية والجودة رائعة."
      },
      name: "Salma E.",
      city: {
        fr: "Rabat",
        ar: "الرباط"
      }
    },
    {
      quote: {
        fr: "Authenticité irréprochable et sillage remarquable. On sent immédiatement la qualité noble des ingrédients dès la première vaporisation.",
        ar: "عطور أصلية ومضمونة وفوحان ممتاز. جودة المكونات تظهر بوضوح من أول رشة."
      },
      name: "Hamza K.",
      city: {
        fr: "Marrakech",
        ar: "مراكش"
      }
    },
    {
      quote: {
        fr: "Reçu à Tanger en 24h. Le packaging est raffiné et soigné dans les moindres détails, idéal pour offrir.",
        ar: "وصلني الطلب إلى طنجة خلال ٢٤ ساعة. التغليف راقٍ وفخم ومناسب جداً للهدايا."
      },
      name: "Khadija M.",
      city: {
        fr: "Tanger",
        ar: "طنجة"
      }
    },
    {
      quote: {
        fr: "La tenue des parfums est exceptionnelle, même après une longue journée. C'est devenu ma parfumerie de référence au Maroc.",
        ar: "ثبات العطر ممتاز حتى بعد يوم عمل طويل. أصبحت وجهتي الأولى للعطور في المغرب."
      },
      name: "Anas R.",
      city: {
        fr: "Fès",
        ar: "فاس"
      }
    },
    {
      quote: {
        fr: "Conseils très personnalisés sur WhatsApp et expédition soignée vers Agadir. Une expérience d'achat d'un grand professionnalisme.",
        ar: "نصائح دقيقة وتوجيه ممتاز عبر واتساب مع شحن متقن إلى أكادير. تجربة تسوق راقية واحترافية."
      },
      name: "Imane L.",
      city: {
        fr: "Agadir",
        ar: "أكادير"
      }
    }
  ];

  return (
    <section className="py-20 sm:py-28 bg-[#F4EFE7] border-b border-[#D9D1C5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="mb-14 text-center">
          <span className="text-[10px] sm:text-xs font-medium tracking-editorial uppercase text-[#5A1A24] block mb-2">
            {language === 'ar' ? 'تجارب زبنائنا' : 'Avis Vérifiés'}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl text-[#14110F]">
            {t('testimonialsTitle')}
          </h2>
        </div>

        {/* Minimal Typographic Layout — 6 authentic reviews from Moroccan cities, no stars, no cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14">
          {reviews.map((item, index) => (
            <div
              key={index}
              className="flex flex-col justify-between border-t border-[#D9D1C5] pt-6 space-y-5"
            >
              <blockquote
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                lang={language === 'ar' ? 'ar' : 'fr'}
                className="font-display text-base sm:text-lg text-[#14110F] leading-snug"
              >
                « {item.quote[language] || item.quote.fr} »
              </blockquote>

              <div className="pt-1">
                <p className="text-xs tracking-editorial uppercase text-[#14110F] font-semibold">
                  {item.name}
                </p>
                <p className="text-[11px] text-[#8C857B] font-light">
                  {item.city[language] || item.city.fr}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
