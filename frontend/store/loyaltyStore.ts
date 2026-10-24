import { create } from 'zustand';
import { loyaltyAPI, referralAPI, ReferralInfo, apiErrorMessage } from '../services/api';

// Programme rules (mirrors backend/server.js constants).
export const POINTS_PER_POUND = 10;
export const POINTS_PER_POUND_OFF = 100;

// Tiers are based on lifetime spend (see GET /api/loyalty/balance).
export const TIERS = [
  { name: 'Bronze', minSpend: 0 },
  { name: 'Silver', minSpend: 200 },
  { name: 'Gold', minSpend: 500 },
] as const;

export interface LoyaltyBalanceInfo {
  points: number;
  tier: string;
  tier_benefits: string[];
  redeemable_value: number;
  points_to_next_reward: number;
  total_earned: number;
  total_redeemed: number;
  // Derived on the client from the user's lifetime spend.
  total_spent: number;
  next_tier: string | null;
  spend_to_next_tier: number;
  /** 0..1 progress from the current tier threshold to the next one. */
  tier_progress: number;
  /** Points you'd earn by spending enough to reach the next tier (at 10 pts/£). */
  points_to_next_tier: number;
  points_value: number;
}

export interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  description: string;
  created_at: string;
  discount_code?: string;
  order_id?: string;
}

export interface Reward {
  id: string;
  name: string;
  points_required: number;
  description: string;
  is_available: boolean;
}

export interface Redemption {
  code: string;
  pointsRedeemed: number;
  discountValue: number;
  expiresAt: string | null;
}

/** £-off rewards ("£5 Off") are the only ones the API can redeem. */
export const rewardPoundValue = (reward: Reward): number | null => {
  const match = /^£\s?(\d+(?:\.\d+)?)\s*off/i.exec(reward.name.trim());
  return match ? Number(match[1]) : null;
};

const deriveTier = (totalSpent: number) => {
  let index = 0;
  TIERS.forEach((t, i) => {
    if (totalSpent >= t.minSpend) index = i;
  });
  const next = TIERS[index + 1];
  if (!next) {
    return { next_tier: null, spend_to_next_tier: 0, tier_progress: 1 };
  }
  const floor = TIERS[index].minSpend;
  const span = next.minSpend - floor;
  return {
    next_tier: next.name as string,
    spend_to_next_tier: Math.max(0, next.minSpend - totalSpent),
    tier_progress: Math.min(1, Math.max(0, (totalSpent - floor) / span)),
  };
};

interface LoyaltyState {
  balance: LoyaltyBalanceInfo | null;
  history: LoyaltyTransaction[];
  historyPage: number;
  historyPages: number;
  rewards: Reward[];
  referralInfo: ReferralInfo | null;
  isLoading: boolean;
  error: string | null;

  fetchBalance: () => Promise<boolean>;
  fetchHistory: (page?: number) => Promise<boolean>;
  fetchRewards: () => Promise<boolean>;
  fetchReferralInfo: () => Promise<boolean>;
  /** Loads balance, rewards, history and referral info together. */
  fetchAll: () => Promise<boolean>;
  redeemPoints: (
    points: number
  ) => Promise<{ ok: true; redemption: Redemption } | { ok: false; error: string }>;
  applyReferralCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
  clearError: () => void;
}

export const useLoyaltyStore = create<LoyaltyState>((set, get) => ({
  balance: null,
  history: [],
  historyPage: 1,
  historyPages: 1,
  rewards: [],
  referralInfo: null,
  isLoading: false,
  error: null,

  fetchBalance: async () => {
    try {
      const { data } = await loyaltyAPI.getBalance();
      const raw = data as any;
      const totalSpent = Number(raw.total_spent) || 0;
      // The API reports tier progress; derive it locally for older servers.
      const tierInfo =
        typeof raw.tier_progress === 'number'
          ? {
              next_tier: raw.next_tier ?? null,
              spend_to_next_tier: Math.max(0, Number(raw.spend_to_next_tier) || 0),
              tier_progress: raw.tier_progress,
            }
          : deriveTier(totalSpent);
      const points = Number(raw.points) || 0;
      set({
        balance: {
          points,
          tier: raw.tier || 'Bronze',
          tier_benefits: Array.isArray(raw.tier_benefits) ? raw.tier_benefits : [],
          redeemable_value: Number(raw.redeemable_value) || 0,
          points_to_next_reward:
            Number(raw.points_to_next_reward) ||
            POINTS_PER_POUND_OFF - (points % POINTS_PER_POUND_OFF),
          total_earned: Number(raw.total_earned) || 0,
          total_redeemed: Number(raw.total_redeemed) || 0,
          total_spent: totalSpent,
          ...tierInfo,
          points_to_next_tier: Math.ceil(tierInfo.spend_to_next_tier * POINTS_PER_POUND),
          points_value: Math.floor(points / POINTS_PER_POUND_OFF),
        },
      });
      return true;
    } catch (error) {
      set({ error: apiErrorMessage(error, "We couldn't load your points.") });
      return false;
    }
  },

  fetchHistory: async (page = 1) => {
    try {
      const { data } = await loyaltyAPI.getHistory(page, 20);
      const transactions: LoyaltyTransaction[] = data?.transactions || [];
      set((state) => ({
        history: page > 1 ? [...state.history, ...transactions] : transactions,
        historyPage: data?.pagination?.page ?? page,
        historyPages: data?.pagination?.pages ?? 1,
      }));
      return true;
    } catch (error) {
      set({ error: apiErrorMessage(error, "We couldn't load your points history.") });
      return false;
    }
  },

  fetchRewards: async () => {
    try {
      const { data } = await loyaltyAPI.getRewards();
      set({ rewards: data?.rewards || [] });
      return true;
    } catch (error) {
      set({ error: apiErrorMessage(error, "We couldn't load rewards.") });
      return false;
    }
  },

  fetchReferralInfo: async () => {
    try {
      const { data } = await referralAPI.getInfo();
      set({ referralInfo: data });
      return true;
    } catch (error) {
      set({ error: apiErrorMessage(error, "We couldn't load your referral code.") });
      return false;
    }
  },

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    const results = await Promise.all([
      get().fetchBalance(),
      get().fetchRewards(),
      get().fetchHistory(1),
      get().fetchReferralInfo(),
    ]);
    set({ isLoading: false });
    return results.every(Boolean);
  },

  redeemPoints: async (points) => {
    try {
      const { data } = await loyaltyAPI.redeem(points);
      const redemption: Redemption = {
        code: data.redemption_code,
        pointsRedeemed: Number(data.points_redeemed) || points,
        discountValue: Number(data.discount_value) || 0,
        expiresAt: data.expires_at ? String(data.expires_at) : null,
      };
      // Refresh balance, rewards availability and history from the server.
      await Promise.all([get().fetchBalance(), get().fetchRewards(), get().fetchHistory(1)]);
      return { ok: true, redemption };
    } catch (error) {
      return { ok: false, error: apiErrorMessage(error, "We couldn't redeem your points.") };
    }
  },

  applyReferralCode: async (code) => {
    try {
      await referralAPI.apply(code);
      await get().fetchBalance();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: apiErrorMessage(error, "That referral code didn't work.") };
    }
  },

  clearError: () => set({ error: null }),
}));
