import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, SizeOption, StoreSettings } from '../types';
import { catalogService } from '../services/catalogService';
import { CustomerOrderModal, OrderModalItem } from '../components/CustomerOrderModal';

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
  openOrderModal: (singleItem?: { product: Product; sizeOption: SizeOption; quantity?: number }) => void;
  closeOrderModal: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'abdou_perfumes_cart_v2';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>(catalogService.getSettings());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderModalItems, setOrderModalItems] = useState<OrderModalItem[]>([]);
  const [isDirectSingleOrder, setIsDirectSingleOrder] = useState(false);

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

  // Sync settings with local cache when updated
  useEffect(() => {
    const handleStorageChange = () => {
      setSettings(catalogService.getSettings());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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

  const openOrderModal = (singleItem?: { product: Product; sizeOption: SizeOption; quantity?: number }) => {
    if (singleItem) {
      setOrderModalItems([
        {
          product: singleItem.product,
          selectedSize: singleItem.sizeOption,
          quantity: singleItem.quantity || 1,
          unitPrice: singleItem.sizeOption.price
        }
      ]);
      setIsDirectSingleOrder(true);
    } else {
      if (cart.length === 0) return;
      setOrderModalItems(
        cart.map((item) => ({
          product: item.product,
          selectedSize: item.selectedSize,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      );
      setIsDirectSingleOrder(false);
    }
    setIsOrderModalOpen(true);
  };

  const closeOrderModal = () => {
    setIsOrderModalOpen(false);
    setOrderModalItems([]);
  };

  const handleOrderSuccess = () => {
    if (!isDirectSingleOrder) {
      clearCart();
    }
    setIsCartOpen(false);
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
        openOrderModal,
        closeOrderModal
      }}
    >
      {children}
      <CustomerOrderModal
        isOpen={isOrderModalOpen}
        onClose={closeOrderModal}
        items={orderModalItems}
        whatsappNumber={settings.whatsappNumber}
        onOrderSuccess={handleOrderSuccess}
      />
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
