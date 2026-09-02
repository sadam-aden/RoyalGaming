import { create } from "zustand";
import type { OrderType } from "../types";

export interface CartLine {
  key: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  orderType: OrderType;
  customerId?: string;
  waiterId?: string;
  discountId?: string;
  addItem: (productId: string, name: string, price: number) => void;
  incrementQty: (key: string) => void;
  decrementQty: (key: string) => void;
  removeItem: (key: string) => void;
  setOrderType: (t: OrderType) => void;
  setCustomerId: (id?: string) => void;
  setWaiterId: (id?: string) => void;
  setDiscountId: (id?: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  orderType: "WALK",
  customerId: undefined,
  waiterId: undefined,
  discountId: undefined,

  addItem: (productId, name, price) =>
    set((state) => {
      const existing = state.lines.find((l) => l.productId === productId);
      if (existing) {
        return {
          lines: state.lines.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l)),
        };
      }
      return { lines: [...state.lines, { key: productId, productId, name, price, quantity: 1 }] };
    }),

  incrementQty: (key) =>
    set((state) => ({
      lines: state.lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l)),
    })),

  decrementQty: (key) =>
    set((state) => ({
      lines: state.lines
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    })),

  removeItem: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),

  setOrderType: (orderType) => set({ orderType }),
  setCustomerId: (customerId) => set({ customerId }),
  setWaiterId: (waiterId) => set({ waiterId }),
  setDiscountId: (discountId) => set({ discountId }),

  clear: () => set({ lines: [], customerId: undefined, waiterId: undefined, discountId: undefined }),
}));
