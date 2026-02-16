import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeContext";
import { useAddressStore } from "../store/addressStore";
import { useAuthStore } from "../store/authStore";
import { Address } from "../services/api";
import { AnimatedButton, SlideInView } from "../components/AnimatedComponents";
import { EmptyState } from "../components/EmptyState";
import { lightHaptic, successHaptic, errorHaptic } from "../utils/haptics";

const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";

interface AddressFormData {
  label: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  postcode: string;
  delivery_instructions: string;
  is_default: boolean;
}

const initialFormData: AddressFormData = {
  label: "Home",
  address_line_1: "",
  address_line_2: "",
  city: "",
  postcode: "",
  delivery_instructions: "",
  is_default: false,
};

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuthStore();
  const {
    addresses,
    isLoading,
    error,
    fetchAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    clearError,
  } = useAddressStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const labelOptions = ["Home", "Work", "Partner", "Other"];

  const loadAddresses = useCallback(async () => {
    await fetchAddresses();
  }, [fetchAddresses]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated, loadAddresses]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
      clearError();
    }
  }, [error, clearError]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAddresses();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditingAddress(null);
    setFormData(initialFormData);
    setShowModal(true);
    lightHaptic();
  };

  const openEditModal = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || "",
      city: address.city,
      postcode: address.postcode,
      delivery_instructions: address.delivery_instructions || "",
      is_default: address.is_default,
    });
    setShowModal(true);
    lightHaptic();
  };

  const handleSubmit = async () => {
    if (!formData.address_line_1 || !formData.city || !formData.postcode) {
      errorHaptic();
      Alert.alert("Missing Information", "Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    const addressData = {
      ...formData,
      full_address: `${formData.address_line_1}${
        formData.address_line_2 ? ", " + formData.address_line_2 : ""
      }, ${formData.city}, ${formData.postcode}`,
    };

    let success = false;
    if (editingAddress) {
      success = await updateAddress(editingAddress.id, addressData);
    } else {
      success = await addAddress(addressData as any);
    }

    setSubmitting(false);

    if (success) {
      successHaptic();
      setShowModal(false);
      Alert.alert(
        "Success",
        editingAddress ? "Address updated!" : "Address added!"
      );
    }
  };

  const handleDelete = (address: Address) => {
    Alert.alert(
      "Delete Address",
      `Are you sure you want to delete "${address.label}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await deleteAddress(address.id);
            if (success) {
              successHaptic();
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (address: Address) => {
    if (address.is_default) return;

    lightHaptic();
    const success = await setDefaultAddress(address.id);
    if (success) {
      successHaptic();
    }
  };

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case "home":
        return "home";
      case "work":
        return "briefcase";
      case "partner":
        return "heart";
      default:
        return "location";
    }
  };

  if (!isAuthenticated) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <EmptyState
          icon="location-outline"
          title="Sign in to manage addresses"
          message="Save your delivery addresses for faster checkout"
          actionLabel="Sign In"
          onAction={() => router.push("/auth/login")}
        />
      </View>
    );
  }

  if (isLoading && addresses.length === 0) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={BRAND_GOLD} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading addresses...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            lightHaptic();
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          My Addresses
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color={BRAND_GOLD} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND_GOLD}
          />
        }
      >
        {addresses.length === 0 ? (
          <EmptyState
            icon="location-outline"
            title="No saved addresses"
            message="Add an address for faster checkout"
            actionLabel="Add Address"
            onAction={openAddModal}
          />
        ) : (
          addresses.map((address, index) => (
            <SlideInView key={address.id} delay={index * 100}>
              <TouchableOpacity
                style={[
                  styles.addressCard,
                  { backgroundColor: colors.card },
                  address.is_default && styles.defaultCard,
                ]}
                onPress={() => openEditModal(address)}
                activeOpacity={0.7}
              >
                <View style={styles.addressHeader}>
                  <View style={styles.labelContainer}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: BRAND_PURPLE + "20" },
                      ]}
                    >
                      <Ionicons
                        name={getLabelIcon(address.label) as any}
                        size={20}
                        color={BRAND_PURPLE}
                      />
                    </View>
                    <View>
                      <Text
                        style={[styles.addressLabel, { color: colors.text }]}
                      >
                        {address.label}
                      </Text>
                      {address.is_default && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultText}>Default</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.actionButtons}>
                    {!address.is_default && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleSetDefault(address)}
                      >
                        <Ionicons
                          name="star-outline"
                          size={20}
                          color={BRAND_GOLD}
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(address)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#E74C3C"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.fullAddress, { color: colors.text }]}>
                  {address.address_line_1}
                </Text>
                {address.address_line_2 && (
                  <Text
                    style={[styles.addressLine2, { color: colors.textMuted }]}
                  >
                    {address.address_line_2}
                  </Text>
                )}
                <Text
                  style={[styles.cityPostcode, { color: colors.textMuted }]}
                >
                  {address.city}, {address.postcode}
                </Text>

                {address.delivery_instructions && (
                  <View style={styles.instructionsContainer}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[styles.instructions, { color: colors.textMuted }]}
                    >
                      {address.delivery_instructions}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </SlideInView>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                lightHaptic();
                setShowModal(false);
              }}
            >
              <Text style={[styles.cancelButton, { color: colors.textMuted }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingAddress ? "Edit Address" : "Add Address"}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Label Selection */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Label
            </Text>
            <View style={styles.labelOptions}>
              {labelOptions.map((label) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.labelOption,
                    { borderColor: colors.border },
                    formData.label === label && styles.labelOptionSelected,
                  ]}
                  onPress={() => {
                    lightHaptic();
                    setFormData({ ...formData, label });
                  }}
                >
                  <Ionicons
                    name={getLabelIcon(label) as any}
                    size={18}
                    color={formData.label === label ? "#fff" : colors.text}
                  />
                  <Text
                    style={[
                      styles.labelOptionText,
                      {
                        color: formData.label === label ? "#fff" : colors.text,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Address Line 1 */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Address Line 1 *
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, color: colors.text },
              ]}
              placeholder="House number and street name"
              placeholderTextColor={colors.textMuted}
              value={formData.address_line_1}
              onChangeText={(text) =>
                setFormData({ ...formData, address_line_1: text })
              }
            />

            {/* Address Line 2 */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Address Line 2
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, color: colors.text },
              ]}
              placeholder="Apartment, suite, unit, etc. (optional)"
              placeholderTextColor={colors.textMuted}
              value={formData.address_line_2}
              onChangeText={(text) =>
                setFormData({ ...formData, address_line_2: text })
              }
            />

            {/* City */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              City *
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, color: colors.text },
              ]}
              placeholder="City"
              placeholderTextColor={colors.textMuted}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />

            {/* Postcode */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Postcode *
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, color: colors.text },
              ]}
              placeholder="Postcode"
              placeholderTextColor={colors.textMuted}
              value={formData.postcode}
              onChangeText={(text) =>
                setFormData({ ...formData, postcode: text.toUpperCase() })
              }
              autoCapitalize="characters"
            />

            {/* Delivery Instructions */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Delivery Instructions
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.card, color: colors.text },
              ]}
              placeholder="E.g., Ring doorbell, leave at door, etc."
              placeholderTextColor={colors.textMuted}
              value={formData.delivery_instructions}
              onChangeText={(text) =>
                setFormData({ ...formData, delivery_instructions: text })
              }
              multiline
              numberOfLines={3}
            />

            {/* Set as Default */}
            <TouchableOpacity
              style={styles.defaultToggle}
              onPress={() => {
                lightHaptic();
                setFormData({ ...formData, is_default: !formData.is_default });
              }}
            >
              <Ionicons
                name={formData.is_default ? "checkbox" : "square-outline"}
                size={24}
                color={formData.is_default ? BRAND_GOLD : colors.textMuted}
              />
              <Text style={[styles.defaultToggleText, { color: colors.text }]}>
                Set as default address
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.modalFooter}>
            <AnimatedButton
              style={
                [
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ] as any
              }
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingAddress ? "Update Address" : "Add Address"}
                </Text>
              )}
            </AnimatedButton>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  addressCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  defaultCard: {
    borderWidth: 2,
    borderColor: BRAND_GOLD,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  addressLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  defaultBadge: {
    backgroundColor: BRAND_GOLD,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  defaultText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  fullAddress: {
    fontSize: 16,
    marginBottom: 4,
  },
  addressLine2: {
    fontSize: 14,
    marginBottom: 4,
  },
  cityPostcode: {
    fontSize: 14,
  },
  instructionsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  instructions: {
    fontSize: 13,
    flex: 1,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cancelButton: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  labelOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  labelOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  labelOptionSelected: {
    backgroundColor: BRAND_PURPLE,
    borderColor: BRAND_PURPLE,
  },
  labelOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  defaultToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    paddingVertical: 8,
  },
  defaultToggleText: {
    fontSize: 16,
  },
  modalFooter: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    backgroundColor: BRAND_PURPLE,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
