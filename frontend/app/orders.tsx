import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeContext";
import { useOrdersStore } from "../store/ordersStore";
import { useAuthStore } from "../store/authStore";
import { FadeInView, SlideInView } from "../components/AnimatedComponents";
import { EmptyState } from "../components/EmptyState";
import { ReviewModal } from "../components/ReviewModal";
import { lightHaptic, successHaptic } from "../utils/haptics";

const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FFF3CD", text: "#856404" },
  confirmed: { bg: "#CCE5FF", text: "#004085" },
  preparing: { bg: "#D4EDDA", text: "#155724" },
  ready: { bg: "#D4EDDA", text: "#155724" },
  out_for_delivery: { bg: "#CCE5FF", text: "#004085" },
  delivered: { bg: "#D4EDDA", text: "#155724" },
  completed: { bg: "#D4EDDA", text: "#155724" },
  cancelled: { bg: "#F8D7DA", text: "#721C24" },
  scheduled: { bg: "#E2E3E5", text: "#383D41" },
};

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuthStore();
  const {
    orders,
    summary,
    pagination,
    isLoading,
    fetchOrders,
    reorder,
    submitReview,
  } = useOrdersStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [loadingMore, setLoadingMore] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingOrder, setReviewingOrder] = useState<any>(null);

  const filters = [
    { key: "all", label: "All" },
    { key: "delivered", label: "Completed" },
    { key: "pending", label: "Active" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const loadOrders = useCallback(async () => {
    const params: { page?: number; status?: string } = { page: 1 };
    if (selectedFilter !== "all") {
      params.status = selectedFilter;
    }
    await fetchOrders(params);
  }, [selectedFilter, fetchOrders]);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated, loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const loadMoreOrders = async () => {
    if (loadingMore || pagination.page >= pagination.pages) return;

    setLoadingMore(true);
    const params: { page?: number; status?: string } = {
      page: pagination.page + 1,
    };
    if (selectedFilter !== "all") {
      params.status = selectedFilter;
    }
    await fetchOrders(params);
    setLoadingMore(false);
  };

  const handleReorder = async (orderId: string) => {
    lightHaptic();
    Alert.alert("Reorder", "Add all items from this order to your cart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Add to Cart",
        onPress: async () => {
          const result = await reorder(orderId);
          if (result.success) {
            successHaptic();
            Alert.alert("Success", "Items added to your cart!", [
              { text: "Continue Shopping" },
              {
                text: "View Cart",
                onPress: () => router.push("/cart"),
              },
            ]);
          } else {
            Alert.alert("Error", "Failed to add items to cart");
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
          icon="receipt-outline"
          title="Sign in to view orders"
          message="Your order history will appear here once you sign in"
          actionLabel="Sign In"
          onAction={() => router.push("/auth/login")}
        />
      </View>
    );
  }

  const renderOrderItem = ({
    item: order,
    index,
  }: {
    item: any;
    index: number;
  }) => {
    const statusStyle = statusColors[order.status] || statusColors.pending;

    return (
      <SlideInView
        direction="bottom"
        delay={index * 50}
        style={[styles.orderCard, { backgroundColor: colors.surface }]}
      >
        <TouchableOpacity
          onPress={() => {
            lightHaptic();
            Alert.alert(
              "Order Details",
              `Order #${order.id
                .slice(0, 8)
                .toUpperCase()}\nTotal: $${order.total.toFixed(2)}\nStatus: ${
                order.status
              }`
            );
          }}
          activeOpacity={0.7}
        >
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View>
              <Text style={[styles.orderId, { color: colors.text }]}>
                Order #{order.id.slice(0, 8).toUpperCase()}
              </Text>
              <Text style={[styles.orderDate, { color: colors.textMuted }]}>
                {formatDate(order.created_at)} at {formatTime(order.created_at)}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
            >
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {order.status_label || order.status}
              </Text>
            </View>
          </View>

          {/* Store & Order Type */}
          <View style={styles.orderInfo}>
            <View style={styles.infoRow}>
              <Ionicons
                name="storefront-outline"
                size={16}
                color={colors.textMuted}
              />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {order.store_name}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name={
                  order.order_type === "delivery"
                    ? "bicycle-outline"
                    : "walk-outline"
                }
                size={16}
                color={colors.textMuted}
              />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {order.order_type === "delivery" ? "Delivery" : "Pickup"}
              </Text>
            </View>
          </View>

          {/* Items Preview */}
          <View style={[styles.itemsPreview, { borderColor: colors.border }]}>
            <Text
              style={[styles.itemsText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {order.items
                ?.map((item: any) => `${item.quantity}x ${item.name}`)
                .join(", ")}
            </Text>
          </View>

          {/* Order Footer */}
          <View style={styles.orderFooter}>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
              {order.items?.reduce(
                (sum: number, item: any) => sum + item.quantity,
                0
              )}{" "}
              items
            </Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>
              £{order.total?.toFixed(2)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {["delivered", "completed"].includes(order.status) &&
              !order.is_reviewed && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: BRAND_GOLD }]}
                  onPress={() => {
                    lightHaptic();
                    setReviewingOrder(order);
                    setShowReviewModal(true);
                  }}
                >
                  <Ionicons name="star-outline" size={16} color={BRAND_GOLD} />
                  <Text
                    style={[styles.actionButtonText, { color: BRAND_GOLD }]}
                  >
                    Review
                  </Text>
                </TouchableOpacity>
              )}
            {["delivered", "completed"].includes(order.status) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.reorderButton]}
                onPress={() => handleReorder(order.id)}
              >
                <Ionicons name="refresh" size={16} color="#FFF" />
                <Text style={styles.reorderButtonText}>Reorder</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </SlideInView>
    );
  };

  const renderHeader = () => (
    <>
      {/* Summary Card */}
      {summary && (
        <FadeInView
          style={[styles.summaryCard, { backgroundColor: BRAND_PURPLE }]}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{summary.total_orders}</Text>
              <Text style={styles.summaryLabel}>Total Orders</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                £{summary.total_spent?.toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel}>Total Spent</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                £{summary.average_order_value?.toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel}>Avg. Order</Text>
            </View>
          </View>
        </FadeInView>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              { borderColor: colors.border },
              selectedFilter === filter.key && styles.filterTabActive,
            ]}
            onPress={() => {
              lightHaptic();
              setSelectedFilter(filter.key);
            }}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: colors.textMuted },
                selectedFilter === filter.key && styles.filterTabTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={BRAND_GOLD} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <FadeInView style={[styles.header, { paddingTop: insets.top }]}>
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
          Order History
        </Text>
        <View style={styles.placeholder} />
      </FadeInView>

      {isLoading && orders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_GOLD} />
        </View>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No orders yet"
          message="Your order history will appear here"
          actionLabel="Browse Menu"
          onAction={() => router.push("/menu")}
        />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BRAND_GOLD}
            />
          }
          onEndReached={loadMoreOrders}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setReviewingOrder(null);
        }}
        onSubmit={async (review) => {
          if (!reviewingOrder) return false;
          const success = await submitReview(reviewingOrder.id, review);
          if (success) {
            loadOrders(); // Refresh to update is_reviewed status
          }
          return success;
        }}
        orderType={reviewingOrder?.order_type}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryNumber: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabActive: {
    backgroundColor: BRAND_PURPLE,
    borderColor: BRAND_PURPLE,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: "#FFF",
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "bold",
  },
  orderDate: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderInfo: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 13,
  },
  itemsPreview: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  itemsText: {
    fontSize: 14,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  reorderButton: {
    backgroundColor: BRAND_PURPLE,
    borderColor: BRAND_PURPLE,
  },
  reorderButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
