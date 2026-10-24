import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND } from "../theme/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { reviewsAPI, storesAPI, apiErrorMessage } from "../services/api";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { FadeInView } from "../components/AnimatedComponents";
import { BrandButton, ScreenHeader } from "../components/ui";

// Shape of a document from GET /api/auth/reviews (raw `reviews` collection rows).
interface UserReview {
  id: string;
  order_id: string;
  store_id?: string;
  overall_rating: number;
  food_rating?: number | null;
  delivery_rating?: number | null;
  service_rating?: number | null;
  comment?: string | null;
  would_recommend?: boolean | null;
  helpful_count?: number;
  created_at: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 2 }} accessibilityLabel={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={rating >= n ? "star" : rating >= n - 0.5 ? "star-half" : "star-outline"}
          size={size}
          color={rating >= n - 0.5 ? BRAND.gold : colors.textMuted}
        />
      ))}
    </View>
  );
}

export default function MyReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [reviewsRes, storesRes] = await Promise.all([
        reviewsAPI.getUserReviews(),
        storesAPI.getAll().catch(() => null),
      ]);
      const data = reviewsRes.data;
      setReviews(Array.isArray(data) ? data : data?.reviews ?? []);
      if (storesRes && Array.isArray(storesRes.data)) {
        const names: Record<string, string> = {};
        storesRes.data.forEach((s) => (names[s.id] = s.name));
        setStoreNames(names);
      }
      setError(null);
    } catch (err) {
      const message = apiErrorMessage(err, "Couldn't load your reviews");
      setError(message);
      showToast({ message, type: "error" });
    }
  }, [showToast]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="My reviews" />
        <EmptyState
          icon="star-outline"
          title="Sign in to see your reviews"
          message="Reviews you leave on your orders will appear here."
          actionLabel="Sign in"
          onAction={() => router.push("/auth/login")}
        />
      </View>
    );
  }

  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length : 0;

  const renderItem = ({ item, index }: { item: UserReview; index: number }) => {
    const store = item.store_id ? storeNames[item.store_id] : undefined;
    const subRatings = [
      { label: "Food", value: item.food_rating },
      { label: "Delivery", value: item.delivery_rating },
      { label: "Service", value: item.service_rating },
    ].filter((r) => typeof r.value === "number" && r.value > 0) as { label: string; value: number }[];

    return (
      <FadeInView delay={Math.min(index, 8) * 40}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardTop}>
            <Stars rating={item.overall_rating} />
            <Text style={[styles.date, { color: colors.textMuted }]}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.storeRow}>
            <Ionicons name="storefront-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.store, { color: colors.textSecondary }]} numberOfLines={1}>
              {store ?? "Naan Staap"}
            </Text>
          </View>
          {item.comment ? (
            <Text style={[styles.comment, { color: colors.text }]}>{item.comment}</Text>
          ) : (
            <Text style={[styles.comment, styles.noComment, { color: colors.textMuted }]}>
              No written comment
            </Text>
          )}
          {subRatings.length > 0 ? (
            <View style={styles.subRow}>
              {subRatings.map((r) => (
                <View key={r.label} style={styles.subPill}>
                  <Text style={[styles.subText, { color: colors.textSecondary }]}>
                    {r.label} <Text style={{ color: BRAND.gold, fontWeight: "800" }}>{r.value}/5</Text>
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {item.helpful_count ? (
            <Text style={[styles.helpful, { color: colors.textMuted }]}>
              {item.helpful_count} {item.helpful_count === 1 ? "person" : "people"} found this helpful
            </Text>
          ) : null}
        </View>
      </FadeInView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="My reviews"
        subtitle={reviews.length ? `${reviews.length} review${reviews.length === 1 ? "" : "s"}` : undefined}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND.gold} />
        </View>
      ) : error && reviews.length === 0 ? (
        <View style={styles.center}>
          <EmptyState icon="cloud-offline-outline" title="Couldn't load reviews" message={error} />
          <BrandButton title="Try again" icon="refresh" variant="outline" onPress={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }} style={styles.retry} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={[
            { padding: 16, paddingBottom: insets.bottom + 32, gap: 12 },
            reviews.length === 0 && { flexGrow: 1 },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.gold} />}
          ListHeaderComponent={
            reviews.length > 0 ? (
              <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.summaryNumber}>{average.toFixed(1)}</Text>
                <View style={{ gap: 4 }}>
                  <Stars rating={average} size={18} />
                  <Text style={[styles.summaryText, { color: colors.textMuted }]}>Your average rating</Text>
                </View>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState
              icon="star-outline"
              title="No reviews yet"
              message="Once an order is completed you can rate it from your order history. You'll earn bonus points too."
              actionLabel="View my orders"
              onAction={() => router.push("/orders")}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  retry: { marginBottom: 40 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  summaryNumber: { color: BRAND.gold, fontSize: 34, fontWeight: "800" },
  summaryText: { fontSize: 12 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { fontSize: 12 },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  store: { fontSize: 13, fontWeight: "600", flex: 1 },
  comment: { fontSize: 15, lineHeight: 21, marginTop: 10 },
  noComment: { fontStyle: "italic", fontSize: 13 },
  subRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  subPill: { backgroundColor: "rgba(255,215,79,0.12)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  subText: { fontSize: 12 },
  helpful: { fontSize: 12, marginTop: 10 },
});
