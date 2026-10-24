import { create } from 'zustand';
import { authAPI, tokenService, User, apiErrorMessage } from '../services/api';
import { useLoyaltyStore } from './loyaltyStore';
import { useOrdersStore } from './ordersStore';
import { useAddressStore } from './addressStore';
import { useRecommendationsStore } from './recommendationsStore';

// Per-account data held in other stores; wiped on sign-out so the next person
// using the device never sees the previous account's orders or points.
const clearAccountData = () => {
  useLoyaltyStore.setState({ balance: null, history: [], referralInfo: null, error: null });
  useOrdersStore.setState({ orders: [], currentOrder: null, summary: null, error: null });
  useAddressStore.setState({ addresses: [], selectedAddress: null, hasLoaded: false, error: null });
  useRecommendationsStore.getState().clearRecommendations();
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    referral_code?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  updatePreferences: (preferences: {
    dietary_preferences?: string[];
    allergen_alerts?: string[];
    notification_preferences?: Record<string, boolean>;
  }) => Promise<boolean>;
  clearError: () => void;
  refreshUserData: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(email, password);
      const { access_token, refresh_token, user } = response.data;
      
      await tokenService.setTokens(access_token, refresh_token);
      
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      return true;
    } catch (error: any) {
      const errorMessage = apiErrorMessage(error, 'Login failed. Please try again.');
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        user: null,
      });
      return false;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.register(data);
      const { access_token, refresh_token, user } = response.data;
      
      await tokenService.setTokens(access_token, refresh_token);
      
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      return true;
    } catch (error: any) {
      const errorMessage = apiErrorMessage(error, 'Registration failed. Please try again.');
      set({
        isLoading: false,
        error: errorMessage,
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore logout API errors
    }
    
    await tokenService.clearTokens();
    clearAccountData();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const token = await tokenService.getAccessToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }

      const response = await authAPI.getProfile();
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      await tokenService.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // These account actions leave the global isLoading alone (it tracks start-up
  // session restore); screens keep their own saving state.
  updateProfile: async (data) => {
    set({ error: null });
    try {
      const response = await authAPI.updateProfile(data);
      set({ user: { ...get().user, ...response.data.user } as User });
      return true;
    } catch (error: any) {
      set({ error: apiErrorMessage(error, 'Failed to update profile') });
      return false;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ error: null });
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      return true;
    } catch (error: any) {
      set({ error: apiErrorMessage(error, 'Failed to change password') });
      return false;
    }
  },

  updatePreferences: async (preferences) => {
    set({ error: null });
    try {
      // The API reads `notification_preferences`; the typed helper only names
      // `notification_settings`, so pass the payload through as-is.
      const payload: Parameters<typeof authAPI.updatePreferences>[0] = preferences;
      await authAPI.updatePreferences(payload);
      // PUT /api/auth/preferences only returns a message, so re-read the profile.
      const response = await authAPI.getProfile();
      set({ user: response.data });
      return true;
    } catch (error: any) {
      set({ error: apiErrorMessage(error, 'Failed to update preferences') });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  refreshUserData: async () => {
    try {
      const response = await authAPI.getProfile();
      set({ user: response.data });
    } catch (error) {
      // Silently fail
    }
  },
}));
