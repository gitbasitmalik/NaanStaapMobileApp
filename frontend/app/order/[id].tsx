import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND, FONTS } from "../../theme/ThemeContext";
import { BrandButton, Card, ScreenHeader, formatPrice } from "../../components/ui";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";
import { ordersAPI, apiErrorMessage } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface TimelineStep {
  status: string;
  label: string;
  is_completed: boolean;
  is_current: boolean;
  timestamp: string | null;
}

interface OrderStatus {
  status: string;
  status_label: string;
  estimated_time: number;
  timeline: TimelineStep[];
}

interface OrderDetail {
  id: string;
  order_number?: number;
  order_type: "delivery" | "pickup" | "dine-in";
  status: string;
  items: { item_id: string; name: string; quantity: number; price: number; customizations: string[] }[];
  subtotal: number;
  discount?: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  delivery_address?: string | null;
  created_at: string;
  user_id: string | null;
}

const FINAL = ["delivered", "completed", "cancelled"];
const POLL_MS = 15000;

const PAYMENT_LABELS: Record<string, string> = {
  pay_in_store: "Pay in store",
  cash_on_delivery: "Cash on delivery",
  card_on_delivery: "Card on delivery",
};

export default function OrderTrackingScreen() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [orderRes, statusRes] = await Promise.all([
        ordersAPI.getOne(String(id)),
        ordersAPI.getStatus(String(id)),
      ]);
      setOrder(orderRes.data as unknown as OrderDetail);
      setStatus(statusRes.data);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while the order is still in progress.
  useEffect(() => {
    if (status && FINAL.includes(status.status)) return;
    timer.current = setInterval(load, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [status, load]);

  const cancel = () => {
    Alert.alert("Cancel order", "Are you sure you want to cancel this order?", [
      { text: "Keep order", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            await ordersAPI.cancel(String(id));
            showToast({ message: "Your order has been cancelled", type: "info" });
            load();
          } catch (error) {
            showToast({ message: apiErrorMessage(error), type: "error" });
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const title = order?.order_number ? `Order #${order.order_number}` : "Your order";

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Your order" />
        <ActivityIndicator color={BRAND.gold} style={styles.loader} />
      </View>
    );
  }

  if (failed || !order || !status) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Your order" />
        <EmptyState
          icon="receipt-outline"
          title="Couldn't load this order"
          message="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            load();
          }}
        />
      </View>
    );
  }

  const cancelled = status.status === "cancelled";
  const done = status.status === "delivered" || status.status === "completed";
  const canCancel = status.status === "pending" && !!user && order.user_id === user.id;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title={title} onBack={() => (placed ? router.replace("/") : router.back())} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={BRAND.gold}
          />
        }
      >
        {placed && !cancelled && (
          <View style={styles.thanks}>
            <Text style={styles.thanksScript}>Shukriya!</Text>
            <Text style={styles.thanksTitle}>Your order is in</Text>
            <Text style={styles.thanksText}>
              We&apos;ve sent it to {order.store_name}. Keep this screen open to follow along.
            </Text>
          </View>
        )}

        {/* Status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={cancelled ? "close-circle" : done ? "checkmark-circle" : "time"}
              size={34}
              color={cancelled ? colors.error : done ? BRAND.lime : BRAND.gold}
            />
            <View style={styles.flex}>
              <Text style={[styles.statusLabel, { color: colors.text }]}>{status.status_label}</Text>
              {!cancelled && !done && status.estimated_time > 0 && (
                <Text style={[styles.statusEta, { color: colors.textMuted }]}>
                  About {status.estimated_time} min to go
                </Text>
              )}
            </View>
          </View>

          {!cancelled &&
            status.timeline.map((step, index) => {
              const reached = step.is_completed || step.is_current;
              return (
                <View key={step.status} style={styles.step}>
                  <View style={styles.stepRail}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: reached ? BRAND.gold : colors.surfaceLight },
                        step.is_current && styles.dotCurrent,
                      ]}
                    >
                      {step.is_completed && <Ionicons name="checkmark" size={12} color={BRAND.purpleDeep} />}
                    </View>
                    {index < status.timeline.length - 1 && (
                      <View
                        style={[styles.rail, { backgroundColor: step.is_completed ? BRAND.gold : colors.surfaceLight }]}
                      />
                    )}
                  </View>
                  <View style={styles.stepBody}>
                    <Text
                      style={[
                        styles.stepLabel,
                        { color: reached ? colors.text : colors.textMuted },
                        step.is_current && { color: BRAND.gold },
                      ]}
                    >
                      {step.label}
                    </Text>
                    {step.timestamp && (
                      <Text style={[styles.stepTime, { color: colors.textMuted }]}>
                        {new Date(step.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
        </Card>

        {/* Store */}
        <Card style={styles.block}>
          <Text style={styles.blockTitle}>
            {order.order_type === "delivery" ? "Delivering from" : order.order_type === "dine-in" ? "Dine in at" : "Collect from"}
          </Text>
          <Text style={[styles.storeName, { color: colors.text }]}>{order.store_name}</Text>
          {order.store_address ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>{order.store_address}</Text>
          ) : null}
          {order.delivery_address ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>To: {order.delivery_address}</Text>
          ) : null}
          <View style={styles.actions}>
            {order.store_phone ? (
              <BrandButton
                title="Call store"
                icon="call"
                size="sm"
                variant="outline"
                onPress={() => Linking.openURL(`tel:${order.store_phone}`)}
                style={styles.flex}
              />
            ) : null}
            {order.store_address ? (
              <BrandButton
                title="Directions"
                icon="navigate"
                size="sm"
                variant="outline"
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.store_address)}`
                  )
                }
                style={styles.flex}
              />
            ) : null}
          </View>
        </Card>

        {/* Items */}
        <Card style={styles.block}>
          <Text style={styles.blockTitle}>Your items</Text>
          {order.items.map((item, i) => (
            <View key={`${item.item_id}-${i}`} style={styles.itemRow}>
              <Text style={[styles.itemQty, { color: BRAND.gold }]}>{item.quantity}×</Text>
              <View style={styles.flex}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                {item.customizations?.length > 0 && (
                  <Text style={[styles.meta, { color: colors.textMuted }]}>{item.customizations.join(", ")}</Text>
                )}
              </View>
              <Text style={[styles.itemPrice, { color: colors.text }]}>{formatPrice(item.price * item.quantity)}</Text>
            </View>
          ))}
          <View style={[styles.totals, { borderTopColor: colors.border }]}>
            <Row label="Subtotal" value={formatPrice(order.subtotal)} />
            {!!order.discount && <Row label="Discount" value={`−${formatPrice(order.discount)}`} />}
            {order.order_type === "delivery" && (
              <Row label="Delivery" value={order.delivery_fee ? formatPrice(order.delivery_fee) : "Free"} />
            )}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
            </View>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {PAYMENT_LABELS[order.payment_method] || order.payment_method} · Placed{" "}
              {new Date(order.created_at).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </Card>

        {canCancel && (
          <BrandButton
            title="Cancel order"
            variant="ghost"
            icon="close-circle-outline"
            loading={cancelling}
            onPress={cancel}
            style={styles.block}
          />
        )}
        {(done || cancelled) && (
          <BrandButton title="Order again" icon="restaurant" onPress={() => router.replace("/menu")} style={styles.block} />
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 60 },
  content: { padding: 16 },
  thanks: { backgroundColor: BRAND.gold, borderRadius: 22, padding: 20, marginBottom: 16 },
  thanksScript: { fontFamily: FONTS.script, fontSize: 30, color: BRAND.orange },
  thanksTitle: { fontSize: 24, fontWeight: "900", color: BRAND.purpleDeep, marginTop: -4 },
  thanksText: { fontSize: 14, color: BRAND.purpleDeep, marginTop: 4, lineHeight: 20 },
  statusCard: { paddingBottom: 6 },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  statusLabel: { fontSize: 20, fontWeight: "900" },
  statusEta: { fontSize: 13, marginTop: 2 },
  step: { flexDirection: "row", gap: 12 },
  stepRail: { alignItems: "center", width: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dotCurrent: { borderWidth: 3, borderColor: "rgba(255,215,79,0.35)" },
  rail: { width: 3, flex: 1, minHeight: 22, marginVertical: 2 },
  stepBody: { flex: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: 18 },
  stepLabel: { fontSize: 15, fontWeight: "700" },
  stepTime: { fontSize: 12 },
  block: { marginTop: 14 },
  blockTitle: { color: BRAND.gold, fontSize: 15, fontWeight: "900", marginBottom: 8 },
  storeName: { fontSize: 17, fontWeight: "800" },
  meta: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  itemRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  itemQty: { fontSize: 15, fontWeight: "900", width: 28 },
  itemName: { fontSize: 15, fontWeight: "600" },
  itemPrice: { fontSize: 15, fontWeight: "700" },
  totals: { borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: "700" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 6 },
  totalLabel: { fontSize: 17, fontWeight: "900" },
  totalValue: { color: BRAND.gold, fontSize: 22, fontWeight: "900" },
});
