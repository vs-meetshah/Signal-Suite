import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { Indicator } from "@shared/schema";

export type ProductVersion = "indicator" | "strategy" | "both";

export const VERSION_LABELS: Record<ProductVersion, string> = {
  indicator: "Indicator",
  strategy: "Strategy",
  both: "Indicator + Strategy",
};

export interface CartItem {
  indicatorId: number;
  name: string;
  slug: string;
  price: string;
  duration: number;
  isTrial: boolean;
  version: ProductVersion;
}

export const CART_STORAGE_KEY = "cart";
export const CART_CLEARED_EVENT = "cart-cleared";
const GUEST_CART_STORAGE_KEY = `${CART_STORAGE_KEY}:guest`;

function getCartStorageKey(userId: number | null | undefined) {
  return userId ? `${CART_STORAGE_KEY}:user:${userId}` : GUEST_CART_STORAGE_KEY;
}

function readStoredCart(storageKey: string): CartItem[] {
  if (typeof window === "undefined") return [];

  const saved = localStorage.getItem(storageKey);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const DURATION_DISCOUNTS: Record<number, number> = {
  1: 0.03,
  3: 0.06,
  6: 0.09,
  9: 0.12,
  12: 0.24,
};

export function getDurationDiscount(months: number): number {
  return DURATION_DISCOUNTS[months] ?? 0;
}

export function computeCartItemTotal(item: Pick<CartItem, "price" | "duration" | "isTrial">): number {
  if (item.isTrial) return parseFloat(item.price);

  const monthly = parseFloat(item.price) || 0;
  const duration = item.duration && item.duration > 0 ? item.duration : 1;
  const original = monthly * duration;
  const discount = monthly > 0 ? getDurationDiscount(duration) : 0;

  return Math.round(original * (1 - discount));
}

export function computeStrategyPrice(indicatorPrice: string): string {
  const p = parseFloat(indicatorPrice);
  if (p === 0) return "499";
  return Math.round(p * 1.35).toString();
}

export function computeBothPrice(indicatorPrice: string): string {
  const ind = parseFloat(indicatorPrice) || 0;
  const strat = parseFloat(computeStrategyPrice(indicatorPrice)) || 0;
  return Math.round(ind + strat).toString();
}

export function computeVersionPrice(version: ProductVersion, indicatorPrice: string): string {
  if (version === "strategy") return computeStrategyPrice(indicatorPrice);
  if (version === "both") return computeBothPrice(indicatorPrice);
  return indicatorPrice;
}

export function computeTrialPrice(version: ProductVersion, trialBasePrice: string): string {
  if (version === "strategy") return computeStrategyPrice(trialBasePrice);
  if (version === "both") return computeBothPrice(trialBasePrice);
  return trialBasePrice;
}

function getCurrentCartPrice(
  item: Pick<CartItem, "version" | "isTrial">,
  indicator: Pick<Indicator, "price" | "trialPrice">
): string {
  return item.isTrial
    ? computeTrialPrice(item.version, indicator.trialPrice)
    : computeVersionPrice(item.version, indicator.price);
}

export type AddResult = { ok: true } | { ok: false; reason: "exists" | "mixed"; cartVersion?: ProductVersion };

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "duration" | "isTrial" | "version"> & { version?: ProductVersion; duration?: number }) => AddResult;
  addTrial: (item: Omit<CartItem, "duration" | "isTrial" | "version"> & { version?: ProductVersion }) => AddResult;
  removeItem: (indicatorId: number) => void;
  updateDuration: (indicatorId: number, duration: number) => void;
  clearCart: () => void;
  totalPrice: number;
  itemCount: number;
  isInCart: (indicatorId: number) => boolean;
  getCartItem: (indicatorId: number) => CartItem | undefined;
  cartVersion: ProductVersion | null;
  canAddVersion: (version: ProductVersion) => boolean;
  syncPrices: (indicators: Pick<Indicator, "id" | "price" | "trialPrice">[]) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children, userId }: { children: ReactNode; userId?: number | null }) {
  const storageKey = getCartStorageKey(userId);
  const skipNextPersist = useRef(false);
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart(storageKey));

  useEffect(() => {
    skipNextPersist.current = true;
    setItems(readStoredCart(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  useEffect(() => {
    const clearLocalCart = () => {
      skipNextPersist.current = true;
      setItems([]);
    };
    window.addEventListener(CART_CLEARED_EVENT, clearLocalCart);
    return () => window.removeEventListener(CART_CLEARED_EVENT, clearLocalCart);
  }, []);

  const evaluateAdd = (prev: CartItem[], indicatorId: number, version: ProductVersion): AddResult => {
    const existingItem = prev.find((i) => i.indicatorId === indicatorId);

    if (existingItem) {
      return { ok: false, reason: "exists", cartVersion: existingItem.version };
    }

    return { ok: true };
  };

  const addItem = useCallback((item: Omit<CartItem, "duration" | "isTrial" | "version"> & { version?: ProductVersion; duration?: number }): AddResult => {
    const version: ProductVersion = item.version ?? "indicator";
    const duration = item.duration && item.duration > 0 ? Math.min(12, Math.floor(item.duration)) : 1;
    const result = evaluateAdd(items, item.indicatorId, version);
    if (result.ok) {
      setItems((prev) => {
        if (evaluateAdd(prev, item.indicatorId, version).ok) {
          return [...prev, { ...item, version, duration, isTrial: false }];
        }
        return prev;
      });
    }
    return result;
  }, [items]);

  const addTrial = useCallback((item: Omit<CartItem, "duration" | "isTrial" | "version"> & { version?: ProductVersion }): AddResult => {
    const version: ProductVersion = item.version ?? "indicator";
    const result = evaluateAdd(items, item.indicatorId, version);
    if (result.ok) {
      setItems((prev) => {
        if (evaluateAdd(prev, item.indicatorId, version).ok) {
          return [...prev, { ...item, version, price: computeTrialPrice(version, item.price), duration: 1, isTrial: true }];
        }
        return prev;
      });
    }
    return result;
  }, [items]);

  const removeItem = useCallback((indicatorId: number) => {
    setItems((prev) => prev.filter((i) => i.indicatorId !== indicatorId));
  }, []);

  const updateDuration = useCallback((indicatorId: number, duration: number) => {
    setItems((prev) =>
      prev.map((i) => (i.indicatorId === indicatorId ? { ...i, duration } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const syncPrices = useCallback((indicators: Pick<Indicator, "id" | "price" | "trialPrice">[]) => {
    const byId = new Map(indicators.map((indicator) => [indicator.id, indicator]));

    setItems((prev) => {
      let changed = false;

      const next = prev.map((item) => {
        const indicator = byId.get(item.indicatorId);
        if (!indicator) return item;

        const currentPrice = getCurrentCartPrice(item, indicator);
        if (currentPrice === item.price) return item;

        changed = true;
        return { ...item, price: currentPrice };
      });

      return changed ? next : prev;
    });
  }, []);

  const totalPrice = items.reduce((sum, item) => sum + computeCartItemTotal(item), 0);

  const itemCount = items.length;

  const isInCart = useCallback(
    (indicatorId: number) => items.some((i) => i.indicatorId === indicatorId),
    [items]
  );

  const getCartItem = useCallback(
    (indicatorId: number) => items.find((i) => i.indicatorId === indicatorId),
    [items]
  );

  const cartVersion: ProductVersion | null = items.length > 0 ? items[0].version : null;

  const canAddVersion = useCallback(
    (_version: ProductVersion) => true,
    []
  );

  return (
    <CartContext.Provider
      value={{ items, addItem, addTrial, removeItem, updateDuration, clearCart, totalPrice, itemCount, isInCart, getCartItem, cartVersion, canAddVersion, syncPrices }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
