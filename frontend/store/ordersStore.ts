import { create } from 'zustand';
import { ordersAPI, Order } from '../services/api';

interface OrdersState {
  orders: Order[];
  currentOrder: Order | null;
  scheduledOrders: Order[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    total: number;
    pages: number;
  };
  summary: {
    total_orders: number;
    total_spent: number;
    average_order_value: number;
    favorite_store: { id: string; name: string; order_count: number } | null;
    favorite_items: { item_id: string; name: string; times_ordered: number }[];
  } | null;

  // Actions
  fetchOrders: (params?: { page?: number; status?: string }) => Promise<void>;
  fetchOrder: (orderId: string) => Promise<void>;
  fetchScheduledOrders: () => Promise<void>;
  reorder: (orderId: string) => Promise<{ success: boolean; cartId?: string }>;
  submitReview: (orderId: string, review: {
    overall_rating: number;
    food_rating?: number;
    delivery_rating?: number;
    comment?: string;
    would_recommend?: boolean;
  }) => Promise<boolean>;
  cancelScheduledOrder: (orderId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  currentOrder: null,
  scheduledOrders: [],
  isLoading: false,
  error: null,
  pagination: { page: 1, total: 0, pages: 0 },
  summary: null,

  fetchOrders: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await ordersAPI.getHistory(params);
      const { orders, summary, pagination } = response.data;
      
      if (params?.page && params.page > 1) {
        set((state) => ({
          orders: [...state.orders, ...orders],
          summary,
          pagination,
          isLoading: false,
        }));
      } else {
        set({ orders, summary, pagination, isLoading: false });
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch orders',
      });
    }
  },

  fetchOrder: async (orderId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await ordersAPI.getOne(orderId);
      set({ currentOrder: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch order',
      });
    }
  },

  fetchScheduledOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await ordersAPI.getScheduled();
      set({ scheduledOrders: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch scheduled orders',
      });
    }
  },

  reorder: async (orderId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await ordersAPI.reorder(orderId);
      set({ isLoading: false });
      return { success: true, cartId: response.data.cart?.id };
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to reorder',
      });
      return { success: false };
    }
  },

  submitReview: async (orderId, review) => {
    set({ isLoading: true, error: null });
    try {
      await ordersAPI.submitReview(orderId, review);
      
      // Update the order in the list
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId ? { ...o, is_reviewed: true } : o
        ),
        currentOrder: state.currentOrder?.id === orderId
          ? { ...state.currentOrder, is_reviewed: true }
          : state.currentOrder,
        isLoading: false,
      }));
      
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to submit review',
      });
      return false;
    }
  },

  cancelScheduledOrder: async (orderId) => {
    set({ isLoading: true, error: null });
    try {
      await ordersAPI.cancelScheduled(orderId);
      set((state) => ({
        scheduledOrders: state.scheduledOrders.filter((o) => o.id !== orderId),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to cancel order',
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
