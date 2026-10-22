import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, SizeOption, StoreSettings, formatPrice, getCategoryLabel } from '../types';
import { catalogService } from '../services/catalogService';
import { useLanguage } from './LanguageContext';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, sizeOption: SizeOption, quantity?: number) => void;
  removeFromCart: (productId: string, sizeOptionId: string) => void;
  updateQuantity: (productId: string, sizeOptionId: string, delta: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  totalItems: number;
  subtotal: number;
  settings: StoreSettings;
  updateSettings: (newSettings: StoreSettings) => Promise<void>;
  generateSingleProductWhatsAppUrl: (product: Product, sizeOption: SizeOption) => string;
  generateCartWhatsAppUrl: () => string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'abdou_perfumes_cart_v2';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, t } = useLanguage();
  const [settings, setSettings] = useState<StoreSettings>(catalogService.getSettings());
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((i) => i.selectedSize && i.selectedSize.label)) {
          return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('Could not persist cart:', e);
    }
  }, [cart]);

  // Real-time synchronization of settings from settings/whatsapp and settings/general
  useEffect(() => {
    const unsubscribe = catalogService.subscribeToSettings((updatedSettings) => {
      setSettings(updatedSettings);
    });
    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: StoreSettings) => {
    setSettings(newSettings);
    await catalogService.saveSettings(newSettings);
  };

  const addToCart = (product: Product, sizeOption: SizeOption, quantity = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedSize.id === sizeOption.id
      );
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity
        };
        return next;
      }
      return [...prev, { product, selectedSize: sizeOption, quantity, unitPrice: sizeOption.price }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, sizeOptionId: string) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.selectedSize.id === sizeOptionId)));
  };

  const updateQuantity = (productId: string, sizeOptionId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId && item.selectedSize.id === sizeOptionId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Generate single product WhatsApp message (FR / AR only, Moroccan Dirham MAD)
  const generateSingleProductWhatsAppUrl = (product: Product, sizeOption: SizeOption): string => {
    const prodName = product.name[language] || product.name.fr;
    const catLabel = getCategoryLabel(product.category || (product.collection as any), language, settings.customCategories);
    const cleanNumber = settings.whatsappNumber.replace(/[^0-9]/g, '');

    let text = '';
    if (language === 'ar') {
      text = `مرحباً ABDOU FRAGRANCES،\n\nأود طلب هذا العطر:\n\n• العطر: ${prodName}\n• التصنيف: ${catLabel}\n• الحجم / التقسيم: ${sizeOption.label}\n• السعر: ${sizeOption.price} درهم\n\nأرجو تأكيد التوفر وإرسال تفاصيل التوصيل.\n\nشكراً جزيلاً.`;
    } else {
      text = `Bonjour ABDOU FRAGRANCES,\n\nJe souhaite commander cette création :\n\n• Parfum : ${prodName}\n• Catégorie : ${catLabel}\n• Format / Décant : ${sizeOption.label}\n• Prix : ${sizeOption.price} DH\n\nMerci de me confirmer la disponibilité et les modalités de livraison au Maroc.\n\nCordialement.`;
    }

    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
  };

  // Generate multi-item cart WhatsApp message (FR / AR only, Moroccan Dirham MAD)
  const generateCartWhatsAppUrl = (): string => {
    const cleanNumber = settings.whatsappNumber.replace(/[^0-9]/g, '');

    if (cart.length === 0) {
      return `https://wa.me/${cleanNumber}`;
    }

    let itemsList = '';
    cart.forEach((item, index) => {
      const prodName = item.product.name[language] || item.product.name.fr;
      const priceFormatted = language === 'ar' ? `${item.unitPrice * item.quantity} درهم` : `${item.unitPrice * item.quantity} DH`;
      itemsList += `${index + 1}. ${prodName}\n   ${item.selectedSize.label} × ${item.quantity} = ${priceFormatted}\n\n`;
    });

    let text = '';
    if (language === 'ar') {
      text = `مرحباً ABDOU FRAGRANCES،\n\nأود تأكيد طلبي للعطور والتقسيم:\n\n${itemsList}━━━━━━━━━━━━━━━━━\nالمجموع الإجمالي: ${subtotal} درهم\n━━━━━━━━━━━━━━━━━\n\nأرجو تأكيد الطلب وتحديد خيارات التوصيل.\n\nشكراً لكم.`;
    } else {
      text = `Bonjour ABDOU FRAGRANCES,\n\nVoici ma commande de parfums et décants :\n\n${itemsList}━━━━━━━━━━━━━━━━━\nSous-total : ${subtotal} DH\n━━━━━━━━━━━━━━━━━\n\nMerci de me confirmer la commande et les modalités de livraison.\n\nCordialement.`;
    }

    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        totalItems,
        subtotal,
        settings,
        updateSettings,
        generateSingleProductWhatsAppUrl,
        generateCartWhatsAppUrl
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
