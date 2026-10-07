import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CartItem, Product } from '../types/database';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';
import { getProductAvailability } from '../utils/productAvailability';
import { soundAndHaptics } from '../utils/soundAndHaptics';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  refreshCartProducts: () => Promise<void>;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'hotel_atithi_cart_v1';
const MAX_QTY = 50;

const loadSavedCart = (): CartItem[] => {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i: any) =>
        i && i.product && typeof i.product.id === 'string' &&
        typeof i.product.price === 'number' &&
        Number.isInteger(i.quantity) && i.quantity > 0
    );
  } catch {
    return [];
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<CartItem[]>(loadSavedCart);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [items]);

  // Re-sync saved cart with live product data (price, availability) so a stale
  // localStorage cart never shows an old price or a deleted dish.
  const refreshCartProducts = useCallback(async () => {
    const ids = itemsRef.current.map((i) => i.product.id).filter(Boolean);
    if (ids.length === 0) return;
    const { data, error } = await supabase.from('products').select('*').in('id', ids);
    if (error || !data) return;
    const live = new Map<string, Product>(data.map((p: Product) => [p.id, p]));
    if (itemsRef.current.some((item) => !live.has(item.product.id))) {
      toastError('Some items in your cart are no longer on the menu and were removed.');
    }
    setItems((prev) =>
      prev
        .filter((item) => live.has(item.product.id))
        .map((item) => ({ ...item, product: { ...item.product, ...live.get(item.product.id)! } }))
    );
  }, [toastError]);

  useEffect(() => {
    refreshCartProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToCart = (product: Product, quantity: number = 1) => {
    const avail = getProductAvailability(product);
    if (!avail.isAvailable) {
      soundAndHaptics.triggerHaptic('warning');
      soundAndHaptics.playErrorSound();
      toastError(
        `Cannot add "${product.name}": ${
          avail.warningMessage || avail.badgeText || 'Item is currently not available.'
        }`
      );
      return;
    }

    soundAndHaptics.triggerHaptic('pop');
    soundAndHaptics.playAddToCartSound();

    setItems((prev) => {
      const exists = prev.some((item) => item.product.id === product.id);
      if (exists) {
        // Immutable update: mutating the existing object doubled quantities under React StrictMode
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, product, quantity: Math.min(item.quantity + quantity, MAX_QTY) }
            : item
        );
      }
      return [...prev, { id: product.id, product, quantity: Math.min(quantity, MAX_QTY) }];
    });
    success(`Added ${product.name} to cart`);
  };

  const removeFromCart = (productId: string) => {
    soundAndHaptics.triggerHaptic('light');
    soundAndHaptics.playRemoveSound();
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    soundAndHaptics.triggerHaptic('light');
    soundAndHaptics.playTapSound();

    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.min(quantity, MAX_QTY) } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {}
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCartProducts,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
