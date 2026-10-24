import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND } from "../theme/ThemeContext";
import { BrandButton, BrandInput, Card, ScreenHeader, formatPrice } from "../components/ui";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { useCartStore } from "../store/cartStore";
import { useCheckoutStore } from "../store/checkoutStore";
import { useAuthStore } from "../store/authStore";
import {
  useAddressStore,
  formatAddress,
  isValidUkPostcode,
  normalisePostcode,
} from "../store/addressStore";
import {
  storesAPI,
  ordersAPI,
  configAPI,
  apiErrorMessage,
  Store,
  OrderingConfig,
  PlaceOrderPayload,
} from "../services/api";
import { errorHaptic, lightHaptic, successHaptic } from "../utils/haptics";

type OrderType = PlaceOrderPayload["order_type"];
type PaymentMethod = PlaceOrderPayload["payment_method"];

const ORDER_TYPES: { value: OrderType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "pickup", label: "Collection", icon: "bag-handle-outline" },
  { value: "delivery", label: "Delivery", icon: "bicycle-outline" },
  { value: "dine-in", label: "Dine in", icon: "restaurant-outline" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { items, subtotal, clearCart } = useCartStore();
  const { promoCode, setPromoCode, storeId: preferredStoreId, setStoreId } = useCheckoutStore();
  const { user, isAuthenticated } = useAuthStore();
  const { addresses, fetchAddresses } = useAddressStore();

  const [stores, setStores] = useState<Store[]>([]);
  const [config, setConfig] = useState<OrderingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [orderType, setOrderType] = useState<OrderType>("pickup");
  const [storeId, setSelectedStoreId] = useState<string | null>(preferredStoreId);
  const [showStores, setShowStores] = useState(false);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({ line1: "", line2: "", city: "", postcode: "" });
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("pay_in_store");
  const [codeInput, setCodeInput] = useState(promoCode || "");
  const [discount, setDiscount] = useState<{ code: string; amount: number; label: string } | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [storesRes, configRes] = await Promise.all([storesAPI.getAll(), configAPI.get()]);
      setStores(storesRes.data);
      setConfig(configRes.data);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isAuthenticated) fetchAddresses();
  }, [isAuthenticated, fetchAddresses]);

  // Prefill once the profile / addresses arrive.
  useEffect(() => {
    if (user) {
      setName((v) => v || user.name || "");
      setPhone((v) => v || user.phone || "");
      setEmail((v) => v || user.email || "");
    }
  }, [user]);

  useEffect(() => {
    if (!addressId && addresses.length > 0) {
      setAddressId((addresses.find((a) => a.is_default) || addresses[0]).id);
    }
  }, [addresses, addressId]);

  // Default store: the one chosen elsewhere, else the first that is open.
  useEffect(() => {
    if (!storeId && stores.length > 0) {
      setSelectedStoreId((stores.find((s) => s.is_open_now) || stores[0]).id);
    }
  }, [stores, storeId]);

  // Payment options depend on how the order is fulfilled.
  useEffect(() => {
    setPayment(orderType === "delivery" ? "cash_on_delivery" : "pay_in_store");
  }, [orderType]);

  const applyCode = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return;
      setCheckingCode(true);
      setCodeError(null);
      try {
        const res = await ordersAPI.validateDiscount(code, subtotal);
        setDiscount({ code: res.data.code, amount: res.data.discount, label: res.data.description });
        setPromoCode(res.data.code);
        lightHaptic();
      } catch (error) {
        setDiscount(null);
        setCodeError(apiErrorMessage(error, "That code didn't work"));
      } finally {
        setCheckingCode(false);
      }
    },
    [subtotal, setPromoCode]
  );

  // Apply a code passed in from Deals / Rewards, and re-check when the basket changes.
  useEffect(() => {
    const code = discount?.code || promoCode;
    if (code && items.length > 0) applyCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, isAuthenticated]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const itemCountLabel = `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
  const store = stores.find((s) => s.id === storeId) || null;
  const deliveryFee =
    orderType === "delivery" && config && subtotal < config.free_delivery_threshold
      ? config.delivery_fee
      : 0;
  const discountAmount = discount?.amount || 0;
  const total = Math.max(0, subtotal - discountAmount) + deliveryFee;
  const pointsToEarn = isAuthenticated ? Math.floor(total * (config?.points_per_pound || 10)) : 0;

  const deliveryAddressText = useMemo(() => {
    if (orderType !== "delivery") return null;
    const saved = addresses.find((a) => a.id === addressId);
    if (saved) {
      return [formatAddress(saved), saved.delivery_instructions ? `Note: ${saved.delivery_instructions}` : ""]
        .filter(Boolean)
        .join(" — ");
    }
    if (!newAddress.line1.trim()) return null;
    return formatAddress({
      address_line1: newAddress.line1.trim(),
      address_line2: newAddress.line2.trim(),
      city: newAddress.city.trim(),
      postcode: normalisePostcode(newAddress.postcode),
    });
  }, [orderType, addresses, addressId, newAddress]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Please enter your name";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Please enter a valid phone number";
    if (!EMAIL_PATTERN.test(email.trim())) next.email = "Please enter a valid email";
    if (!store) next.store = "Please choose a store";
    if (orderType === "delivery" && !addresses.find((a) => a.id === addressId)) {
      if (!newAddress.line1.trim()) next.line1 = "Please enter your address";
      if (!newAddress.city.trim()) next.city = "Please enter your town or city";
      if (!isValidUkPostcode(newAddress.postcode)) next.postcode = "Please enter a valid UK postcode";
    }
    if (config && subtotal < config.min_order_amount) {
      next.basket = `Minimum order is ${formatPrice(config.min_order_amount)}`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const placeOrder = async () => {
    if (!validate()) {
      errorHaptic();
      showToast({ message: "Please check the highlighted details", type: "error" });
      return;
    }
    setPlacing(true);
    try {
      const res = await ordersAPI.place({
        items: items.map((i) => ({
          item_id: i.item_id,
          name: i.name,
          quantity: i.quantity,
          customizations: i.customizations,
          special_instructions: i.special_instructions,
        })),
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim(),
        store_id: store!.id,
        order_type: orderType,
        delivery_address: deliveryAddressText,
        payment_method: payment,
        special_instructions: notes.trim(),
        discount_code: discount?.code,
      });
      successHaptic();
      clearCart();
      setPromoCode(null);
      setStoreId(store!.id);
      router.replace({ pathname: "/order/[id]", params: { id: res.data.id, placed: "1" } });
    } catch (error) {
      errorHaptic();
      showToast({ message: apiErrorMessage(error, "We couldn't place your order. Please try again."), type: "error" });
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Checkout" />
        <EmptyState
          icon="bag-outline"
          title="Your basket is empty"
          message="Add something tasty before checking out."
          actionLabel="Browse the menu"
          onAction={() => router.replace("/menu")}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title="Checkout" subtitle={itemCountLabel} />
      {loading ? (
        <ActivityIndicator color={BRAND.gold} style={styles.loader} />
      ) : loadFailed ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Can't reach Naan Staap"
          message="Check your connection and try again."
          actionLabel="Try again"
          onAction={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Order type */}
          <Text style={styles.sectionTitle}>How would you like it?</Text>
          <View style={styles.segment}>
            {ORDER_TYPES.map((type) => {
              const active = orderType === type.value;
              const unavailable =
                (type.value === "delivery" && store && !store.delivery_available) ||
                (type.value === "dine-in" && store && !store.dine_in_available);
              return (
                <TouchableOpacity
                  key={type.value}
                  disabled={!!unavailable}
                  onPress={() => {
                    lightHaptic();
                    setOrderType(type.value);
                  }}
                  style={[
                    styles.segmentItem,
                    { backgroundColor: active ? BRAND.gold : colors.surface, borderColor: active ? BRAND.gold : colors.border },
                    unavailable ? { opacity: 0.4 } : null,
                  ]}
                >
                  <Ionicons name={type.icon} size={20} color={active ? BRAND.purpleDeep : colors.textSecondary} />
                  <Text style={[styles.segmentText, { color: active ? BRAND.purpleDeep : colors.textSecondary }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Store */}
          <Text style={styles.sectionTitle}>
            {orderType === "delivery" ? "Delivering from" : orderType === "dine-in" ? "Eating at" : "Collecting from"}
          </Text>
          <Card style={errors.store ? { borderColor: colors.error } : undefined}>
            <TouchableOpacity style={styles.storeRow} onPress={() => setShowStores((v) => !v)}>
              <Ionicons name="storefront" size={22} color={BRAND.gold} />
              <View style={styles.flex}>
                <Text style={[styles.storeName, { color: colors.text }]}>{store?.name || "Choose a store"}</Text>
                {store && (
                  <Text style={[styles.storeMeta, { color: store.is_open_now ? BRAND.lime : colors.error }]}>
                    {store.is_open_now ? "Open now" : "Closed"} · {store.hours_summary}
                  </Text>
                )}
              </View>
              <Ionicons name={showStores ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {showStores &&
              stores.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.storeOption, { borderTopColor: colors.border }]}
                  onPress={() => {
                    lightHaptic();
                    setSelectedStoreId(s.id);
                    setShowStores(false);
                  }}
                >
                  <Ionicons
                    name={s.id === storeId ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={s.id === storeId ? BRAND.gold : colors.textMuted}
                  />
                  <View style={styles.flex}>
                    <Text style={[styles.storeOptionName, { color: colors.text }]}>{s.name}</Text>
                    <Text style={[styles.storeMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      {s.address}
                    </Text>
                  </View>
                  <Text style={[styles.openPill, { color: s.is_open_now ? BRAND.lime : colors.error }]}>
                    {s.is_open_now ? "Open" : "Closed"}
                  </Text>
                </TouchableOpacity>
              ))}
          </Card>
          {store && !store.is_open_now && (
            <Text style={[styles.warn, { color: colors.error }]}>
              This store is closed right now, so it may not accept your order.
            </Text>
          )}

          {/* Delivery address */}
          {orderType === "delivery" && (
            <>
              <Text style={styles.sectionTitle}>Delivery address</Text>
              {addresses.map((a) => {
                const active = a.id === addressId;
                return (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => setAddressId(a.id)}
                    style={[
                      styles.addressCard,
                      { backgroundColor: colors.surface, borderColor: active ? BRAND.gold : colors.border },
                    ]}
                  >
                    <Ionicons
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={active ? BRAND.gold : colors.textMuted}
                    />
                    <View style={styles.flex}>
                      <Text style={[styles.storeOptionName, { color: colors.text }]}>{a.label}</Text>
                      <Text style={[styles.storeMeta, { color: colors.textMuted }]}>{formatAddress(a)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {addresses.length > 0 && (
                <TouchableOpacity
                  onPress={() => setAddressId(null)}
                  style={[
                    styles.addressCard,
                    { backgroundColor: colors.surface, borderColor: addressId ? colors.border : BRAND.gold },
                  ]}
                >
                  <Ionicons
                    name={addressId ? "radio-button-off" : "radio-button-on"}
                    size={20}
                    color={addressId ? colors.textMuted : BRAND.gold}
                  />
                  <Text style={[styles.storeOptionName, { color: colors.text }]}>Use a different address</Text>
                </TouchableOpacity>
              )}
              {!addresses.find((a) => a.id === addressId) && (
                <View style={styles.addressForm}>
                  <BrandInput
                    label="Address line 1 *"
                    value={newAddress.line1}
                    onChangeText={(line1) => setNewAddress((a) => ({ ...a, line1 }))}
                    error={errors.line1}
                  />
                  <BrandInput
                    label="Address line 2"
                    value={newAddress.line2}
                    onChangeText={(line2) => setNewAddress((a) => ({ ...a, line2 }))}
                  />
                  <View style={styles.inline}>
                    <BrandInput
                      label="Town / city *"
                      value={newAddress.city}
                      onChangeText={(city) => setNewAddress((a) => ({ ...a, city }))}
                      error={errors.city}
                      containerStyle={styles.flex}
                    />
                    <BrandInput
                      label="Postcode *"
                      value={newAddress.postcode}
                      autoCapitalize="characters"
                      onChangeText={(postcode) => setNewAddress((a) => ({ ...a, postcode }))}
                      error={errors.postcode}
                      containerStyle={styles.flex}
                    />
                  </View>
                  {isAuthenticated && (
                    <Text style={[styles.hint, { color: colors.textMuted }]}>
                      Tip: save addresses in{" "}
                      <Text style={styles.link} onPress={() => router.push("/addresses")}>
                        My addresses
                      </Text>{" "}
                      for faster checkout.
                    </Text>
                  )}
                </View>
              )}
            </>
          )}

          {/* Contact details */}
          <Text style={styles.sectionTitle}>Your details</Text>
          {!isAuthenticated && (
            <TouchableOpacity
              style={[styles.signIn, { borderColor: BRAND.gold }]}
              onPress={() => router.push("/auth/login")}
            >
              <Ionicons name="person-circle-outline" size={22} color={BRAND.gold} />
              <Text style={[styles.signInText, { color: colors.textSecondary }]}>
                <Text style={styles.link}>Sign in</Text> to earn loyalty points and track your orders.
              </Text>
            </TouchableOpacity>
          )}
          <BrandInput label="Name *" icon="person-outline" value={name} onChangeText={setName} error={errors.name} />
          <BrandInput
            label="Phone *"
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            error={errors.phone}
          />
          <BrandInput
            label="Email *"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <BrandInput
            label="Order notes"
            value={notes}
            onChangeText={setNotes}
            placeholder={orderType === "delivery" ? "e.g. ring the bell, flat 2" : "Anything the kitchen should know?"}
            multiline
            maxLength={300}
          />

          {/* Promo code */}
          <Text style={styles.sectionTitle}>Promo or reward code</Text>
          {discount ? (
            <View style={[styles.applied, { borderColor: BRAND.lime }]}>
              <Ionicons name="checkmark-circle" size={22} color={BRAND.lime} />
              <View style={styles.flex}>
                <Text style={[styles.storeOptionName, { color: colors.text }]}>{discount.code}</Text>
                <Text style={[styles.storeMeta, { color: colors.textMuted }]}>
                  {discount.label} · −{formatPrice(discount.amount)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setDiscount(null);
                  setPromoCode(null);
                  setCodeInput("");
                }}
                hitSlop={10}
              >
                <Text style={[styles.remove, { color: colors.error }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inline}>
              <BrandInput
                value={codeInput}
                onChangeText={(v) => {
                  setCodeInput(v);
                  setCodeError(null);
                }}
                placeholder="Enter code"
                autoCapitalize="characters"
                error={codeError}
                containerStyle={styles.flex}
              />
              <BrandButton
                title="Apply"
                variant="outline"
                size="sm"
                loading={checkingCode}
                onPress={() => applyCode(codeInput)}
                style={styles.applyBtn}
              />
            </View>
          )}

          {/* Payment */}
          <Text style={styles.sectionTitle}>Payment</Text>
          <Card>
            {(orderType === "delivery"
              ? ([
                  { value: "cash_on_delivery", label: "Cash on delivery", icon: "cash-outline" },
                  { value: "card_on_delivery", label: "Card on delivery", icon: "card-outline" },
                ] as const)
              : ([{ value: "pay_in_store", label: "Pay in store (cash or card)", icon: "storefront-outline" }] as const)
            ).map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.payRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                onPress={() => setPayment(option.value)}
              >
                <Ionicons name={option.icon} size={20} color={BRAND.gold} />
                <Text style={[styles.flex, styles.payText, { color: colors.text }]}>{option.label}</Text>
                <Ionicons
                  name={payment === option.value ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={payment === option.value ? BRAND.gold : colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </Card>

          {/* Summary */}
          <Card style={styles.summary}>
            <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
            {discountAmount > 0 && <SummaryRow label="Discount" value={`−${formatPrice(discountAmount)}`} accent />}
            {orderType === "delivery" && (
              <SummaryRow label="Delivery" value={deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)} />
            )}
            {orderType === "delivery" && config && deliveryFee > 0 && (
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Free delivery on orders over {formatPrice(config.free_delivery_threshold)}.
              </Text>
            )}
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
            {pointsToEarn > 0 && (
              <Text style={[styles.points, { color: BRAND.lime }]}>
                You&apos;ll earn {pointsToEarn} points with this order
              </Text>
            )}
            {errors.basket && <Text style={[styles.warn, { color: colors.error }]}>{errors.basket}</Text>}
          </Card>

          <BrandButton
            title={`Place order · ${formatPrice(total)}`}
            icon="checkmark-circle"
            loading={placing}
            onPress={placeOrder}
            style={styles.placeBtn}
          />
          <Text style={[styles.hint, styles.center, { color: colors.textMuted }]}>
            Prices include VAT. By placing your order you agree to pay the store on{" "}
            {orderType === "delivery" ? "delivery" : "collection"}.
          </Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: accent ? BRAND.lime : colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 60 },
  content: { padding: 16 },
  sectionTitle: { color: BRAND.gold, fontSize: 17, fontWeight: "900", marginTop: 22, marginBottom: 10 },
  segment: { flexDirection: "row", gap: 8 },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  segmentText: { fontSize: 13, fontWeight: "800" },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  storeName: { fontSize: 16, fontWeight: "800" },
  storeMeta: { fontSize: 12, marginTop: 2 },
  storeOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, marginTop: 12, borderTopWidth: 1 },
  storeOptionName: { fontSize: 15, fontWeight: "700" },
  openPill: { fontSize: 12, fontWeight: "800" },
  warn: { fontSize: 12, marginTop: 8 },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  addressForm: { marginTop: 6 },
  inline: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  hint: { fontSize: 12, lineHeight: 18 },
  link: { color: BRAND.gold, fontWeight: "800" },
  signIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  signInText: { flex: 1, fontSize: 13, lineHeight: 18 },
  applied: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  remove: { fontWeight: "800" },
  applyBtn: { marginTop: 4, minWidth: 90 },
  payRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  payText: { fontSize: 15, fontWeight: "600" },
  summary: { marginTop: 22 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 15 },
  summaryValue: { fontSize: 15, fontWeight: "700" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 6,
  },
  totalLabel: { fontSize: 18, fontWeight: "900" },
  totalValue: { color: BRAND.gold, fontSize: 24, fontWeight: "900" },
  points: { fontSize: 13, fontWeight: "700", marginTop: 8 },
  placeBtn: { marginTop: 20, marginBottom: 12 },
  center: { textAlign: "center" },
});
