import { create } from 'zustand';
import { loyaltyAPI, referralAPI, LoyaltyBalance, ReferralInfo } from '../services/api';

interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  description: string;
  created_at: string;
}

interface Reward {
  id: string;
  name: string;
  points_required: number;
  description: string;
  is_available: boolean;
}

interface LoyaltyState {
  balance: LoyaltyBalance | null;
  history: LoyaltyTransaction[];
  rewards: Reward[];
  referralInfo: ReferralInfo | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchBalance: () => Promise<void>;
  fetchHistory: (page?: number) => Promise<void>;
  fetchRewards: () => Promise<void>;
  fetchReferralInfo: () => Promise<void>;
  redeemPoints: (points: number) => Promise<{ success: boolean; discount?: number }>;
  applyReferralCode: (code: string) => Promise<boolean>;
  clearError: () => void;
}

export const useLoyaltyStore = create<LoyaltyState>((set, get) => ({
  balance: null,
  history: [],
  rewards: [],
  referralInfo: null,
  isLoading: false,
  error: null,

  fetchBalance: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await loyaltyAPI.getBalance();
      set({ balance: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch balance',
      });
    }
  },

  fetchHistory: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await loyaltyAPI.getHistory(page);
      const newHistory = response.data.transactions || [];
      
      if (page > 1) {
        set((state) => ({
          history: [...state.history, ...newHistory],
          isLoading: false,
        }));
      } else {
        set({ history: newHistory, isLoading: false });
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch history',
      });
    }
  },

  fetchRewards: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await loyaltyAPI.getRewards();
      set({ rewards: response.data.rewards || [], isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch rewards',
      });
    }
  },

  fetchReferralInfo: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await referralAPI.getInfo();
      set({ referralInfo: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch referral info',
      });
    }
  },

  redeemPoints: async (points) => {
    set({ isLoading: true, error: null });
    try {
      const response = await loyaltyAPI.redeem(points);
      
      // Update balance
      set((state) => ({
        balance: state.balance
          ? { ...state.balance, points: state.balance.points - points }
          : null,
        isLoading: false,
      }));
      
      return { success: true, discount: response.data.discount_amount };
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to redeem points',
      });
      return { success: false };
    }
  },

  applyReferralCode: async (code) => {
    set({ isLoading: true, error: null });
    try {
      await referralAPI.apply(code);
      
      // Refresh balance after applying referral
      await get().fetchBalance();
      
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to apply referral code',
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
