import { create } from 'zustand';
import { dealsAPI, Deal } from '../services/api';

interface DealsState {
  deals: Deal[];
  currentDeal: Deal | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDeals: () => Promise<void>;
  fetchDeal: (dealId: string) => Promise<void>;
  clearError: () => void;
}

export const useDealsStore = create<DealsState>((set) => ({
  deals: [],
  currentDeal: null,
  isLoading: false,
  error: null,

  fetchDeals: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await dealsAPI.getAll();
      set({ deals: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch deals',
      });
    }
  },

  fetchDeal: async (dealId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await dealsAPI.getOne(dealId);
      set({ currentDeal: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch deal',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
