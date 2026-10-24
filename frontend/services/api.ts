import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.138:8005';

// Token storage keys
const ACCESS_TOKEN_KEY = '@naanstaap_access_token';
const REFRESH_TOKEN_KEY = '@naanstaap_refresh_token';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const tokenService = {
  async getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  async clearTokens(): Promise<void> {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await tokenService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await tokenService.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          await tokenService.setTokens(access_token, refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await tokenService.clearTokens();
        // Trigger logout in auth store
      }
    }

    return Promise.reject(error);
  }
);

// =====================
// API Types
// =====================

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number | null;
  category: string;
  image_url: string;
  is_vegetarian: boolean;
  is_popular: boolean;
  is_spicy: boolean;
  is_new?: boolean;
  calories: number | null;
  allergens: string[];
  customizations: string[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  image_url: string;
  item_count: number;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  postcode: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  hours: StoreHours[];
  hours_summary: string;
  is_open_now: boolean;
  google_maps_url: string;
  image_url: string;
  delivery_available: boolean;
  takeaway_available: boolean;
  dine_in_available: boolean;
}

export interface AllergenGuide {
  disclaimer: string;
  note: string;
  printable_guide_url: string;
  allergen_list: string[];
  items: {
    id: string;
    category: string;
    name: string;
    contains: string[];
    may_contain: string[];
  }[];
}

export interface StoreHours {
  day: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface ChaiItem {
  id: string;
  name: string;
  description: string;
  price: number | null;
  is_signature: boolean;
  image_url: string;
  customizations: string[];
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  discount_percentage: number | null;
  discount_amount: number | null;
  code: string | null;
  image_url: string;
  valid_until: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  loyalty_points: number;
  tier: 'Bronze' | 'Silver' | 'Gold';
  referral_code: string;
  dietary_preferences: string[];
  allergen_alerts: string[];
  total_orders: number;
  total_spent: number;
  created_at: string;
}

export interface Address {
  id: string;
  label: string;
  full_address: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postcode: string;
  is_default: boolean;
  delivery_instructions?: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: string;
  status_label: string;
  items: CartItem[];
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total: number;
  order_type: 'delivery' | 'pickup';
  store_id: string;
  store_name: string;
  delivery_address?: Address;
  created_at: string;
  estimated_time: number;
  is_reviewed: boolean;
}

export interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  customizations: string[];
  special_instructions: string;
  image_url?: string;
}

export interface LoyaltyBalance {
  points: number;
  tier: string;
  tier_progress: number;
  next_tier: string | null;
  points_to_next_tier: number;
  points_value: number;
}

export interface Review {
  id: string;
  order_id: string;
  user_name: string;
  overall_rating: number;
  food_rating?: number;
  delivery_rating?: number;
  comment?: string;
  created_at: string;
}

export interface ReferralInfo {
  referral_code: string;
  referral_link: string;
  referral_count: number;
  total_points_earned: number;
  reward_per_referral: number;
  referee_bonus: number;
  share_message: string;
}

// =====================
// API Functions
// =====================

// Auth
export const authAPI = {
  register: (data: { 
    name: string; 
    email: string; 
    password: string; 
    phone: string;
    referral_code?: string;
  }) => api.post('/api/auth/register', data),

  login: (email: string, password: string) => 
    api.post('/api/auth/login', { email, password }),

  refreshToken: (refreshToken: string) => 
    api.post('/api/auth/refresh', { refresh_token: refreshToken }),

  logout: async () =>
    api.post('/api/auth/logout', {
      refresh_token: await tokenService.getRefreshToken(),
    }),

  getProfile: () => api.get<User>('/api/auth/profile'),

  updateProfile: (data: Partial<User>) => 
    api.put('/api/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/api/auth/change-password', { 
      current_password: currentPassword, 
      new_password: newPassword 
    }),

  updatePreferences: (preferences: {
    dietary_preferences?: string[];
    allergen_alerts?: string[];
    notification_settings?: object;
  }) => api.put('/api/auth/preferences', preferences),

  deleteAccount: (password: string) =>
    api.delete('/api/auth/account', { data: { password } }),
};

