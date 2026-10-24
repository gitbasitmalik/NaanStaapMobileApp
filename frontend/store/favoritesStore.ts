import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FavoriteItem {
  item_id: string;
  name: string;
  price: number;
  image_url: string;
}

interface FavoritesState {
  favorites: FavoriteItem[];
  userId: string;
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (itemId: string) => void;
  isFavorite: (itemId: string) => boolean;
  loadFavorites: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  userId: 'guest_user',

  addFavorite: (item) => {
    set((state) => {
      const newFavorites = [...state.favorites, item];
      AsyncStorage.setItem('favorites', JSON.stringify(newFavorites));
      return { favorites: newFavorites };
    });
  },

  removeFavorite: (itemId) => {
    set((state) => {
      const newFavorites = state.favorites.filter((f) => f.item_id !== itemId);
      AsyncStorage.setItem('favorites', JSON.stringify(newFavorites));
      return { favorites: newFavorites };
    });
  },

  isFavorite: (itemId) => {
    return get().favorites.some((f) => f.item_id === itemId);
  },

  loadFavorites: async () => {
    try {
      const stored = await AsyncStorage.getItem('favorites');
      if (stored) {
        set({ favorites: JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  },
}));
