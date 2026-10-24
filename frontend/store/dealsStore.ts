import { create } from 'zustand';
import { dealsAPI, Deal, apiErrorMessage } from '../services/api';

// GET /api/deals also returns `terms` and `is_active` for each deal.
export interface DealInfo extends Deal {
  terms?: string;
  is_active?: boolean;
}

interface DealsState {
  deals: DealInfo[];
  currentDeal: DealInfo | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;

  fetchDeals: () => Promise<boolean>;
  fetchDeal: (dealId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useDealsStore = create<DealsState>((set) => ({
  deals: [],
  currentDeal: null,
  isLoading: false,
  hasLoaded: false,
  error: null,

  fetchDeals: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await dealsAPI.getAll();
      set({ deals: (response.data as DealInfo[]) || [], isLoading: false, hasLoaded: true });
      return true;
    } catch (error) {
      set({
        isLoading: false,
        hasLoaded: true,
        error: apiErrorMessage(error, "We couldn't load today's deals."),
      });
      return false;
    }
  },

  fetchDeal: async (dealId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await dealsAPI.getOne(dealId);
      set({ currentDeal: response.data as DealInfo, isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false, error: apiErrorMessage(error, "We couldn't load that deal.") });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