// Menu
export const menuAPI = {
  getCategories: () => api.get<MenuCategory[]>('/api/menu/categories'),

  getItems: () => api.get<MenuItem[]>('/api/menu/items'),

  getPopularItems: () => api.get<MenuItem[]>('/api/menu/items/popular'),

  getItemsByCategory: (categoryId: string) => 
    api.get<MenuItem[]>(`/api/menu/items/category/${categoryId}`),

  getItem: (itemId: string) => api.get<MenuItem>(`/api/menu/items/${itemId}`),

  filterItems: (filters: {
    category?: string;
    vegetarian?: boolean;
    spicy?: boolean;
    max_calories?: number;
    min_price?: number;
    max_price?: number;
    exclude_allergens?: string;
    search?: string;
    sort_by?: string;
  }) => api.get('/api/menu/items/filter', { params: filters }),

  getSimilarItems: (itemId: string) => 
    api.get(`/api/menu/items/${itemId}/similar`),

  getItemReviews: (itemId: string, page = 1, limit = 10) =>
    api.get(`/api/menu/items/${itemId}/reviews`, { params: { page, limit } }),
};

// Chai
export const chaiAPI = {
  getAll: () => api.get<ChaiItem[]>('/api/chai'),

  getOne: (chaiId: string) => api.get<ChaiItem>(`/api/chai/${chaiId}`),
};

// Stores
export const storesAPI = {
  getAll: () => api.get<Store[]>('/api/stores'),

  getOne: (storeId: string) => api.get<Store>(`/api/stores/${storeId}`),

  getReviews: (storeId: string, params?: { page?: number; limit?: number; sort?: string }) =>
    api.get(`/api/stores/${storeId}/reviews`, { params }),
};

export interface OrderingConfig {
  delivery_fee: number;
  free_delivery_threshold: number;
  min_order_amount: number;
  points_per_pound: number;
  support_email: string;
}

export const configAPI = {
  get: () => api.get<OrderingConfig>('/api/config'),
};

export const allergensAPI = {
  get: () => api.get<AllergenGuide>('/api/allergens'),
};

// Deals
export const dealsAPI = {
  getAll: () => api.get<Deal[]>('/api/deals'),

  getOne: (dealId: string) => api.get<Deal>(`/api/deals/${dealId}`),
};

// Addresses
export const addressAPI = {
  getAll: () => api.get<Address[]>('/api/addresses'),

  getOne: (addressId: string) => api.get<Address>(`/api/addresses/${addressId}`),

  create: (address: Omit<Address, 'id'>) => api.post('/api/addresses', address),

  update: (addressId: string, address: Partial<Address>) => 
    api.put(`/api/addresses/${addressId}`, address),

  delete: (addressId: string) => api.delete(`/api/addresses/${addressId}`),

  setDefault: (addressId: string) => 
    api.put(`/api/addresses/${addressId}/default`),
};

// Loyalty
export const loyaltyAPI = {
  getBalance: () => api.get<LoyaltyBalance>('/api/loyalty/balance'),

  getHistory: (page = 1, limit = 20) => 
    api.get('/api/loyalty/history', { params: { page, limit } }),

  redeem: (points: number) =>
    api.post('/api/loyalty/redeem', { points_to_redeem: points }),

  getRewards: () => api.get('/api/loyalty/rewards'),
};

// Orders
export interface PlaceOrderPayload {
  items: {
    item_id: string;
    name: string;
    quantity: number;
    customizations: string[];
    special_instructions?: string;
  }[];
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  store_id: string;
  order_type: 'delivery' | 'pickup' | 'dine-in';
  delivery_address?: string | null;
  payment_method: 'pay_in_store' | 'cash_on_delivery' | 'card_on_delivery';
  special_instructions?: string;
  discount_code?: string;
}

export interface PlaceOrderResponse {
  id: string;
  order_number: number;
  status: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  estimated_time: number;
  points_to_earn: number;
}

