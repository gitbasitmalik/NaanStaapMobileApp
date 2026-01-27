import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCartStore } from "../store/cartStore";
import axios from "axios";
import { useTheme } from "../theme/ThemeContext";
import {
  AnimatedButton,
  FadeInView,
  SlideInView,
  ScaleInView,
  BounceView,
} from "../components/AnimatedComponents";
import { EmptyState, SuccessAnimation } from "../components/EmptyState";
import {
  lightHaptic,
  mediumHaptic,
  successHaptic,
  errorHaptic,
  removeItemHaptic,
} from "../utils/haptics";

const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const {
    items,
    subtotal,
    deliveryFee,
    total,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCartStore();

  const [showCheckout, setShowCheckout] = useState(false);
  const [orderType, setOrderType] = useState<"delivery" | "pickup" | "dine-in">(
    "delivery"
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleQuantityChange = (itemId: string, change: number) => {
    const item = items.find((i) => i.item_id === itemId);
    if (item) {
      const newQuantity = item.quantity + change;
      if (newQuantity <= 0) {
        errorHaptic();
        Alert.alert("Remove Item", "Remove this item from cart?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              removeItemHaptic();
              removeItem(itemId);
            },
          },
        ]);
      } else {
        lightHaptic();
        updateQuantity(itemId, newQuantity);
      }
    }
  };

  const handleCheckout = async () => {
    if (!customerName || !customerPhone || !customerEmail) {
      errorHaptic();
      Alert.alert("Missing Information", "Please fill in all required fields");
      return;
    }
    if (orderType === "delivery" && !deliveryAddress) {
      errorHaptic();
      Alert.alert("Missing Address", "Please enter a delivery address");
      return;
    }

    setSubmitting(true);
    try {
      let cartId = "";
      for (const item of items) {
        const response = await axios.post(`${API_URL}/api/cart/add`, {
          cart_id: cartId || null,
          item_id: item.item_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          customizations: item.customizations,
          special_instructions: item.special_instructions,
        });
        cartId = response.data.id;
      }

      const orderResponse = await axios.post(`${API_URL}/api/orders`, {
        cart_id: cartId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_address: orderType === "delivery" ? deliveryAddress : null,
        store_id: "1",
        order_type: orderType,
        payment_method: "cash",
        special_instructions: specialInstructions,
      });

      setOrderId(orderResponse.data.id);
      clearCart();
      setShowSuccess(true);
      successHaptic();
      setTimeout(() => {
        setShowSuccess(false);
        setOrderComplete(true);
      }, 1500);
    } catch (error) {
      console.error("Order error:", error);
      errorHaptic();
      Alert.alert("Error", "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <View style={styles.successContainer}>
          <SuccessAnimation />
        </View>
      </View>
    );
  }

  if (orderComplete) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <ScaleInView style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark-circle"
              size={80}
              color={colors.success}
            />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Order Placed!
          </Text>
          <Text style={[styles.successMessage, { color: colors.textMuted }]}>
            Your order has been confirmed.
          </Text>
          <FadeInView
            delay={300}
            style={[
              styles.orderIdContainer,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.orderIdLabel, { color: colors.textMuted }]}>
              Order ID:
            </Text>
            <Text style={styles.orderIdText}>
              {orderId.slice(0, 8).toUpperCase()}
            </Text>
          </FadeInView>
          <Text style={[styles.estimatedTime, { color: colors.textMuted }]}>
            Estimated time: 25-35 minutes
          </Text>
          <SlideInView direction="bottom" delay={500}>
            <AnimatedButton
              style={styles.continueBtn}
              onPress={() => {
                mediumHaptic();
                setOrderComplete(false);
                setShowCheckout(false);
                router.push("/");
              }}
            >
              <Text style={styles.continueBtnText}>Continue Shopping</Text>
            </AnimatedButton>
          </SlideInView>
        </ScaleInView>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Your Cart
          </Text>
        </View>
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          message="Add some delicious items from our menu!"
          action={
            <AnimatedButton
              style={styles.browseBtn}
              onPress={() => {
                mediumHaptic();
                router.push("/menu");
              }}
            >
              <Ionicons name="restaurant" size={20} color="#FFF" />
              <Text style={styles.browseBtnText}>Browse Menu</Text>
            </AnimatedButton>
          }
        />
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
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Your Cart
        </Text>
        <AnimatedButton
          onPress={() => {
            errorHaptic();
            Alert.alert("Clear Cart", "Remove all items?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Clear",
                style: "destructive",
                onPress: () => {
                  removeItemHaptic();
                  clearCart();
                },
              },
            ]);
          }}
        >
          <Text style={styles.clearText}>Clear All</Text>
        </AnimatedButton>
      </View>

      <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
        {items.map((item, index) => (
          <SlideInView
            key={`${item.item_id}-${index}`}
            direction="right"
            delay={index * 80}
          >
            <View
              style={[styles.cartItem, { backgroundColor: colors.surface }]}
            >
              <Image
                source={{ uri: item.image_url }}
                style={styles.itemImage}
              />
              <View style={styles.itemContent}>
                <Text style={[styles.itemName, { color: colors.text }]}>
                  {item.name}
                </Text>
                {item.customizations.length > 0 && (
                  <Text
                    style={[
                      styles.itemCustomizations,
                      { color: colors.textMuted },
                    ]}
                  >
                    {item.customizations.join(", ")}
                  </Text>
                )}
                <Text style={styles.itemPrice}>
                  £{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
              <View style={styles.quantityControls}>
                <AnimatedButton
                  style={[
                    styles.qtyBtn,
                    { backgroundColor: colors.surfaceLight },
                  ]}
                  onPress={() => handleQuantityChange(item.item_id, -1)}
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </AnimatedButton>
                <BounceView trigger={item.quantity}>
                  <Text style={[styles.qtyText, { color: colors.text }]}>
                    {item.quantity}
                  </Text>
                </BounceView>
                <AnimatedButton
                  style={[
                    styles.qtyBtn,
                    { backgroundColor: colors.surfaceLight },
                  ]}
                  onPress={() => handleQuantityChange(item.item_id, 1)}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </AnimatedButton>
              </View>
            </View>
          </SlideInView>
        ))}

        {/* Order Summary */}
        <FadeInView
          delay={300}
          style={[styles.summaryCard, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            Order Summary
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Subtotal
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              £{subtotal.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Delivery Fee
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              £{deliveryFee.toFixed(2)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              styles.totalRow,
              { borderTopColor: colors.border },
            ]}
          >
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              Total
            </Text>
            <Text style={styles.totalValue}>£{total.toFixed(2)}</Text>
          </View>
        </FadeInView>
      </ScrollView>

      {/* Checkout Button */}
      <SlideInView
        direction="bottom"
        style={[styles.checkoutContainer, { borderTopColor: colors.border }]}
      >
        <AnimatedButton
          style={styles.checkoutBtn}
          onPress={() => {
            mediumHaptic();
            setShowCheckout(true);
          }}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </AnimatedButton>
      </SlideInView>

      {/* Checkout Modal */}
      <Modal visible={showCheckout} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Checkout
              </Text>
              <AnimatedButton
                onPress={() => {
                  lightHaptic();
                  setShowCheckout(false);
                }}
              >
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </AnimatedButton>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Order Type */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Order Type
              </Text>
              <View style={styles.orderTypeContainer}>
                {(["delivery", "pickup", "dine-in"] as const).map((type) => (
                  <AnimatedButton
                    key={type}
                    style={[
                      styles.orderTypeBtn,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                      orderType === type ? styles.orderTypeActive : {},
                    ]}
                    onPress={() => {
                      lightHaptic();
                      setOrderType(type);
                    }}
                  >
                    <Ionicons
                      name={
                        type === "delivery"
                          ? "bicycle"
                          : type === "pickup"
                          ? "bag-handle"
                          : "restaurant"
                      }
                      size={20}
                      color={orderType === type ? "#FFF" : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.orderTypeText,
                        orderType === type && styles.orderTypeTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() +
                        type.slice(1).replace("-", " ")}
                    </Text>
                  </AnimatedButton>
                ))}
              </View>

              {/* Customer Details */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Your Details
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Full Name *"
                placeholderTextColor={colors.textMuted}
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Phone Number *"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={customerPhone}
                onChangeText={setCustomerPhone}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Email *"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={customerEmail}
                onChangeText={setCustomerEmail}
              />

              {orderType === "delivery" && (
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Delivery Address *"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                />
              )}

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Special Instructions (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
              />

              {/* Total */}
              <View
                style={[
                  styles.checkoutTotal,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text
                  style={[styles.checkoutTotalLabel, { color: colors.text }]}
                >
                  Total to Pay
                </Text>
                <Text style={styles.checkoutTotalValue}>
                  £{(orderType === "delivery" ? total : subtotal).toFixed(2)}
                </Text>
              </View>

              <AnimatedButton
                style={[
                  styles.placeOrderBtn,
                  submitting ? { opacity: 0.7 } : {},
                ]}
                onPress={handleCheckout}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.placeOrderText}>Place Order</Text>
                  </>
                )}
              </AnimatedButton>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: "bold" },
  clearText: { color: "#E53935", fontSize: 14, fontWeight: "600" },
  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND_PURPLE,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  browseBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  cartList: { flex: 1, padding: 16 },
  cartItem: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemImage: { width: 70, height: 70, borderRadius: 8 },
  itemContent: { flex: 1, marginLeft: 12, justifyContent: "center" },
  itemName: { fontSize: 16, fontWeight: "600" },
  itemCustomizations: { fontSize: 12, marginTop: 2 },
  itemPrice: {
    color: BRAND_GOLD,
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
  },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: { fontSize: 16, fontWeight: "bold", width: 24, textAlign: "center" },
  summaryCard: { borderRadius: 16, padding: 20, marginTop: 12 },
  summaryTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14 },
  totalRow: { borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 18, fontWeight: "bold" },
  totalValue: { color: BRAND_GOLD, fontSize: 20, fontWeight: "bold" },
  checkoutContainer: { padding: 16, paddingBottom: 24, borderTopWidth: 1 },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_PURPLE,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkoutBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 24, fontWeight: "bold" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 12,
  },
  orderTypeContainer: { flexDirection: "row", gap: 12 },
  orderTypeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  orderTypeActive: { backgroundColor: BRAND_PURPLE, borderColor: BRAND_PURPLE },
  orderTypeText: { color: "#888", fontSize: 12, fontWeight: "500" },
  orderTypeTextActive: { color: "#FFF" },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  textArea: { height: 80, paddingTop: 14 },
  checkoutTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  checkoutTotalLabel: { fontSize: 16, fontWeight: "600" },
  checkoutTotalValue: { color: BRAND_GOLD, fontSize: 24, fontWeight: "bold" },
  placeOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28A745",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  placeOrderText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  successIcon: { marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: "bold" },
  successMessage: { fontSize: 16, marginTop: 8 },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  orderIdLabel: { fontSize: 14 },
  orderIdText: { color: BRAND_GOLD, fontSize: 18, fontWeight: "bold" },
  estimatedTime: { fontSize: 14, marginTop: 16 },
  continueBtn: {
    backgroundColor: BRAND_PURPLE,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 32,
  },
  continueBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
