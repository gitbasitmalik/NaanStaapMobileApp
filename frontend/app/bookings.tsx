import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND, brandTheme } from "../theme/ThemeContext";
import { ScreenHeader, BrandButton } from "../components/ui";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { useAuthStore } from "../store/authStore";
import { bookingsAPI, apiErrorMessage } from "../services/api";
import { lightHaptic, successHaptic } from "../utils/haptics";

interface Booking {
  id: string;
  store_id?: string;
  store_name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  party_size: number;
  status: string; // requested | confirmed | cancelled | ...
  special_requests?: string;
  created_at?: string;
}

const bookingDate = (b: Booking) => {
  const d = new Date(`${b.date}T${b.time || "00:00"}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isUpcoming = (b: Booking) => {
  const d = bookingDate(b);
  return !!d && d.getTime() >= Date.now();
};

const formatDay = (b: Booking) => {
  const d = bookingDate(b);
  if (!d) return b.date;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

const formatTime = (b: Booking) => {
  const d = bookingDate(b);
  if (!d) return b.time;
  return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
};

const STATUS_META: Record<string, { label: string; tint: string; bg: string }> = {
  requested: { label: "Requested", tint: BRAND.gold, bg: "rgba(255,215,79,0.15)" },
  pending: { label: "Requested", tint: BRAND.gold, bg: "rgba(255,215,79,0.15)" },
  confirmed: { label: "Confirmed", tint: BRAND.lime, bg: "rgba(190,214,48,0.15)" },
  completed: { label: "Completed", tint: BRAND.lime, bg: "rgba(190,214,48,0.15)" },
  cancelled: { label: "Cancelled", tint: brandTheme.error, bg: "rgba(255,107,107,0.15)" },
};

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await bookingsAPI.getMine();
      setBookings(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (error) {
      const message = apiErrorMessage(error, "We couldn't load your bookings.");
      setLoadError(message);
      showToast({ message, type: "error" });
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sections = useMemo(() => {
    const upcoming = bookings
      .filter((b) => isUpcoming(b) && b.status !== "cancelled")
      .sort((a, b) => (bookingDate(a)?.getTime() ?? 0) - (bookingDate(b)?.getTime() ?? 0));
    const past = bookings
      .filter((b) => !upcoming.includes(b))
      .sort((a, b) => (bookingDate(b)?.getTime() ?? 0) - (bookingDate(a)?.getTime() ?? 0));
    return [
      ...(upcoming.length ? [{ title: "Upcoming", data: upcoming }] : []),
      ...(past.length ? [{ title: "Past & cancelled", data: past }] : []),
    ];
  }, [bookings]);

  const confirmCancel = (booking: Booking) => {
    Alert.alert(
      "Cancel booking?",
      `Your table for ${booking.party_size} at ${booking.store_name} on ${formatDay(booking)} at ${formatTime(
        booking
      )} will be cancelled.`,
      [
        { text: "Keep booking", style: "cancel" },
        {
          text: "Cancel booking",
          style: "destructive",
          onPress: async () => {
            setCancellingId(booking.id);
            try {
              await bookingsAPI.cancel(booking.id);
              successHaptic();
              setBookings((list) =>
                list.map((b) => (b.id === booking.id ? { ...b, status: "cancelled" } : b))
              );
              showToast({ message: "Booking cancelled", type: "success" });
            } catch (error) {
              showToast({
                message: apiErrorMessage(error, "We couldn't cancel that booking."),
                type: "error",
              });
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const bookTable = () => {
    lightHaptic();
    router.push("/book-table");
  };

  // ----- Signed out -----
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="My bookings" />
        {authLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={BRAND.gold} size="large" />
          </View>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="Sign in to see your bookings"
            message="Bookings made while signed in appear here so you can check or cancel them."
            actionLabel="Sign in"
            onAction={() => router.push("/auth/login")}
          />
        )}
      </View>
    );
  }

  const renderBooking = ({ item }: { item: Booking }) => {
    const status = STATUS_META[item.status] || {
      label: item.status ? item.status[0].toUpperCase() + item.status.slice(1) : "Booked",
      tint: BRAND.gold,
      bg: "rgba(255,215,79,0.15)",
    };
    const canCancel = isUpcoming(item) && item.status !== "cancelled";
    const faded = item.status === "cancelled" || !isUpcoming(item);
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          faded && { opacity: 0.75 },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.dateBlock, { backgroundColor: faded ? colors.surfaceLight : BRAND.gold }]}>
            <Ionicons name="calendar" size={20} color={faded ? BRAND.gold : BRAND.purpleDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.day, { color: colors.text }]}>{formatDay(item)}</Text>
            <Text style={[styles.time, { color: BRAND.gold }]}>{formatTime(item)}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: status.bg }]}>
            <Text style={[styles.pillText, { color: status.tint }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="storefront-outline" size={15} color={colors.textMuted} />
          <Text style={[styles.detail, { color: colors.textSecondary }]}>{item.store_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={15} color={colors.textMuted} />
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            Table for {item.party_size}
          </Text>
        </View>
        {item.special_requests ? (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.detail, { color: colors.textMuted, fontStyle: "italic" }]}>
              {item.special_requests}
            </Text>
          </View>
        ) : null}

        {canCancel && (
          <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => confirmCancel(item)}
              disabled={cancellingId === item.id}
              style={styles.cancelBtn}
              accessibilityRole="button"
            >
              {cancellingId === item.id ? (
                <ActivityIndicator color={colors.error} size="small" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                  <Text style={[styles.cancelText, { color: colors.error }]}>Cancel booking</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const listEmpty = () => {
    if (!hasLoaded || (loading && !refreshing)) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={BRAND.gold} size="large" />
        </View>
      );
    }
    if (loadError) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your bookings"
          message={loadError}
          actionLabel="Try again"
          onAction={load}
        />
      );
    }
    return (
      <EmptyState
        icon="restaurant-outline"
        title="No table bookings yet"
        message="Planning a meal out? Reserve a table at your nearest Naan Staap."
        actionLabel="Book a table"
        onAction={bookTable}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="My bookings"
        right={
          bookings.length > 0 ? (
            <TouchableOpacity onPress={bookTable} hitSlop={10} accessibilityLabel="Book a table">
              <Ionicons name="add-circle" size={28} color={BRAND.orange} />
            </TouchableOpacity>
          ) : undefined
        }
      />
      <SectionList
        sections={sections}
        keyExtractor={(b) => b.id}
        renderItem={renderBooking}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{section.title}</Text>
        )}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          bookings.length > 0 ? (
            <BrandButton
              title="Book another table"
              icon="calendar"
              variant="outline"
              onPress={bookTable}
              style={{ marginTop: 24 }}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
          sections.length === 0 && { flexGrow: 1 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.gold} colors={[BRAND.orange]} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  listContent: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 8, marginBottom: 12 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  dateBlock: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  day: { fontSize: 16, fontWeight: "800" },
  time: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: "800" },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 6 },
  detail: { fontSize: 14, lineHeight: 19, flex: 1 },
  cardActions: { borderTopWidth: 1, marginTop: 14, paddingTop: 10 },
  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4, minHeight: 26 },
  cancelText: { fontSize: 14, fontWeight: "700" },
});
