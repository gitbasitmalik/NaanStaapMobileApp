import { create } from 'zustand';

// Checkout choices that other screens can pre-fill (e.g. "Use code" on Deals,
// "Order from here" on Stores).
interface CheckoutState {
  promoCode: string | null;
  storeId: string | null;
  setPromoCode: (code: string | null) => void;
  setStoreId: (storeId: string | null) => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  promoCode: null,
  storeId: null,
  setPromoCode: (promoCode) => set({ promoCode }),
  setStoreId: (storeId) => set({ storeId }),
}));
