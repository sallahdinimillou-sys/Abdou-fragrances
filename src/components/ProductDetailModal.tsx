import React, { useState } from 'react';
import { Product, SizeOption, formatPrice, getCategoryLabel, isProductInStock, getProductDisplayImage, NEUTRAL_PLACEHOLDER_IMAGE } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { CloseButton } from './CloseButton';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { language, t } = useLanguage();
  const { addToCart, settings, openOrderModal } = useCart();

  // Selected size option
  const availableOption = product?.sizes.find((s) => s.inStock) || product?.sizes[0];
  const [selectedSize, setSelectedSize] = useState<SizeOption | undefined>(availableOption);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Update selected size when product changes
  React.useEffect(() => {
    if (product && product.sizes.length > 0) {
      setSelectedSize(product.sizes.find((s) => s.inStock) || product.sizes[0]);
    }
  }, [product]);

  if (!product) return null;

  const currentOption = selectedSize || product.sizes[0] || { id: 'default', label: 'Flacon', price: 0, inStock: true };
  const currentPrice = currentOption.price;
  const productOverallInStock = isProductInStock(product);
  const isCurrentInStock = currentOption.inStock && productOverallInStock;

  const title = product.name?.fr || (typeof product.name === 'string' ? product.name : '');
  const desc = product.description?.fr || '';
  const categoryLabel = getCategoryLabel(
    product.category || (product.collection as any),
    'fr',
    settings.customCategories
  );

  const handleCommander = () => {
    openOrderModal({ product, sizeOption: currentOption, quantity: 1 });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#14110F]/70 flex justify-center items-start p-0 sm:p-6 md:p-10 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-5xl bg-[#F4EFE7] border border-[#D9D1C5] min-h-screen sm:min-h-0 sm:my-8 shadow-2xl">
        {/* Top Header with Close */}
        <div className="sticky top-0 z-20 bg-[#F4EFE7]/95 border-b border-[#D9D1C5] px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] sm:text-xs tracking-wider uppercase text-[#5A1A24] font-medium">
              {categoryLabel}
            </span>
          </div>

          {/* Unified X close button (Requirement 1) */}
          <CloseButton onClick={onClose} ariaLabel="Close" />
        </div>

        {/* Split Layout: Gallery on Left, Details on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-6 border-b lg:border-b-0 lg:border-r border-[#D9D1C5] p-6 sm:p-10 bg-[#EAE4DC] flex flex-col justify-between">
            <div className="w-full aspect-[3/4] min-h-[260px] overflow-hidden bg-[#E1D9CE] border border-[#D9D1C5] relative">
              <img
                src={getProductDisplayImage(product)}
                alt={`${title} — Flacon et détails du parfum Abdou Fragrances`}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover object-center transition-all duration-500"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = NEUTRAL_PLACEHOLDER_IMAGE;
                }}
              />

              {!productOverallInStock && (
                <div className="absolute top-4 left-4 bg-[#5A1A24] text-[#F4EFE7] text-[10px] tracking-editorial uppercase px-3 py-1">
                  {language === 'ar' ? 'نفدت الكمية' : 'Épuisé'}
                </div>
              )}
            </div>

            {/* Thumbnail Selectors if multiple images exist */}
            {product.images.length > 1 && (
              <div className="flex gap-3 mt-4">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 border overflow-hidden cursor-pointer ${
                      activeImageIndex === idx ? 'border-[#5A1A24]' : 'border-[#D9D1C5]'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${title} — Vue miniature ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = NEUTRAL_PLACEHOLDER_IMAGE;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details & Description */}
          <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between space-y-8 pb-32 lg:pb-10">
            {/* Title & Price Header */}
            <div>
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <span className="text-[10px] tracking-editorial uppercase text-[#8C857B] font-medium">
                  {categoryLabel}
                </span>
                <span className="font-body text-xl sm:text-2xl text-[#14110F] font-semibold">
                  {formatPrice(currentPrice, 'fr')}
                </span>
              </div>

              <h2 className="font-display text-2xl sm:text-4xl text-[#14110F] leading-tight font-medium">
                {title}
              </h2>

              <p className="text-xs text-[#8C857B] mt-2 font-light">
                {isCurrentInStock ? 'En stock' : 'Épuisé'}
              </p>
            </div>

            {/* Quantity / Decant Option Selector */}
            <div className="space-y-3">
              <label className="text-[10px] tracking-editorial uppercase text-[#14110F] block">
                {t('selectQuantity')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {product.sizes.map((s) => {
                  const isSelected = selectedSize?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      disabled={!s.inStock}
                      onClick={() => setSelectedSize(s)}
                      className={`min-h-[50px] p-2 border text-xs tracking-editorial uppercase font-medium cursor-pointer transition-colors text-center ${
                        isSelected
                          ? 'border-[#14110F] bg-[#14110F] text-[#F4EFE7]'
                          : s.inStock
                          ? 'border-[#D9D1C5] bg-[#F4EFE7] text-[#14110F] hover:border-[#14110F]'
                          : 'border-[#D9D1C5]/40 bg-[#EAE4DC]/50 text-[#8C857B] line-through cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span className="block truncate">{s.label}</span>
                      <span className="block text-[10px] opacity-80 mt-0.5 font-light">
                        {s.inStock ? formatPrice(s.price, 'fr') : 'Épuisé'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Desktop Actions */}
            <div className="hidden lg:flex flex-row items-center gap-4 pt-2">
              <button
                disabled={!isCurrentInStock}
                onClick={() => selectedSize && addToCart(product, selectedSize, 1)}
                className="btn-primary-wipe h-[54px] px-8 text-xs tracking-editorial uppercase font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {t('addToBag')}
              </button>

              <button
                type="button"
                disabled={!isCurrentInStock}
                onClick={handleCommander}
                className="btn-whatsapp-outline hover:!bg-[#25D366] hover:!border-[#25D366] hover:!text-white h-[54px] px-8 flex items-center justify-center gap-3 text-xs tracking-editorial uppercase font-medium transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 stroke-current fill-none stroke-[1.2]" viewBox="0 0 24 24">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>Commander</span>
              </button>
            </div>

            {/* Simple Description Text Block under size selector (Comfortable line-height, no accordion) */}
            <div className="pt-4 border-t border-[#D9D1C5] space-y-2">
              <span className="text-[10px] tracking-editorial uppercase text-[#14110F] block font-medium">
                Description
              </span>
              <p className="text-sm sm:text-base font-light text-[#14110F]/90 leading-relaxed whitespace-pre-line">
                {desc}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom Action Bar with WhatsApp Green Hover */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#F4EFE7] border-t border-[#D9D1C5] p-3 grid grid-cols-2 gap-3 shadow-lg">
          <button
            disabled={!isCurrentInStock}
            onClick={() => selectedSize && addToCart(product, selectedSize, 1)}
            className="btn-primary-wipe h-[50px] text-[11px] tracking-editorial uppercase font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
          >
            {t('addToBag')}
          </button>

          <button
            type="button"
            disabled={!isCurrentInStock}
            onClick={handleCommander}
            className="btn-whatsapp-outline hover:!bg-[#25D366] hover:!border-[#25D366] hover:!text-white h-[50px] flex items-center justify-center gap-2 text-[11px] tracking-editorial uppercase font-medium transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.2]" viewBox="0 0 24 24">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>Commander</span>
          </button>
        </div>
      </div>
    </div>
  );
};
