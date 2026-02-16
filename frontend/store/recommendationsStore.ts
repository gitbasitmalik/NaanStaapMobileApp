import { create } from 'zustand';
import { recommendationsAPI, MenuItem } from '../services/api';

interface RecommendationCategory {
  title: string;
  items: MenuItem[];
  reason?: string;
}

interface RecommendationsState {
  recommendations: RecommendationCategory[];
  personalizedItems: MenuItem[];
  trendingItems: MenuItem[];
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Actions
  fetchRecommendations: () => Promise<void>;
  clearRecommendations: () => void;
  clearError: () => void;
}

export const useRecommendationsStore = create<RecommendationsState>((set, get) => ({
  recommendations: [],
  personalizedItems: [],
  trendingItems: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchRecommendations: async () => {
    // Don't fetch if we fetched recently (within 5 minutes)
    const lastFetched = get().lastFetched;
    if (lastFetched && Date.now() - lastFetched.getTime() < 5 * 60 * 1000) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await recommendationsAPI.get();
      const data = response.data;

      set({
        recommendations: data.categories || [],
        personalizedItems: data.personalized || data.for_you || [],
        trendingItems: data.trending || data.popular || [],
        isLoading: false,
        lastFetched: new Date(),
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch recommendations',
      });
    }
  },

  clearRecommendations: () => {
    set({
      recommendations: [],
      personalizedItems: [],
      trendingItems: [],
      lastFetched: null,
    });
  },

  clearError: () => set({ error: null }),
}));
