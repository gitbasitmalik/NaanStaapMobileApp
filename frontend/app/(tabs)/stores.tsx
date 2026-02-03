import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { useTheme } from "../../theme/ThemeContext";
import { lightHaptic, mediumHaptic } from "../../utils/haptics";

const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

interface StoreHours {
  day: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  city: string;
  postcode: string;
  latitude: number;
  longitude: number;
  google_maps_url: string;
  image_url: string;
  hours: StoreHours[];
  is_open_now: boolean;
  delivery_available: boolean;
  dine_in_available: boolean;
  takeaway_available: boolean;
}

export default function StoresScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stores`);
      setStores(response.data);
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleDirections = (store: Store) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${store.latitude},${store.longitude}`,
      android: `google.navigation:q=${store.latitude},${store.longitude}`,
      default: store.google_maps_url,
    });
    Linking.openURL(url as string).catch(() => {
      Linking.openURL(store.google_maps_url);
    });
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={BRAND_GOLD} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Finding Stores...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Our Stores
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          Find your nearest Naan Staap and vibe with the flavours of South Asia
        </Text>
      </View>

      <View style={styles.storeCount}>
        <Ionicons name="storefront" size={20} color={BRAND_GOLD} />
        <Text style={[styles.storeCountText, { color: colors.text }]}>
          {stores.length} Locations across UK
        </Text>
      </View>

      <ScrollView
        style={styles.storeList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.storeListContent}
      >
        {stores.map((store) => (
          <TouchableOpacity
            key={store.id}
            style={[styles.storeCard, { backgroundColor: colors.surface }]}
            onPress={() => {
              lightHaptic();
              setSelectedStore(store);
            }}
          >
            <View style={styles.storeHeader}>
              <View
                style={[
                  styles.storeIconContainer,
                  { backgroundColor: isDark ? "#2D1A28" : "#E8D5E0" },
                ]}
              >
                <Ionicons name="location" size={24} color={BRAND_PURPLE} />
              </View>
              <View style={styles.storeInfo}>
                <Text style={[styles.storeName, { color: colors.text }]}>
                  {store.name}
                </Text>
                <Text style={styles.storeCity}>{store.city}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  store.is_open_now ? styles.openBadge : styles.closedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: store.is_open_now ? "#28A745" : "#DC3545" },
                  ]}
                >
                  {store.is_open_now ? "Open" : "Closed"}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.storeDetails,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.detailRow}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.detailText, { color: colors.textSecondary }]}
                >
                  {store.address}, {store.postcode}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.detailText, { color: colors.textSecondary }]}
                >
                  {store.phone}
                </Text>
              </View>
            </View>

            <View style={styles.servicesBadges}>
              {store.dine_in_available && (
                <View
                  style={[
                    styles.serviceBadge,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={12}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.serviceBadgeText,
                      { color: colors.textMuted },
                    ]}
                  >
                    Dine-in
                  </Text>
                </View>
              )}
              {store.takeaway_available && (
                <View
                  style={[
                    styles.serviceBadge,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Ionicons
                    name="bag-handle-outline"
                    size={12}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.serviceBadgeText,
                      { color: colors.textMuted },
                    ]}
                  >
                    Takeaway
                  </Text>
                </View>
              )}
              {store.delivery_available && (
                <View
                  style={[
                    styles.serviceBadge,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Ionicons
                    name="bicycle-outline"
                    size={12}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.serviceBadgeText,
                      { color: colors.textMuted },
                    ]}
                  >
                    Delivery
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.storeActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.callButton]}
                onPress={() => {
                  mediumHaptic();
                  handleCall(store.phone);
                }}
              >
                <Ionicons name="call" size={18} color="#FFF" />
                <Text style={styles.actionButtonText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.directionsButton]}
                onPress={() => {
                  mediumHaptic();
                  handleDirections(store);
                }}
              >
                <Ionicons name="navigate" size={18} color="#FFF" />
                <Text style={styles.actionButtonText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        <View style={[styles.footerNote, { backgroundColor: colors.surface }]}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.textMuted}
          />
          <Text style={[styles.footerNoteText, { color: colors.textMuted }]}>
            Opening hours may vary by location. Please call ahead to confirm.
          </Text>
        </View>
      </ScrollView>

      {/* Store Detail Modal */}
      <Modal visible={!!selectedStore} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedStore(null)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            {selectedStore && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                  source={{
                    uri:
                      selectedStore.image_url ||
                      "https://images.unsplash.com/photo-1556745750-68295fefafc5?w=400",
                  }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <View style={styles.modalDetails}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedStore.name}
                  </Text>
                  <Text
                    style={[styles.modalAddress, { color: colors.textMuted }]}
                  >
                    {selectedStore.address}, {selectedStore.city}{" "}
                    {selectedStore.postcode}
                  </Text>

                  <View style={styles.modalSection}>
                    <Text
                      style={[styles.modalSectionTitle, { color: colors.text }]}
                    >
                      Contact
                    </Text>
                    <TouchableOpacity
                      style={styles.modalContactRow}
                      onPress={() => {
                        mediumHaptic();
                        handleCall(selectedStore.phone);
                      }}
                    >
                      <Ionicons name="call" size={20} color={BRAND_GOLD} />
                      <Text style={styles.modalContactText}>
                        {selectedStore.phone}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalSection}>
                    <Text
                      style={[styles.modalSectionTitle, { color: colors.text }]}
                    >
                      Opening Hours
                    </Text>
                    {selectedStore.hours.map((hour) => (
                      <View
                        key={hour.day}
                        style={[
                          styles.hoursRow,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.hoursDay,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {hour.day}
                        </Text>
                        <Text
                          style={[styles.hoursTime, { color: colors.text }]}
                        >
                          {hour.is_closed
                            ? "Closed"
                            : `${hour.open_time} - ${hour.close_time}`}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.modalServices}>
                    <Text
                      style={[styles.modalSectionTitle, { color: colors.text }]}
                    >
                      Services
                    </Text>
                    <View style={styles.modalServicesList}>
                      <View
                        style={[
                          styles.modalServiceItem,
                          { backgroundColor: colors.background },
                          selectedStore.dine_in_available &&
                            styles.serviceActive,
                        ]}
                      >
                        <Ionicons
                          name="restaurant"
                          size={24}
                          color={
                            selectedStore.dine_in_available
                              ? BRAND_GOLD
                              : colors.textMuted
                          }
                        />
                        <Text
                          style={[
                            styles.modalServiceText,
                            { color: colors.textMuted },
                            selectedStore.dine_in_available &&
                              styles.serviceTextActive,
                          ]}
                        >
                          Dine-in
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.modalServiceItem,
                          { backgroundColor: colors.background },
                          selectedStore.takeaway_available &&
                            styles.serviceActive,
                        ]}
                      >
                        <Ionicons
                          name="bag-handle"
                          size={24}
                          color={
                            selectedStore.takeaway_available
                              ? BRAND_GOLD
                              : colors.textMuted
                          }
                        />
                        <Text
                          style={[
                            styles.modalServiceText,
                            { color: colors.textMuted },
                            selectedStore.takeaway_available &&
                              styles.serviceTextActive,
                          ]}
                        >
                          Takeaway
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.modalServiceItem,
                          { backgroundColor: colors.background },
                          selectedStore.delivery_available &&
                            styles.serviceActive,
                        ]}
                      >
                        <Ionicons
                          name="bicycle"
                          size={24}
                          color={
                            selectedStore.delivery_available
                              ? BRAND_GOLD
                              : colors.textMuted
                          }
                        />
                        <Text
                          style={[
                            styles.modalServiceText,
                            { color: colors.textMuted },
                            selectedStore.delivery_available &&
                              styles.serviceTextActive,
                          ]}
                        >
                          Delivery
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalActionBtn}
                      onPress={() => {
                        mediumHaptic();
                        handleCall(selectedStore.phone);
                      }}
                    >
                      <Ionicons name="call" size={20} color="#FFF" />
                      <Text style={styles.modalActionText}>Call Store</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalActionBtn, styles.directionsModalBtn]}
                      onPress={() => {
                        mediumHaptic();
                        handleDirections(selectedStore);
                      }}
                    >
                      <Ionicons name="navigate" size={20} color="#FFF" />
                      <Text style={styles.modalActionText}>Get Directions</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },
  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  headerSubtitle: { fontSize: 13, lineHeight: 18 },
  storeCount: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  storeCountText: { fontSize: 14, fontWeight: "600" },
  storeList: { flex: 1 },
  storeListContent: { padding: 16, paddingBottom: 40 },
  storeCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  storeHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  storeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 18, fontWeight: "bold" },
  storeCity: { fontSize: 13, color: BRAND_GOLD, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  openBadge: { backgroundColor: "rgba(40, 167, 69, 0.2)" },
  closedBadge: { backgroundColor: "rgba(220, 53, 69, 0.2)" },
  statusText: { fontSize: 12, fontWeight: "600" },
  storeDetails: { borderRadius: 12, padding: 12, marginBottom: 12 },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  detailText: { fontSize: 13, flex: 1, lineHeight: 18 },
  servicesBadges: { flexDirection: "row", gap: 8, marginBottom: 12 },
  serviceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  serviceBadgeText: { fontSize: 11 },
  storeActions: { flexDirection: "row", gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  callButton: { backgroundColor: "#28A745" },
  directionsButton: { backgroundColor: BRAND_PURPLE },
  actionButtonText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  footerNoteText: { fontSize: 12, flex: 1, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 20,
  },
  modalImage: { width: "100%", height: 180 },
  modalDetails: { padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: "bold" },
  modalAddress: { fontSize: 14, marginTop: 4 },
  modalSection: { marginTop: 20 },
  modalSectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  modalContactRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalContactText: { fontSize: 16, fontWeight: "500" },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  hoursDay: { fontSize: 14 },
  hoursTime: { fontSize: 14, fontWeight: "500" },
  modalServices: { marginTop: 20 },
  modalServicesList: { flexDirection: "row", justifyContent: "space-around" },
  modalServiceItem: {
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  serviceActive: { borderWidth: 1, borderColor: BRAND_GOLD },
  modalServiceText: { fontSize: 12, marginTop: 8 },
  serviceTextActive: { color: "#FFF" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  modalActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28A745",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  directionsModalBtn: { backgroundColor: BRAND_PURPLE },
  modalActionText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
});
