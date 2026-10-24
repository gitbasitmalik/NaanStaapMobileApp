import { create } from 'zustand';
import api, { addressAPI, apiErrorMessage } from '../services/api';

// Saved address as stored by the API (backend/server.js "SAVED ADDRESSES").
// Note the API uses `address_line1` / `address_line2` (no underscore before the digit).
export interface SavedAddress {
  id: string;
  label: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  postcode: string;
  country?: string;
  is_default: boolean;
  delivery_instructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export type AddressInput = {
  label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
  is_default?: boolean;
  delivery_instructions?: string;
};

/** One-line summary, e.g. for checkout. */
export const formatAddress = (a: Pick<SavedAddress, 'address_line1' | 'address_line2' | 'city' | 'postcode'>) =>
  [a.address_line1, a.address_line2, a.city, a.postcode].filter(Boolean).join(', ');

// UK postcode (incl. GIR 0AA); spaces optional.
const UK_POSTCODE = /^(GIR ?0AA|[A-PR-UWYZ][A-HK-Y]?\d[A-Z\d]? ?\d[ABD-HJLNP-UW-Z]{2})$/i;

export const isValidUkPostcode = (value: string) => UK_POSTCODE.test(value.trim());

/** "sw1a1aa" -> "SW1A 1AA" */
export const normalisePostcode = (value: string) => {
  const compact = value.replace(/\s+/g, '').toUpperCase();
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
};

type Result = { ok: boolean; error?: string };

interface AddressState {
  addresses: SavedAddress[];
  selectedAddress: SavedAddress | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;

  fetchAddresses: () => Promise<boolean>;
  addAddress: (address: AddressInput) => Promise<Result>;
  updateAddress: (addressId: string, address: Partial<AddressInput>) => Promise<Result>;
  deleteAddress: (addressId: string) => Promise<Result>;
  setDefaultAddress: (addressId: string) => Promise<Result>;
  selectAddress: (addressId: string) => void;
  getDefaultAddress: () => SavedAddress | null;
  clearError: () => void;
}

const pickSelected = (addresses: SavedAddress[], current: SavedAddress | null) =>
  (current && addresses.find((a) => a.id === current.id)) ||
  addresses.find((a) => a.is_default) ||
  addresses[0] ||
  null;

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  selectedAddress: null,
  isLoading: false,
  hasLoaded: false,
  error: null,

  fetchAddresses: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await addressAPI.getAll();
      const addresses = ((response.data as unknown as SavedAddress[]) || []).slice();
      set((state) => ({
        addresses,
        selectedAddress: pickSelected(addresses, state.selectedAddress),
        isLoading: false,
        hasLoaded: true,
      }));
      return true;
    } catch (error) {
      set({
        isLoading: false,
        hasLoaded: true,
        error: apiErrorMessage(error, "We couldn't load your addresses."),
      });
      return false;
    }
  },

  addAddress: async (address) => {
    try {
      await api.post('/api/addresses', address);
      await get().fetchAddresses();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: apiErrorMessage(error, "We couldn't save that address.") };
    }
  },

  updateAddress: async (addressId, address) => {
    try {
      await api.put(`/api/addresses/${addressId}`, address);
      await get().fetchAddresses();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: apiErrorMessage(error, "We couldn't update that address.") };
    }
  },

  deleteAddress: async (addressId) => {
    try {
      await addressAPI.delete(addressId);
      await get().fetchAddresses();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: apiErrorMessage(error, "We couldn't delete that address.") };
    }
  },

  setDefaultAddress: async (addressId) => {
    try {
      await addressAPI.setDefault(addressId);
      set((state) => ({
        addresses: state.addresses
          .map((a) => ({ ...a, is_default: a.id === addressId }))
          .sort((a, b) => Number(b.is_default) - Number(a.is_default)),
      }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: apiErrorMessage(error, "We couldn't change your default address.") };
    }
  },

  selectAddress: (addressId) => {
    const address = get().addresses.find((a) => a.id === addressId);
    set({ selectedAddress: address || null });
  },

  getDefaultAddress: () => get().addresses.find((a) => a.is_default) || get().addresses[0] || null,

  clearError: () => set({ error: null }),
}));
