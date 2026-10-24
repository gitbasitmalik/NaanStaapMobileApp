import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND } from "../theme/ThemeContext";
import { ScreenHeader, BrandButton, Chip, formatPrice } from "../components/ui";
import { EmptyState } from "../components/EmptyState";
import { ReviewModal, ReviewSubmission } from "../components/ReviewModal";
import { useToast } from "../components/Toast";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import {
  useOrdersStore,
  OrderHistoryItem,
  ACTIVE_ORDER_STATUSES,
  COMPLETED_ORDER_STATUSES,
} from "../store/ordersStore";
import { addToCartHaptic, lightHaptic } from "../utils/haptics";

type Filter = "all" | "active" | "completed" | "cancelled";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Collected",
  cancelled: "Cancelled",
};

const matchesFilter = (order: OrderHistoryItem, filter: Filter) => {
  switch (filter) {
    case "active":
      return ACTIVE_ORDER_STATUSES.includes(order.status);
    case "completed":
      return COMPLETED_ORDER_STATUSES.includes(order.status);
    case "cancelled":
      return order.status === "cancelled";
    default:
      return true;
  }
};

const orderRef = (order: OrderHistoryItem) =>
  order.order_number != null ? `#${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`;

const formatOrderDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
};

const itemSummary = (order: OrderHistoryItem) => {
  const items = order.items || [];
  const shown = items.slice(0, 2).map((i) => `${i.quantity}× ${i.name}`);
  const extra = items.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} +${extra} more` : shown.join(", ");
};

const orderTypeMeta = (type: OrderHistoryItem["order_type"]) =>
  type === "delivery"
    ? { icon: "bicycle-outline" as const, label: "Delivery" }
    : type === "dine-in"
    ? { icon: "restaurant-outline" as const, label: "Dine-in" }
    : { icon: "bag-handle-outline" as const, label: "Collection" };

function StatusPill({ status, label }: { status: string; label?: string }) {
  const { colors } = useTheme();
  const isActive = ACTIVE_ORDER_STATUSES.includes(status);
  const isDone = COMPLETED_ORDER_STATUSES.includes(status);
  const tint = isDone ? BRAND.lime : status === "cancelled" ? colors.error : BRAND.gold;
  const bg = isDone
    ? "rgba(190,214,48,0.15)"
    : status === "cancelled"
    ? "rgba(255,107,107,0.15)"
    : "rgba(255,215,79,0.15)";
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {isActive && <View style={[styles.pillDot, { backgroundColor: tint }]} />}
      <Text style={[styles.pillText, { color: tint }]}>
        {STATUS_LABELS[status] || label || status}
      </Text>
    </View>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const {
    orders,
    summary,
    isLoading,
    isLoadingMore,
    error,
    pagination,
    fetchOrders,
    fetchMore,
    submitReview,
  } = useOrdersStore();

  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<OrderHistoryItem | null>(null);
  const [showBasketBar, setShowBasketBar] = useState(false);

  const load = useCallback(async () => {
    const ok = await fetchOrders({ page: 1 });
    setHasLoaded(true);
    if (!ok) {
      const message = useOrdersStore.getState().error;
      if (message) showToast({ message, type: "error" });
    }
  }, [fetchOrders, showToast]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: orders.length, active: 0, completed: 0, cancelled: 0 };
    orders.forEach((o) => {
      if (matchesFilter(o, "active")) c.active += 1;
      else if (matchesFilter(o, "completed")) c.completed += 1;
      else if (matchesFilter(o, "cancelled")) c.cancelled += 1;
    });
    return c;
  }, [orders]);

  const visible = useMemo(() => orders.filter((o) => matchesFilter(o, filter)), [orders, filter]);

  const openOrder = (order: OrderHistoryItem) => {
    lightHaptic();
    router.push({ pathname: "/order/[id]", params: { id: order.id } });
  };

  const handleReorder = (order: OrderHistoryItem) => {
    const lines = (order.items || []).filter(
      (i) => i.item_id && typeof i.price === "number" && i.quantity > 0
    );
    if (lines.length === 0) {
      showToast({ message: "None of these items can be added to your basket.", type: "warning" });
      return;
    }
    lines.forEach((i) =>
      addItem({
        item_id: i.item_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        customizations: i.customizations || [],
        special_instructions: i.special_instructions || "",
        image_url: i.image_url || "",
      })
    );
    addToCartHaptic();
    const count = lines.reduce((n, i) => n + i.quantity, 0);
    showToast({
      message: `${count} item${count === 1 ? "" : "s"} from order ${orderRef(order)} added to your basket`,
      type: "success",
    });
    setShowBasketBar(true);
  };

  const handleReviewSubmit = async (review: ReviewSubmission) => {
    if (!reviewOrder) return false;
    const result = await submitReview(reviewOrder.id, review);
    if (!result.ok) {
      showToast({ message: result.error || "We couldn't submit your review.", type: "error" });
      return false;
    }
    showToast({
      message: result.bonusPoints
        ? `Thanks for your review! +${result.bonusPoints} points added`
        : "Thanks for your review!",
      type: "success",
    });
    return true;
  };

  const subtitle =
    summary && summary.total_orders > 0
      ? `${summary.total_orders} order${summary.total_orders === 1 ? "" : "s"} · ${formatPrice(
          summary.total_spent
        )} spent`
      : undefined;

  // ----- Signed out / auth loading -----
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="My orders" />
        {authLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={BRAND.gold} size="large" />
          </View>
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="Sign in to see your orders"
            message="Track live orders, reorder your favourites and rate your meals."
            actionLabel="Sign in"
            onAction={() => router.push("/auth/login")}
          />
        )}
      </View>
    );
  }

  const renderOrder = ({ item: order }: { item: OrderHistoryItem }) => {
    const type = orderTypeMeta(order.order_type);
    const canRate = COMPLETED_ORDER_STATUSES.includes(order.status) && !order.is_reviewed;
    const isActive = ACTIVE_ORDER_STATUSES.includes(order.status);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openOrder(order)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel={`Order ${orderRef(order)}, ${STATUS_LABELS[order.status] || order.status}`}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.orderNumber, { color: colors.text }]}>Order {orderRef(order)}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>{formatOrderDate(order.created_at)}</Text>
          </View>
          <StatusPill status={order.status} label={order.status_label} />
        </View>

        <View style={styles.storeRow}>
          <Ionicons name="storefront-outline" size={15} color={BRAND.gold} />
          <Text style={[styles.storeText, { color: colors.textSecondary }]} numberOfLines={1}>
            {order.store_name}
          </Text>
          <View style={[styles.typeTag, { borderColor: colors.border }]}>
            <Ionicons name={type.icon} size={12} color={colors.textMuted} />
            <Text style={[styles.typeText, { color: colors.textMuted }]}>{type.label}</Text>
          </View>
        </View>

        <Text style={[styles.items, { color: colors.textSecondary }]} numberOfLines={2}>
          {itemSummary(order)}
        </Text>

        <View style={[styles.cardBottom, { borderTopColor: colors.border }]}>
          <View>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total</Text>
            <Text style={styles.total}>{formatPrice(order.total)}</Text>
          </View>
          <View style={styles.actions}>
            {isActive ? (
              <BrandButton title="Track" icon="navigate" size="sm" onPress={() => openOrder(order)} />
            ) : (
              <>
                {canRate && (
                  <BrandButton
                    title="Rate"
                    icon="star"
                    size="sm"
                    variant="gold"
                    onPress={() => setReviewOrder(order)}
                  />
                )}
                <BrandButton
                  title="Reorder"
                  icon="refresh"
                  size="sm"
                  variant="outline"
                  onPress={() => handleReorder(order)}
                />
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const showInitialLoading = isLoading && !refreshing && orders.length === 0;
  const loadFailed = !!error && orders.length === 0 && hasLoaded;

  const listEmpty = () => {
    if (showInitialLoading || !hasLoaded) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={BRAND.gold} size="large" />
        </View>
      );
    }
    if (loadFailed) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your orders"
          message={error || "Please check your connection and try again."}
          actionLabel="Try again"
          onAction={load}
        />
      );
    }
    if (orders.length === 0) {
      return (
        <EmptyState
          icon="fast-food-outline"
          title="No orders yet"
          message="Your Naan Staap orders will appear here. Hungry?"
          actionLabel="Browse the menu"
          onAction={() => router.push("/menu")}
        />
      );
    }
    const label = FILTERS.find((f) => f.key === filter)?.label.toLowerCase();
    return (
      <EmptyState
        icon="filter-outline"
        title={`No ${label} orders`}
        message="Try another filter to see the rest of your orders."
        actionLabel="Show all orders"
        onAction={() => setFilter("all")}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="My orders" subtitle={subtitle} />

      <View style={styles.filters}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={counts[f.key] > 0 && f.key !== "all" ? `${f.label} (${counts[f.key]})` : f.label}
              active={filter === f.key}
              onPress={() => {
                lightHaptic();
                setFilter(f.key);
              }}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(o) => o.id}
        renderItem={renderOrder}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + (showBasketBar && cartCount > 0 ? 100 : 24) },
          visible.length === 0 && { flexGrow: 1 },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.gold} colors={[BRAND.orange]} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (orders.length > 0 && pagination.page < pagination.pages) {
            fetchMore().then((ok) => {
              if (!ok) {
                const message = useOrdersStore.getState().error;
                if (message) showToast({ message, type: "error" });
              }
            });
          }
        }}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator color={BRAND.gold} />
            </View>
          ) : undefined
        }
      />

      {showBasketBar && cartCount > 0 && (
        <View style={[styles.basketBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.basketTitle, { color: colors.text }]}>Added to your basket</Text>
            <Text style={[styles.basketSub, { color: colors.textMuted }]}>
              {cartCount} item{cartCount === 1 ? "" : "s"} ready to check out
            </Text>
          </View>
          <BrandButton title="View basket" icon="cart" size="sm" onPress={() => router.push("/cart")} />
          <TouchableOpacity
            onPress={() => setShowBasketBar(false)}
            hitSlop={10}
            style={{ marginLeft: 10 }}
            accessibilityLabel="Dismiss"
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <ReviewModal
        visible={!!reviewOrder}
        onClose={() => setReviewOrder(null)}
        onSubmit={handleReviewSubmit}
        orderType={reviewOrder?.order_type}
        subtitle={reviewOrder ? `Order ${orderRef(reviewOrder)} · ${reviewOrder.store_name}` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  filters: { paddingTop: 14, paddingBottom: 4 },
  filtersContent: { paddingHorizontal: 16, gap: 8 },
  listContent: { padding: 16 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  orderNumber: { fontSize: 17, fontWeight: "800" },
  meta: { fontSize: 12, marginTop: 3 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: "800" },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  storeText: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  typeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 4,
  },
  typeText: { fontSize: 11, fontWeight: "600" },
  items: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  totalLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  total: { fontSize: 19, fontWeight: "800", color: BRAND.gold, marginTop: 1 },
  actions: { flexDirection: "row", gap: 8 },
  basketBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  basketTitle: { fontSize: 15, fontWeight: "800" },
  basketSub: { fontSize: 12, marginTop: 2 },
});
