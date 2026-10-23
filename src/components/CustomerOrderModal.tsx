import React, { useState, useMemo, useEffect } from 'react';
import { CartItem, Product, SizeOption } from '../types';
import { CloseButton } from './CloseButton';

// Delivery fee constants (charged ONCE per order, never per product)
export const DEFAULT_DELIVERY_FEE = 35;
export const GUELMIM_DELIVERY_FEE = 10;

export interface OrderModalItem {
  product: Product;
  selectedSize: SizeOption;
  quantity: number;
  unitPrice: number;
}

interface CustomerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderModalItem[];
  whatsappNumber: string;
  onOrderSuccess?: () => void;
}

const MOROCCAN_CITIES = [
  'Guelmim',
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Agadir',
  'Tanger',
  'Fès',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Tétouan',
  'Témara',
  'Salé',
  'Mohammédia',
  'Laâyoune',
  'Dakhla',
  'Tan-Tan',
  'Sidi Ifni',
  'Tiznit',
  'Taroudant',
  'El Jadida',
  'Safi',
  'Essaouira',
  'Béni Mellal',
  'Khouribga',
  'Nador',
  'Al Hoceïma',
  'Berrechid',
  'Ouarzazate',
  'Errachidia'
];

/**
 * Normalizes city name to detect Guelmim in any spelling or language:
 * Guelmim, Guelmime, Goulimine, كلميم, قلميم, قليميم, Glimim, etc.
 * Ignores case, accents, and extra whitespace.
 */
function isGuelmimCity(city: string): boolean {
  if (!city || typeof city !== 'string') return false;
  const normalized = city
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '');

  const patterns = [
    'guelmim',
    'guelmime',
    'goulimine',
    'goulimin',
    'glimim',
    'golmim',
    'gulmim',
    'كلميم',
    'قلميم',
    'قليميم',
    'كليميم'
  ];

  return patterns.some((p) => normalized.includes(p));
}

// Moroccan phone number validator: 10 digits starting with 05, 06 or 07
function validateMoroccanPhone(num: string): boolean {
  const clean = num.replace(/[\s\-\.\(\)]/g, '');
  // Format 06XXXXXXXX, 07XXXXXXXX, 05XXXXXXXX or +2126XXXXXXXX / +2127XXXXXXXX / +2125XXXXXXXX
  const regex = /^(?:(?:\+?212)|0)[5-7]\d{8}$/;
  return regex.test(clean);
}

