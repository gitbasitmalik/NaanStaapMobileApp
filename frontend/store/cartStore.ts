import { create } from 'zustand';

export interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  customizations: string[];
  special_instructions: string;
  image_url: string;
}

interface CartState {
  cartId: string | null;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  addItem: (item: CartItem) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  setCartId: (id: string) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cartId: null,
  items: [],
  subtotal: 0,
  deliveryFee: 2.50,
  total: 0,

  addItem: (item) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) => i.item_id === item.item_id && 
        JSON.stringify(i.customizations) === JSON.stringify(item.customizations)
      );

      let newItems;
      if (existingIndex >= 0) {
        newItems = [...state.items];
        newItems[existingIndex].quantity += item.quantity;
      } else {
        newItems = [...state.items, item];
      }

      const subtotal = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      return {
        items: newItems,
        subtotal,
        total: subtotal + state.deliveryFee,
      };
    });
  },

  updateQuantity: (itemId, quantity) => {
    set((state) => {
      let newItems;
      if (quantity <= 0) {
        newItems = state.items.filter((i) => i.item_id !== itemId);
      } else {
        newItems = state.items.map((i) =>
          i.item_id === itemId ? { ...i, quantity } : i
        );
      }

      const subtotal = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      return {
        items: newItems,
        subtotal,
        total: subtotal > 0 ? subtotal + state.deliveryFee : 0,
      };
    });
  },

  removeItem: (itemId) => {
    set((state) => {
      const newItems = state.items.filter((i) => i.item_id !== itemId);
      const subtotal = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      return {
        items: newItems,
        subtotal,
        total: subtotal > 0 ? subtotal + state.deliveryFee : 0,
      };
    });
  },

  clearCart: () => {
    set({ items: [], subtotal: 0, total: 0, cartId: null });
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  setCartId: (id) => {
    set({ cartId: id });
  },
}));
