import { create } from 'zustand';
import { addressAPI, Address } from '../services/api';

interface AddressState {
  addresses: Address[];
  selectedAddress: Address | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAddresses: () => Promise<void>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<boolean>;
  updateAddress: (addressId: string, address: Partial<Address>) => Promise<boolean>;
  deleteAddress: (addressId: string) => Promise<boolean>;
  setDefaultAddress: (addressId: string) => Promise<boolean>;
  selectAddress: (addressId: string) => void;
  getDefaultAddress: () => Address | null;
  clearError: () => void;
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  selectedAddress: null,
  isLoading: false,
  error: null,

  fetchAddresses: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await addressAPI.getAll();
      const addresses = response.data;
      const defaultAddress = addresses.find((a: Address) => a.is_default) || addresses[0] || null;
      set({ 
        addresses, 
        selectedAddress: get().selectedAddress || defaultAddress,
        isLoading: false 
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch addresses',
      });
    }
  },

  addAddress: async (address) => {
    set({ isLoading: true, error: null });
    try {
      const response = await addressAPI.create(address);
      const newAddress = response.data.address || response.data;
      set((state) => ({
        addresses: [...state.addresses, newAddress],
        selectedAddress: address.is_default ? newAddress : state.selectedAddress,
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to add address',
      });
      return false;
    }
  },

  updateAddress: async (addressId, address) => {
    set({ isLoading: true, error: null });
    try {
      const response = await addressAPI.update(addressId, address);
      const updatedAddress = response.data.address || response.data;
      set((state) => ({
        addresses: state.addresses.map((a) =>
          a.id === addressId ? { ...a, ...updatedAddress } : a
        ),
        selectedAddress: state.selectedAddress?.id === addressId 
          ? { ...state.selectedAddress, ...updatedAddress }
          : state.selectedAddress,
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to update address',
      });
      return false;
    }
  },

  deleteAddress: async (addressId) => {
    set({ isLoading: true, error: null });
    try {
      await addressAPI.delete(addressId);
      set((state) => {
        const newAddresses = state.addresses.filter((a) => a.id !== addressId);
        return {
          addresses: newAddresses,
          selectedAddress: state.selectedAddress?.id === addressId 
            ? newAddresses.find((a) => a.is_default) || newAddresses[0] || null
            : state.selectedAddress,
          isLoading: false,
        };
      });
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to delete address',
      });
      return false;
    }
  },

  setDefaultAddress: async (addressId) => {
    set({ isLoading: true, error: null });
    try {
      await addressAPI.setDefault(addressId);
      set((state) => ({
        addresses: state.addresses.map((a) => ({
          ...a,
          is_default: a.id === addressId,
        })),
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to set default address',
      });
      return false;
    }
  },

  selectAddress: (addressId) => {
    const address = get().addresses.find((a) => a.id === addressId);
    set({ selectedAddress: address || null });
  },

  getDefaultAddress: () => {
    return get().addresses.find((a) => a.is_default) || get().addresses[0] || null;
  },

  clearError: () => set({ error: null }),
}));