export const ordersAPI = {
  place: (payload: PlaceOrderPayload) =>
    api.post<PlaceOrderResponse>('/api/orders', payload),

  validateDiscount: (code: string, subtotal: number) =>
    api.post<{ code: string; discount: number; description: string }>(
      '/api/orders/validate-discount',
      { code, subtotal }
    ),

  cancel: (orderId: string) => api.post(`/api/orders/${orderId}/cancel`),

  getHistory: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    from_date?: string;
    to_date?: string;
  }) => api.get('/api/orders/history', { params }),

  getOne: (orderId: string) => api.get<Order>(`/api/orders/${orderId}`),

  getStatus: (orderId: string) => api.get(`/api/orders/${orderId}/status`),

  submitReview: (orderId: string, review: {
    overall_rating: number;
    food_rating?: number;
    delivery_rating?: number;
    comment?: string;
    would_recommend?: boolean;
  }) => api.post(`/api/orders/${orderId}/review`, review),

  reorder: (orderId: string) => api.post(`/api/orders/${orderId}/reorder`),

  quickReorder: (orderId: string, existingCartId?: string) =>
    api.post(`/api/orders/${orderId}/quick-reorder`, { existing_cart_id: existingCartId }),

  // Scheduled orders
  getScheduled: () => api.get('/api/orders/scheduled'),

  createScheduled: (data: {
    cart_id: string;
    scheduled_date: string;
    scheduled_time: string;
    delivery_address?: object;
    store_id: string;
    order_type: 'delivery' | 'pickup';
    payment_method?: string;
    special_instructions?: string;
    discount_code?: string;
  }) => api.post('/api/orders/schedule', data),

  cancelScheduled: (orderId: string) => 
    api.delete(`/api/orders/scheduled/${orderId}`),

  modifyScheduled: (orderId: string, data: {
    scheduled_date: string;
    scheduled_time: string;
  }) => api.put(`/api/orders/scheduled/${orderId}`, data),
};

// Reviews
export const reviewsAPI = {
  markHelpful: (reviewId: string) => api.post(`/api/reviews/${reviewId}/helpful`),

  getUserReviews: () => api.get('/api/auth/reviews'),
};

// Referrals
export const referralAPI = {
  getInfo: () => api.get<ReferralInfo>('/api/referral'),

  apply: (referralCode: string) => 
    api.post('/api/referral/apply', { referral_code: referralCode }),

  validate: (code: string) => api.get(`/api/referral/validate/${code}`),
};

// Recommendations
export const recommendationsAPI = {
  get: () => api.get('/api/recommendations'),
};

// Cart (backend sync)
export const cartAPI = {
  get: (sessionId: string) => api.get(`/api/cart/${sessionId}`),

  addItem: (sessionId: string, item: CartItem) => 
    api.post(`/api/cart/${sessionId}/add`, item),

  updateItem: (sessionId: string, itemId: string, quantity: number) =>
    api.put(`/api/cart/${sessionId}/item/${itemId}`, { quantity }),

  removeItem: (sessionId: string, itemId: string) =>
    api.delete(`/api/cart/${sessionId}/item/${itemId}`),

  clear: (sessionId: string) => api.delete(`/api/cart/${sessionId}`),
};

// Newsletter
export const newsletterAPI = {
  subscribe: (email: string) => 
    api.post('/api/newsletter/subscribe', { email }),

  unsubscribe: (email: string) => 
    api.post('/api/newsletter/unsubscribe', { email }),
};

// Contact
export const contactAPI = {
  submit: (data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
  }) => api.post('/api/contact', data),
};

// Bookings
export const bookingsAPI = {
  getMine: () => api.get('/api/bookings'),

  cancel: (bookingId: string) => api.post(`/api/bookings/${bookingId}/cancel`),

  create: (data: {
    store_id: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    date: string;
    time: string;
    party_size: number;
    special_requests?: string;
  }) => api.post('/api/bookings', data),
};

// Franchise / catering / career enquiries
export const enquiriesAPI = {
  submit: (data: {
    type: 'franchise' | 'catering' | 'career';
    name: string;
    email: string;
    phone: string;
    message?: string;
    details?: Record<string, string>;
  }) => api.post('/api/enquiries', data),
};

// Turn an axios error into a message fit for the user.
export const apiErrorMessage = (
  error: any,
  fallback = 'Something went wrong. Please try again.'
) => {
  if (error?.response?.data?.detail) return String(error.response.data.detail);
  if (error?.code === 'ECONNABORTED' || error?.message === 'Network Error') {
    return "Can't reach Naan Staap right now. Check your connection and try again.";
  }
  return fallback;
};

export { API_URL };
export default api;
