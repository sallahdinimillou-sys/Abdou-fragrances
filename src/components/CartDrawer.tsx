import React, { useState, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import {
  formatPrice,
  getCategoryLabel,
  getProductDisplayImage,
  DEFAULT_DELIVERY_FEE,
  GUELMIM_DELIVERY_FEE,
  isGuelmimCity,
  getDeliveryFee
} from '../types';
import { CloseButton } from './CloseButton';

// Moroccan major cities list for fast selection
const MOROCCAN_CITIES = [
  'كلميم (Guelmim)',
  'الدار البيضاء (Casablanca)',
  'الرباط (Rabat)',
  'مراكش (Marrakech)',
  'أكادير (Agadir)',
  'طنجة (Tanger)',
  'فاس (Fès)',
  'مكناس (Meknès)',
  'وجدة (Oujda)',
  'القنيطرة (Kénitra)',
  'تطوان (Tétouan)',
  'تمارة (Témara)',
  'سلا (Salé)',
  'المحمدية (Mohammédia)',
  'العيون (Laâyoune)',
  'الداخلة (Dakhla)',
  'طانطان (Tan-Tan)',
  'سيدي إفني (Sidi Ifni)',
  'تيزنيت (Tiznit)',
  'تارودانت (Taroudant)',
  'الجديدة (El Jadida)',
  'آسفي (Safi)',
  'الصويرة (Essaouira)',
  'بني ملال (Béni Mellal)',
  'خريبكة (Khouribga)',
  'الناظور (Nador)',
  'الحسيمة (Al Hoceïma)',
  'برشيد (Berrechid)',
  'ورزازات (Ouarzazate)',
  'الراشيدية (Errachidia)'
];

export const CartDrawer: React.FC = () => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    isCartOpen,
    setIsCartOpen,
    subtotal,
    settings
  } = useCart();
  const { t, language } = useLanguage();

  // Step 1: 'cart' view, Step 2: 'order-form' customer details view
  const [currentStep, setCurrentStep] = useState<'cart' | 'order-form'>('cart');

  // Customer Details (Requirement 4) - 4 fields in exact order:
  // 1. الاسم (Full name)
  // 2. المدينة (City)
  // 3. العنوان (Address)
  // 4. رقم الهاتف (Phone number)
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  // Form errors
  const [formErrors, setFormErrors] = useState<{
    fullName?: string;
    city?: string;
    address?: string;
    phone?: string;
  }>({});

  // Reset or return to previous step when X is tapped
  const handleClose = () => {
    if (currentStep === 'order-form') {
      setCurrentStep('cart');
      return;
    }
    setIsCartOpen(false);
    setTimeout(() => {
      setCurrentStep('cart');
      setFormErrors({});
    }, 200);
  };

  // Requirement 5: Delivery fee calculation
  // Delivery fee is charged ONCE PER ORDER, never per product or quantity!
  // Guelmim = 10 DH, Any other city = 35 DH
  const isGuelmim = useMemo(() => isGuelmimCity(city), [city]);
  const deliveryFee = useMemo(() => {
    if (!city.trim()) {
      return DEFAULT_DELIVERY_FEE;
    }
    return getDeliveryFee(city);
  }, [city]);

  // TOTAL = sum of (price x quantity) + deliveryFee (once)
  const finalTotal = subtotal + deliveryFee;

  // Moroccan phone number validator: 10 digits starting with 06, 07, or 05 (or international format)
  const validatePhone = (num: string): boolean => {
    const cleanNum = num.replace(/[\s\-\.\(\)]/g, '');
    const moroccanRegex = /^(?:(?:\+?212)|0)[5-7]\d{8}$/;
    return moroccanRegex.test(cleanNum);
  };

  const handleProceedToForm = () => {
    if (cart.length === 0) return;
    setCurrentStep('order-form');
    setFormErrors({});
  };

  const handleSendWhatsAppOrder = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: typeof formErrors = {};

    if (!fullName.trim()) {
      errors.fullName = language === 'ar' ? 'يرجى إدخال الاسم الكامل' : 'Veuillez saisir votre nom complet';
    }

    if (!city.trim()) {
      errors.city = language === 'ar' ? 'يرجى إدخال اسم المدينة' : 'Veuillez saisir votre ville';
    }

    if (!address.trim()) {
      errors.address = language === 'ar' ? 'يرجى إدخال عنوان التوصيل بالتفصيل' : 'Veuillez saisir votre adresse';
    }

    if (!phone.trim()) {
      errors.phone = language === 'ar' ? 'يرجى إدخال رقم الهاتف' : 'Veuillez saisir votre numéro de téléphone';
    } else if (!validatePhone(phone)) {
      errors.phone =
        language === 'ar'
          ? 'يرجى إدخال رقم هاتف مغربي صحيح (مثال: 0603288119 أو 0712345678)'
          : 'Numéro de téléphone marocain invalide (ex: 0603288119)';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Format well-organized invoice ("la facture") message in Arabic (Requirement 4)
    const formattedDate = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsInvoice = cart
      .map(
        (item, idx) =>
          `${idx + 1}. *${item.product.name.ar || item.product.name.fr}*\n   الحجم: ${item.selectedSize.label} | الكمية: ${item.quantity} | السعر: ${formatPrice(item.unitPrice * item.quantity, 'ar')}`
      )
      .join('\n\n');

    const cleanCityName = city.replace(/\(.*\)/, '').trim();

    const invoiceMessage = `*طلب جديد عبر الموقع — Abdou Fragrances* 🛍️\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 *معلومات الزبون :*\n` +
      `• *الاسم الكامل :* ${fullName.trim()}\n` +
      `• *المدينة :* ${cleanCityName} ${isGuelmim ? '(توصيل كلميم)' : ''}\n` +
      `• *العنوان :* ${address.trim()}\n` +
      `• *رقم الهاتف :* ${phone.trim()}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📦 *قائمة المنتجات :*\n\n` +
      `${itemsInvoice}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 *تفاصيل الفاتورة :*\n` +
      `• *مجموع المنتجات :* ${formatPrice(subtotal, 'ar')}\n` +
      `• *مصاريف التوصيل (مرة واحدة للطلب) :* ${formatPrice(deliveryFee, 'ar')} (${isGuelmim ? 'كلميم' : 'كافة مدن المغرب'})\n` +
      `• *المجموع الإجمالي المؤدى :* *${formatPrice(finalTotal, 'ar')}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📅 *تاريخ الطلب :* ${formattedDate}\n\n` +
      `يرجى تأكيد الطلب للبدء في تجهيز الشحنة. شكراً لاختياركم Abdou Fragrances! ✨`;

    const targetPhone = settings.whatsappNumber || '212603288119';
    const cleanWhatsApp = targetPhone.replace(/[^0-9]/g, '');
    const finalWhatsAppUrl = `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(invoiceMessage)}`;

    // Open WhatsApp in new tab
    window.open(finalWhatsAppUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isCartOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-[#14110F]/60 flex justify-end rtl:justify-start transition-opacity animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full md:w-[460px] md:max-w-[460px] bg-[#F4EFE7] h-full shadow-2xl flex flex-col justify-between border-l rtl:border-l-0 rtl:border-r border-[#D9D1C5]">
        
        {/* Header with Unified "X" Close Icon (Requirement 1) */}
        <div className="p-4 sm:p-5 border-b border-[#D9D1C5] flex items-center justify-between bg-[#F4EFE7]">
          <div className="flex items-center gap-3">
            <img
              src="/logo-v2.png"
              alt="ABDOU FRAGRANCES"
              width={38}
              height={38}
              className="w-[38px] h-[38px] object-contain flex-shrink-0"
            />
            <div>
              <span className="text-[11px] font-medium uppercase text-[#5A1A24] block mb-0.5 tracking-wider">
                ABDOU FRAGRANCES
              </span>
              <h3 className="font-display text-xl sm:text-2xl text-[#14110F]">
                {currentStep === 'cart'
                  ? (language === 'ar' ? 'حقيبة التسوق' : 'Votre Panier')
                  : (language === 'ar' ? 'معلومات الزبون والفاتورة' : 'Informations de Commande')}
              </h3>
            </div>
          </div>

          {/* Unified X Close Button (Requirement 1) */}
          <CloseButton onClick={handleClose} ariaLabel="Close" />
        </div>

        {/* STEP 1: CART ITEMS VIEW */}
        {currentStep === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {cart.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <img
                    src="/logo-v2.png"
                    alt="ABDOU FRAGRANCES"
                    width={64}
                    height={64}
                    className="w-16 h-16 object-contain mx-auto opacity-80"
                  />
                  <p className="font-display text-xl text-[#14110F]">
                    {language === 'ar' ? 'حقيبتك فارغة' : 'Votre Panier est Vide'}
                  </p>
                  <p className="text-xs text-[#8C857B] font-light leading-relaxed max-w-xs mx-auto">
                    {t('emptyBag')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 divide-y divide-[#D9D1C5]">
                  {cart.map((item) => {
                    const prodName = item.product.name[language] || item.product.name.fr;
                    return (
                      <div
                        key={`${item.product.id}-${item.selectedSize.id}`}
                        className="pt-4 first:pt-0 flex gap-3 sm:gap-4 items-center"
                      >
                        {/* Thumbnail */}
                        <div className="w-16 h-20 bg-[#EAE4DC] border border-[#D9D1C5] overflow-hidden flex-shrink-0">
                          <img
                            src={getProductDisplayImage(item.product)}
                            alt={prodName}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info & Quantity */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-[#8C857B] block truncate font-medium">
                            {getCategoryLabel(item.product.category || (item.product.collection as any), language, settings.customCategories)}
                          </span>
                          <h4 className="font-display text-sm text-[#14110F] truncate">
                            {prodName}
                          </h4>
                          <p className="text-xs text-[#5A1A24] font-medium">
                            {item.selectedSize.label} · {formatPrice(item.unitPrice, language)}
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex items-center border border-[#D9D1C5]">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.selectedSize.id, -1)}
                                className="w-6 h-6 flex items-center justify-center text-xs text-[#14110F] hover:bg-[#D9D1C5]/30 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-xs font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.selectedSize.id, 1)}
                                className="w-6 h-6 flex items-center justify-center text-xs text-[#14110F] hover:bg-[#D9D1C5]/30 cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.product.id, item.selectedSize.id)}
                              className="text-[10px] uppercase tracking-wider text-[#8C857B] hover:text-[#5A1A24] cursor-pointer"
                            >
                              {t('remove')}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Summary Bar with Subtotal and Proceed Button */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-6 border-t border-[#D9D1C5] bg-[#EAE4DC]/40 space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-wider text-[#8C857B]">
                    {language === 'ar' ? 'مجموع المنتجات' : 'Sous-total'}
                  </span>
                  <span className="font-display text-2xl text-[#14110F] font-semibold">
                    {formatPrice(subtotal, language)}
                  </span>
                </div>

                <div className="text-[11px] text-[#8C857B] font-light flex items-center justify-between border-t border-[#D9D1C5]/60 pt-2">
                  <span>{language === 'ar' ? 'رسوم التوصيل (مرة واحدة للطلب) :' : 'Frais de livraison :'}</span>
                  <span className="font-medium text-[#14110F]">
                    {language === 'ar' ? '10 درهم (كلميم) / 35 درهم (باقي المدن)' : '10 DH (Guelmim) / 35 DH (Maroc)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToForm}
                  className="btn-primary-wipe w-full h-[52px] flex items-center justify-center gap-2 text-xs tracking-wider uppercase font-medium cursor-pointer shadow-md"
                >
                  <span>{language === 'ar' ? 'متابعة وإدخال معلومات التوصيل' : 'Continuer la commande'}</span>
                  <span className="text-sm rtl:rotate-180">→</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: CUSTOMER DETAILS ORDER FORM (Requirement 4 & 5) */}
        {currentStep === 'order-form' && (
          <form onSubmit={handleSendWhatsAppOrder} className="flex-1 flex flex-col justify-between overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              
              {/* Header with step label and X back button */}
              <div className="flex items-center justify-between pb-2 border-b border-[#D9D1C5]/60">
                <span className="text-xs uppercase tracking-wider text-[#5A1A24] font-medium">
                  {language === 'ar' ? 'خطوة إتمام الطلب' : 'Finalisation de commande'}
                </span>
                <CloseButton
                  onClick={() => setCurrentStep('cart')}
                  size="sm"
                  ariaLabel="Close"
                />
              </div>

              {/* Notice in Arabic */}
              <div className="bg-[#EAE4DC] p-3 text-xs text-[#14110F] leading-relaxed border border-[#D9D1C5]">
                {language === 'ar'
                  ? 'يرجى إدخال معلومات التوصيل ليتم تجهيز فاتورة طلبكم وإرسالها مباشرةً عبر واتساب.'
                  : 'Veuillez renseigner vos coordonnées pour transmettre votre facture sur WhatsApp.'}
              </div>

              {/* 1. الاسم (Full Name) */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#14110F] block mb-1 font-medium">
                  1. {language === 'ar' ? 'الاسم الكامل' : 'Nom & Prénom'} *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  placeholder={language === 'ar' ? 'مثال: محمد العمري' : 'Ex: Mohammed Alami'}
                  className={`w-full bg-[#F4EFE7] border px-3 py-2.5 text-xs text-[#14110F] focus:outline-none transition-colors ${
                    formErrors.fullName ? 'border-red-500' : 'border-[#D9D1C5] focus:border-[#14110F]'
                  }`}
                />
                {formErrors.fullName && (
                  <p className="text-[10px] text-red-600 mt-1">{formErrors.fullName}</p>
                )}
              </div>

              {/* 2. المدينة (City) */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#14110F] block mb-1 font-medium">
                  2. {language === 'ar' ? 'المدينة' : 'Ville'} *
                </label>
                <input
                  type="text"
                  required
                  list="moroccan-cities-list"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (formErrors.city) setFormErrors((prev) => ({ ...prev, city: undefined }));
                  }}
                  placeholder={language === 'ar' ? 'اكتب اسم مدينتك أو اخترها (مثال: كلميم)' : 'Votre ville (ex: Guelmim)'}
                  className={`w-full bg-[#F4EFE7] border px-3 py-2.5 text-xs text-[#14110F] focus:outline-none transition-colors ${
                    formErrors.city ? 'border-red-500' : 'border-[#D9D1C5] focus:border-[#14110F]'
                  }`}
                />
                <datalist id="moroccan-cities-list">
                  {MOROCCAN_CITIES.map((c, idx) => (
                    <option key={idx} value={c} />
                  ))}
                </datalist>

                {formErrors.city && (
                  <p className="text-[10px] text-red-600 mt-1">{formErrors.city}</p>
                )}

                {/* Instant Delivery fee feedback based on City */}
                {city.trim() && (
                  <div className="mt-1.5 text-[11px] text-[#5A1A24] font-medium flex items-center gap-1">
                    <span>✓</span>
                    <span>
                      {isGuelmim
                        ? (language === 'ar' ? 'توصيل محلي في كلميم: 10 درهم فقط' : 'Livraison locale à Guelmim : 10 DH')
                        : (language === 'ar' ? `توصيل إلى ${city.replace(/\(.*\)/, '').trim()} : 35 درهم (مرة واحدة للطلب)` : `Livraison : 35 DH`)}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. العنوان (Address) */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#14110F] block mb-1 font-medium">
                  3. {language === 'ar' ? 'العنوان بالتفصيل' : 'Adresse complète'} *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  placeholder={language === 'ar' ? 'الحي، الشارع، أو رقم المنزل' : 'Quartier, rue, numéro'}
                  className={`w-full bg-[#F4EFE7] border px-3 py-2.5 text-xs text-[#14110F] focus:outline-none transition-colors ${
                    formErrors.address ? 'border-red-500' : 'border-[#D9D1C5] focus:border-[#14110F]'
                  }`}
                />
                {formErrors.address && (
                  <p className="text-[10px] text-red-600 mt-1">{formErrors.address}</p>
                )}
              </div>

              {/* 4. رقم الهاتف (Phone Number) */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#14110F] block mb-1 font-medium">
                  4. {language === 'ar' ? 'رقم الهاتف' : 'Numéro de téléphone'} *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="06 03 28 81 19"
                  className={`w-full bg-[#F4EFE7] border px-3 py-2.5 text-xs text-[#14110F] focus:outline-none transition-colors ${
                    formErrors.phone ? 'border-red-500' : 'border-[#D9D1C5] focus:border-[#14110F]'
                  }`}
                />
                {formErrors.phone && (
                  <p className="text-[10px] text-red-600 mt-1">{formErrors.phone}</p>
                )}
              </div>

              {/* Live Invoice Breakdown (Requirement 5) */}
              <div className="mt-4 pt-3 border-t border-[#D9D1C5] space-y-2 bg-[#EAE4DC]/50 p-3.5">
                <div className="flex justify-between text-xs text-[#8C857B]">
                  <span>{language === 'ar' ? 'مجموع المنتجات :' : 'Sous-total produits :'}</span>
                  <span className="font-medium text-[#14110F]">{formatPrice(subtotal, language)}</span>
                </div>

                <div className="flex justify-between text-xs text-[#8C857B]">
                  <span>
                    {language === 'ar'
                      ? `رسوم التوصيل (${isGuelmim ? 'كلميم' : 'المغرب'} - مرة واحدة) :`
                      : `Frais de livraison (${isGuelmim ? 'Guelmim' : 'Maroc'}) :`}
                  </span>
                  <span className="font-semibold text-[#5A1A24]">
                    {formatPrice(deliveryFee, language)}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-bold text-[#14110F] border-t border-[#D9D1C5] pt-2">
                  <span>{language === 'ar' ? 'المجموع النهائي المؤدى :' : 'TOTAL À PAYER :'}</span>
                  <span className="text-base text-[#5A1A24]">
                    {formatPrice(finalTotal, language)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Submit Button */}
            <div className="p-4 sm:p-6 border-t border-[#D9D1C5] bg-[#EAE4DC]/40">
              <button
                type="submit"
                className="btn-primary-wipe w-full h-[54px] flex items-center justify-center gap-3 text-xs tracking-wider uppercase font-medium cursor-pointer shadow-lg"
              >
                <svg className="w-4 h-4 stroke-current fill-none stroke-[1.2]" viewBox="0 0 24 24">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>{language === 'ar' ? 'إرسال الطلب والفاتورة عبر واتساب' : 'Envoyer la commande via WhatsApp'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
