import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, BRAND, FONTS } from "../../theme/ThemeContext";
import { storesAPI, Store } from "../../services/api";
import { BrandButton } from "../../components/ui";
import { EmptyState } from "../../components/EmptyState";
import { StoreCardSkeleton } from "../../components/Skeleton";
import { useCheckoutStore } from "../../store/checkoutStore";
import { lightHaptic, mediumHaptic } from "../../utils/haptics";

const formatPhone = (phone: string) =>
  phone.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1 $2 $3");

export default function StoresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const setStoreId = useCheckoutStore((s) => s.setStoreId);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    try {
      const response = await storesAPI.getAll();
      setStores(response.data);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) =>
      [s.name, s.city, s.postcode, s.address].some((v) => v?.toLowerCase().includes(q))
    );
  }, [stores, query]);

  const openNow = stores.filter((s) => s.is_open_now).length;

  const orderFrom = (store: Store) => {
    mediumHaptic();
    setStoreId(store.id);
    router.push("/menu");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.headerScript}>Pull up & vibe</Text>
        <Text style={styles.headerTitle}>Our Stores</Text>
        {!loading && stores.length > 0 && (
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {stores.length} locations · {openNow} open now
          </Text>
        )}
      </View>

      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by town or postcode"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <StoreCardSkeleton key={i} />
          ))}
        </View>
      ) : failed && stores.length === 0 ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load stores"
          message="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            fetchStores();
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchStores();
              }}
              tintColor={BRAND.gold}
            />
          }
        >
          {filtered.length === 0 && (
            <Text style={[styles.empty, { color: colors.textMuted }]}>No stores match “{query}”.</Text>
          )}
          {filtered.map((store) => {
            const isOpen = expanded === store.id;
            return (
              <View key={store.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                {store.image_url ? <Image source={{ uri: store.image_url }} style={styles.image} /> : null}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    lightHaptic();
                    setExpanded(isOpen ? null : store.id);
                  }}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.pin}>
                      <Ionicons name="location" size={22} color={BRAND.orange} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.name, { color: colors.text }]}>{store.name}</Text>
                      <Text style={[styles.address, { color: colors.textMuted }]}>{store.address}</Text>
                    </View>
                    <View
                      style={[
                        styles.status,
                        { backgroundColor: store.is_open_now ? "rgba(190,214,48,0.18)" : "rgba(255,107,107,0.18)" },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: store.is_open_now ? BRAND.lime : colors.error }]}>
                        {store.is_open_now ? "Open" : "Closed"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>{store.hours_summary}</Text>
                  </View>
                  <View style={styles.services}>
                    {store.dine_in_available && <Service icon="restaurant-outline" label="Dine in" />}
                    {store.takeaway_available && <Service icon="bag-handle-outline" label="Collection" />}
                    {store.delivery_available && <Service icon="bicycle-outline" label="Delivery" />}
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View style={[styles.hours, { borderTopColor: colors.border }]}>
                    {store.hours.map((h) => (
                      <View key={h.day} style={styles.hoursRow}>
                        <Text style={[styles.hoursDay, { color: colors.textSecondary }]}>{h.day}</Text>
                        <Text style={[styles.hoursTime, { color: colors.text }]}>
                          {h.is_closed ? "Closed" : `${h.open_time} – ${h.close_time}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.iconBtn, { borderColor: colors.border }]}
                    onPress={() => Linking.openURL(`tel:${store.phone}`)}
                    accessibilityLabel={`Call ${store.name} on ${formatPhone(store.phone)}`}
                  >
                    <Ionicons name="call" size={18} color={BRAND.gold} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, { borderColor: colors.border }]}
                    onPress={() => Linking.openURL(store.google_maps_url)}
                    accessibilityLabel={`Directions to ${store.name}`}
                  >
                    <Ionicons name="navigate" size={18} color={BRAND.gold} />
                  </TouchableOpacity>
                  <BrandButton
                    title="Order from here"
                    size="sm"
                    icon="bag-handle"
                    onPress={() => orderFrom(store)}
                    style={styles.flex}
                  />
                </View>
              </View>
            );
          })}

          <TouchableOpacity style={styles.bookBanner} onPress={() => router.push("/book-table")}>
            <Ionicons name="calendar" size={26} color={BRAND.purpleDeep} />
            <View style={styles.flex}>
              <Text style={styles.bookTitle}>Book a table</Text>
              <Text style={styles.bookText}>Reserve your spot at any Naan Staap.</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={BRAND.purpleDeep} />
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function Service({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.service, { borderColor: colors.border }]}>
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <Text style={[styles.serviceText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  headerScript: { fontFamily: FONTS.script, fontSize: 24, color: BRAND.orange },
  headerTitle: { fontSize: 32, fontWeight: "900", color: BRAND.gold, marginTop: -4 },
  headerSub: { fontSize: 13, marginTop: 2 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15 },
  list: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: "center", marginTop: 30 },
  card: { borderRadius: 20, marginBottom: 14, overflow: "hidden" },
  image: { width: "100%", height: 140 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingBottom: 8 },
  pin: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(240,90,34,0.15)",
  },
  name: { fontSize: 18, fontWeight: "900" },
  address: { fontSize: 13, marginTop: 2 },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14 },
  meta: { fontSize: 13 },
  services: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 14, marginTop: 10 },
  service: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  serviceText: { fontSize: 11, fontWeight: "600" },
  hours: { borderTopWidth: 1, marginTop: 12, marginHorizontal: 14, paddingTop: 10 },
  hoursRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  hoursDay: { fontSize: 13 },
  hoursTime: { fontSize: 13, fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: BRAND.gold,
    marginTop: 6,
  },
  bookTitle: { fontSize: 17, fontWeight: "900", color: BRAND.purpleDeep },
  bookText: { fontSize: 13, color: BRAND.purpleDeep, marginTop: 2 },
});