export const CustomerOrderModal: React.FC<CustomerOrderModalProps> = ({
  isOpen,
  onClose,
  items,
  whatsappNumber,
  onOrderSuccess
}) => {
  // 4 required fields in exact order:
  // 1. Nom complet
  // 2. Ville
  // 3. Adresse
  // 4. Téléphone
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const [formErrors, setFormErrors] = useState<{
    fullName?: string;
    city?: string;
    address?: string;
    phone?: string;
  }>({});

  // Reset errors when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormErrors({});
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Delivery fee calculation:
  // 10 DH for Guelmim (all spellings), 35 DH for other cities
  const isGuelmim = useMemo(() => isGuelmimCity(city), [city]);
  const deliveryFee = useMemo(() => {
    if (!city.trim()) return DEFAULT_DELIVERY_FEE;
    return isGuelmim ? GUELMIM_DELIVERY_FEE : DEFAULT_DELIVERY_FEE;
  }, [city, isGuelmim]);

  // Subtotal of products
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [items]);

  // TOTAL = subtotal + deliveryFee (charged once per order)
  const total = subtotal + deliveryFee;

  if (!isOpen || items.length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: typeof formErrors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Le nom complet est obligatoire.';
    }

    if (!city.trim()) {
      errors.city = 'La ville est obligatoire.';
    }

    if (!address.trim()) {
      errors.address = "L'adresse de livraison est obligatoire.";
    }

    if (!phone.trim()) {
      errors.phone = 'Le numéro de téléphone est obligatoire.';
    } else if (!validateMoroccanPhone(phone)) {
      errors.phone = 'Numéro invalide (10 chiffres commençant par 05, 06 ou 07). Ex: 0603288119';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Format invoice message in French
    const formattedDate = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsInvoice = items
      .map((item, idx) => {
        const prodName = item.product.name?.fr || (typeof item.product.name === 'string' ? item.product.name : 'Parfum');
        return `${idx + 1}. *${prodName}*\n   • Taille : ${item.selectedSize.label}\n   • Quantité : ${item.quantity}\n   • Prix : ${item.unitPrice * item.quantity} DH`;
      })
      .join('\n\n');

    const cleanCityName = city.replace(/\(.*\)/, '').trim();

    const invoiceMessage =
      `*COMMANDE & FACTURE — ABDOU FRAGRANCES*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Informations client :*\n` +
      `• Nom : ${fullName.trim()}\n` +
      `• Ville : ${cleanCityName} (${isGuelmim ? 'Guelmim' : 'Maroc'})\n` +
      `• Adresse : ${address.trim()}\n` +
      `• Téléphone : ${phone.trim()}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *Liste des produits :*\n\n` +
      `${itemsInvoice}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *Détails du règlement :*\n` +
      `• Sous-total : ${subtotal} DH\n` +
      `• Livraison : ${deliveryFee} DH (${isGuelmim ? 'Tarif local Guelmim' : 'Tarif Maroc'})\n` +
      `• Total : *${total} DH*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 Date : ${formattedDate}\n\n` +
      `Merci de bien vouloir confirmer ma commande.`;

    const cleanPhone = (whatsappNumber || '212603288119').replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(invoiceMessage)}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    onOrderSuccess?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-[#F4EFE7] border border-[#D9D1C5] shadow-2xl rounded-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#D9D1C5] flex items-center justify-between bg-[#EAE4DC]/60">
          <div>
            <span className="text-[10px] sm:text-xs font-semibold tracking-editorial uppercase text-[#5A1A24] block mb-1">
              Finalisation de commande
            </span>
            <h2 className="font-display text-2xl sm:text-3xl text-[#14110F]">
              Vos coordonnées
            </h2>
          </div>
          <CloseButton onClick={onClose} ariaLabel="Fermer le formulaire" />
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
          
          {/* Order items preview summary */}
          <div className="bg-[#FDFCFA] border border-[#D9D1C5] p-4 rounded-xl space-y-3">
            <span className="text-[10px] tracking-editorial uppercase font-semibold text-[#8C857B] block border-b border-[#D9D1C5]/60 pb-2">
              Liste des produits ({items.length})
            </span>
            <div className="max-h-40 overflow-y-auto space-y-2.5 pr-1">
              {items.map((item, idx) => {
                const prodName = item.product.name?.fr || (typeof item.product.name === 'string' ? item.product.name : 'Parfum');
                return (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#14110F] truncate">{prodName}</p>
                      <p className="text-[11px] text-[#8C857B]">
                        Format : {item.selectedSize.label} · Qté : {item.quantity}
                      </p>
                    </div>
                    <span className="font-semibold text-[#14110F] whitespace-nowrap">
                      {item.unitPrice * item.quantity} DH
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer 4 Required Fields in Exact Order */}
          <div className="space-y-4">
            
            {/* 1. Nom complet */}
            <div>
              <label className="block text-xs font-semibold tracking-editorial uppercase text-[#14110F] mb-1.5">
                1. Nom complet <span className="text-[#5A1A24]">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                placeholder="Ex: Mohammed Bennani"
                className={`w-full bg-[#FDFCFA] border px-3.5 py-2.5 text-xs sm:text-sm text-[#14110F] rounded-lg focus:outline-none transition-colors ${
                  formErrors.fullName ? 'border-[#5A1A24] focus:border-[#5A1A24]' : 'border-[#D9D1C5] focus:border-[#14110F]'
                }`}
              />
              {formErrors.fullName && (
                <p className="text-[11px] text-[#5A1A24] mt-1 font-medium">{formErrors.fullName}</p>
              )}
            </div>

            {/* 2. Ville */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold tracking-editorial uppercase text-[#14110F]">
                  2. Ville <span className="text-[#5A1A24]">*</span>
                </label>
                {city.trim() && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isGuelmim
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-[#5A1A24]/10 text-[#5A1A24] border border-[#5A1A24]/30'
                    }`}
                  >
                    {isGuelmim ? 'Tarif Guelmim : 10 DH' : 'Tarif Maroc : 35 DH'}
                  </span>
                )}
              </div>
              <input
                type="text"
                list="moroccan-cities-list"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (formErrors.city) setFormErrors((prev) => ({ ...prev, city: undefined }));
                }}
                placeholder="Ex: Guelmim, Casablanca, Rabat..."
                className={`w-full bg-[#FDFCFA] border px-3.5 py-2.5 text-xs sm:text-sm text-[#14110F] rounded-lg focus:outline-none transition-colors ${
                  formErrors.city ? 'border-[#5A1A24] focus:border-[#5A1A24]' : 'border-[#D9D1C5] focus:border-[#14110F]'
                }`}
              />
              <datalist id="moroccan-cities-list">
                {MOROCCAN_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {formErrors.city && (
                <p className="text-[11px] text-[#5A1A24] mt-1 font-medium">{formErrors.city}</p>
              )}
            </div>

            {/* 3. Adresse */}
            <div>
              <label className="block text-xs font-semibold tracking-editorial uppercase text-[#14110F] mb-1.5">
                3. Adresse <span className="text-[#5A1A24]">*</span>
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: undefined }));
                }}
                placeholder="Quartier, rue, numéro de maison / appartement"
                className={`w-full bg-[#FDFCFA] border px-3.5 py-2.5 text-xs sm:text-sm text-[#14110F] rounded-lg focus:outline-none transition-colors ${
                  formErrors.address ? 'border-[#5A1A24] focus:border-[#5A1A24]' : 'border-[#D9D1C5] focus:border-[#14110F]'
                }`}
              />
              {formErrors.address && (
                <p className="text-[11px] text-[#5A1A24] mt-1 font-medium">{formErrors.address}</p>
              )}
            </div>

            {/* 4. Téléphone */}
            <div>
              <label className="block text-xs font-semibold tracking-editorial uppercase text-[#14110F] mb-1.5">
                4. Téléphone <span className="text-[#5A1A24]">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder="06 03 28 81 19 (10 chiffres)"
                className={`w-full bg-[#FDFCFA] border px-3.5 py-2.5 text-xs sm:text-sm text-[#14110F] rounded-lg focus:outline-none transition-colors ${
                  formErrors.phone ? 'border-[#5A1A24] focus:border-[#5A1A24]' : 'border-[#D9D1C5] focus:border-[#14110F]'
                }`}
              />
              {formErrors.phone && (
                <p className="text-[11px] text-[#5A1A24] mt-1 font-medium">{formErrors.phone}</p>
              )}
            </div>

          </div>

          {/* Pricing Summary (Sous-total, Livraison, Total) */}
          <div className="bg-[#EAE4DC]/80 border border-[#D9D1C5] p-4 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#14110F]">
              <span className="text-[#8C857B]">Sous-total :</span>
              <span className="font-semibold">{subtotal} DH</span>
            </div>
            <div className="flex items-center justify-between text-[#14110F]">
              <span className="text-[#8C857B]">
                Livraison {isGuelmim ? '(Guelmim)' : '(Maroc)'} :
              </span>
              <span className="font-semibold">{deliveryFee} DH</span>
            </div>
            <div className="pt-2 border-t border-[#D9D1C5] flex items-center justify-between text-sm sm:text-base font-bold text-[#5A1A24]">
              <span>TOTAL :</span>
              <span>{total} DH</span>
            </div>
          </div>

          {/* Full-width Order Button */}
          <button
            type="submit"
            className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white py-3.5 px-6 rounded-xl text-xs sm:text-sm font-semibold uppercase tracking-editorial transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.031 2C6.494 2 2 6.494 2 12.031c0 1.97.57 3.81 1.558 5.367L2 22l4.743-1.528A9.97 9.97 0 0 0 12.031 22C17.568 22 22 17.506 22 12.031 22 6.494 17.568 2 12.031 2zm5.772 14.175c-.241.677-1.404 1.298-1.928 1.341-.524.043-1.002.215-3.328-.718-2.775-1.114-4.563-3.924-4.704-4.11-.14-.187-1.127-1.5-1.127-2.863 0-1.364.717-2.035.973-2.313.256-.278.558-.348.744-.348.187 0 .373.003.535.011.173.009.404-.066.632.482.238.575.814 1.986.885 2.13.07.143.117.311.023.498-.093.187-.14.303-.278.466-.14.163-.294.364-.42.49-.14.14-.287.291-.124.571.163.279.725 1.196 1.557 1.938 1.071.954 1.974 1.25 2.253 1.389.279.14.442.117.605-.07.163-.186.698-.813.884-1.092.187-.279.373-.233.629-.14.256.093 1.628.767 1.908.907.279.14.465.209.535.326.07.116.07.674-.171 1.351z" />
            </svg>
            <span>Confirmer la commande sur WhatsApp</span>
          </button>

        </form>
      </div>
    </div>
  );
};
