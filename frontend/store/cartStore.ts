import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_STORAGE_KEY = '@naanstaap_cart';

export interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  customizations: string[];
  special_instructions: string;
  image_url: string;
}

// A cart line is an item plus its chosen customisations; the same dish with
// different options sits on separate lines.
export const lineKey = (item: Pick<CartItem, 'item_id' | 'customizations'>) =>
  `${item.item_id}::${[...item.customizations].sort().join('|')}`;

interface CartState {
  items: CartItem[];
  subtotal: number;
  addItem: (item: CartItem) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  hydrate: () => Promise<void>;
}

const computeSubtotal = (items: CartItem[]) =>
  Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

const persist = (items: CartItem[]) => {
  AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)).catch(() => {});
};

const commit = (items: CartItem[]) => {
  persist(items);
  return { items, subtotal: computeSubtotal(items) };
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,

  addItem: (item) => {
    set((state) => {
      const key = lineKey(item);
      const existing = state.items.find((i) => lineKey(i) === key);
      const items = existing
        ? state.items.map((i) =>
            lineKey(i) === key ? { ...i, quantity: i.quantity + item.quantity } : i
          )
        : [...state.items, item];
      return commit(items);
    });
  },

  updateQuantity: (key, quantity) => {
    set((state) => {
      const items =
        quantity <= 0
          ? state.items.filter((i) => lineKey(i) !== key)
          : state.items.map((i) => (lineKey(i) === key ? { ...i, quantity } : i));
      return commit(items);
    });
  },

  removeItem: (key) => {
    set((state) => commit(state.items.filter((i) => lineKey(i) !== key)));
  },

  clearCart: () => {
    set(commit([]));
  },

  getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const items: CartItem[] = JSON.parse(stored);
        set({ items, subtotal: computeSubtotal(items) });
      }
    } catch {
      // Corrupt or missing cart storage: start empty.
    }
  },
}));
