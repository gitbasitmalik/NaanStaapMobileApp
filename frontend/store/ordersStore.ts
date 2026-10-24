import { create } from 'zustand';
import { ordersAPI, Order, apiErrorMessage } from '../services/api';

// A line on a placed order, as stored by POST /api/orders.
export interface OrderLine {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  customizations: string[];
  special_instructions?: string;
  image_url?: string;
  subtotal?: number;
}

// Shape of each entry in GET /api/orders/history.
export interface OrderHistoryItem
  extends Omit<Order, 'items' | 'order_type' | 'discount_amount'> {
  order_number?: number;
  items: OrderLine[];
  order_type: 'delivery' | 'pickup' | 'dine-in';
  discount?: number;
  discount_amount?: number;
  store_address?: string;
}

export interface OrdersSummary {
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  favorite_store: { id: string; name: string; order_count: number } | null;
  favorite_items: { item_id: string; name: string; times_ordered: number }[];
}

export interface ReviewPayload {
  overall_rating: number;
  food_rating?: number;
  delivery_rating?: number;
  comment?: string;
  would_recommend?: boolean;
}

export const ACTIVE_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
];
export const COMPLETED_ORDER_STATUSES = ['delivered', 'completed'];

const PAGE_SIZE = 20;

interface OrdersState {
  orders: OrderHistoryItem[];
  currentOrder: OrderHistoryItem | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  pagination: { page: number; total: number; pages: number };
  summary: OrdersSummary | null;

  /** Loads the first page (or appends `page` > 1). Resolves true on success. */
  fetchOrders: (params?: { page?: number }) => Promise<boolean>;
  fetchMore: () => Promise<boolean>;
  fetchOrder: (orderId: string) => Promise<boolean>;
  submitReview: (
    orderId: string,
    review: ReviewPayload
  ) => Promise<{ ok: boolean; bonusPoints?: number; error?: string }>;
  clearError: () => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  pagination: { page: 1, total: 0, pages: 0 },
  summary: null,

  fetchOrders: async (params) => {
    const page = params?.page ?? 1;
    const appending = page > 1;
    set(appending ? { isLoadingMore: true, error: null } : { isLoading: true, error: null });
    try {
      const response = await ordersAPI.getHistory({ page, limit: PAGE_SIZE });
      const { orders = [], summary = null, pagination } = response.data || {};
      set((state) => ({
        orders: appending ? [...state.orders, ...orders] : orders,
        summary,
        pagination: pagination
          ? { page: pagination.page, total: pagination.total, pages: pagination.pages }
          : state.pagination,
        isLoading: false,
        isLoadingMore: false,
      }));
      return true;
    } catch (error) {
      set({
        isLoading: false,
        isLoadingMore: false,
        error: apiErrorMessage(error, "We couldn't load your orders."),
      });
      return false;
    }
  },

  fetchMore: async () => {
    const { pagination, isLoading, isLoadingMore } = get();
    if (isLoading || isLoadingMore || pagination.page >= pagination.pages) return true;
    return get().fetchOrders({ page: pagination.page + 1 });
  },

  fetchOrder: async (orderId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await ordersAPI.getOne(orderId);
      set({ currentOrder: response.data as unknown as OrderHistoryItem, isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false, error: apiErrorMessage(error, "We couldn't load that order.") });
      return false;
    }
  },

  submitReview: async (orderId, review) => {
    try {
      const response = await ordersAPI.submitReview(orderId, review);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? { ...o, is_reviewed: true } : o)),
        currentOrder:
          state.currentOrder?.id === orderId
            ? { ...state.currentOrder, is_reviewed: true }
            : state.currentOrder,
      }));
      return { ok: true, bonusPoints: response.data?.bonus_points_earned };
    } catch (error) {
      return { ok: false, error: apiErrorMessage(error, "We couldn't submit your review.") };
    }
  },

  clearError: () => set({ error: null }),
}));
