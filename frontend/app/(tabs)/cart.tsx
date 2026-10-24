import React from "react";
import { View, Text, StyleSheet, ScrollView, Image, Alert, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCartStore, lineKey } from "../../store/cartStore";
import { useCheckoutStore } from "../../store/checkoutStore";
import { useAuthStore } from "../../store/authStore";
import { useTheme, BRAND, FONTS } from "../../theme/ThemeContext";
import { BounceView } from "../../components/AnimatedComponents";
import { EmptyState } from "../../components/EmptyState";
import { BrandButton, formatPrice } from "../../components/ui";
import { lightHaptic, removeItemHaptic } from "../../utils/haptics";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCartStore();
  const promoCode = useCheckoutStore((s) => s.promoCode);
  const { isAuthenticated } = useAuthStore();

  const changeQuantity = (key: string, current: number, change: number) => {
    const next = current + change;
    if (next <= 0) {
      Alert.alert("Remove item", "Remove this item from your basket?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removeItemHaptic();
            removeItem(key);
          },
        },
      ]);
      return;
    }
    lightHaptic();
    updateQuantity(key, Math.min(50, next));
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerScript}>Hungry?</Text>
          <Text style={styles.headerTitle}>Your basket</Text>
        </View>
        <EmptyState
          icon="bag-outline"
          title="Your basket is empty"
          message="Stuffed naan, karak chai, loaded fries… go on, treat yourself."
          actionLabel="Browse the menu"
          onAction={() => router.push("/menu")}
        />
      </View>
    );
  }

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, styles.headerRow]}>
        <View>
          <Text style={styles.headerScript}>{count} {count === 1 ? "item" : "items"}</Text>
          <Text style={styles.headerTitle}>Your basket</Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Clear basket", "Remove everything from your basket?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Clear",
                style: "destructive",
                onPress: () => {
                  removeItemHaptic();
                  clearCart();
                },
              },
            ])
          }
          hitSlop={10}
        >
          <Text style={[styles.clear, { color: colors.error }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const key = lineKey(item);
          return (
            <View key={key} style={[styles.line, { backgroundColor: colors.surface }]}>
              <Image source={{ uri: item.image_url }} style={styles.lineImage} />
              <View style={styles.lineBody}>
                <Text style={[styles.lineName, { color: colors.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.customizations.length > 0 && (
                  <Text style={[styles.lineMeta, { color: colors.textMuted }]}>
                    {item.customizations.join(" · ")}
                  </Text>
                )}
                {item.special_instructions ? (
                  <Text style={[styles.lineMeta, { color: colors.textMuted }]} numberOfLines={2}>
                    “{item.special_instructions}”
                  </Text>
                ) : null}
                <Text style={styles.linePrice}>{formatPrice(item.price * item.quantity)}</Text>
              </View>
              <View style={styles.qty}>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: colors.surfaceLight }]}
                  onPress={() => changeQuantity(key, item.quantity, 1)}
                  accessibilityLabel={`Add one ${item.name}`}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </TouchableOpacity>
                <BounceView trigger={item.quantity}>
                  <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                </BounceView>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: colors.surfaceLight }]}
                  onPress={() => changeQuantity(key, item.quantity, -1)}
                  accessibilityLabel={`Remove one ${item.name}`}
                >
                  <Ionicons name={item.quantity === 1 ? "trash-outline" : "remove"} size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.addMore} onPress={() => router.push("/menu")}>
          <Ionicons name="add-circle-outline" size={20} color={BRAND.gold} />
          <Text style={styles.addMoreText}>Add more items</Text>
        </TouchableOpacity>

        {promoCode && (
          <View style={[styles.note, { borderColor: BRAND.lime }]}>
            <Ionicons name="pricetag" size={18} color={BRAND.lime} />
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              Code <Text style={styles.bold}>{promoCode}</Text> will be applied at checkout.
            </Text>
          </View>
        )}
        {!isAuthenticated && (
          <TouchableOpacity
            style={[styles.note, { borderColor: BRAND.gold }]}
            onPress={() => router.push("/auth/login")}
          >
            <Ionicons name="gift-outline" size={18} color={BRAND.gold} />
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              <Text style={styles.bold}>Sign in</Text> to earn 10 points for every £1 you spend.
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatPrice(subtotal)}</Text>
        </View>
        <Text style={[styles.footerHint, { color: colors.textMuted }]}>
          Delivery fees and offers are worked out at checkout.
        </Text>
        <BrandButton title="Go to checkout" icon="arrow-forward" onPress={() => router.push("/checkout")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  headerScript: { fontFamily: FONTS.script, fontSize: 24, color: BRAND.orange },
  headerTitle: { fontSize: 32, fontWeight: "900", color: BRAND.gold, marginTop: -4 },
  clear: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  list: { padding: 16, paddingBottom: 24 },
  line: { flexDirection: "row", borderRadius: 18, padding: 12, marginBottom: 12, gap: 12 },
  lineImage: { width: 72, height: 72, borderRadius: 14 },
  lineBody: { flex: 1 },
  lineName: { fontSize: 15, fontWeight: "800" },
  lineMeta: { fontSize: 12, marginTop: 3 },
  linePrice: { color: BRAND.gold, fontSize: 15, fontWeight: "900", marginTop: 6 },
  qty: { alignItems: "center", justifyContent: "space-between" },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 16, fontWeight: "900", marginVertical: 2 },
  addMore: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", padding: 10 },
  addMoreText: { color: BRAND.gold, fontWeight: "800", fontSize: 15 },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18 },
  bold: { fontWeight: "800", color: BRAND.gold },
  footer: { padding: 16, paddingBottom: 18, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 16, fontWeight: "600" },
  totalValue: { color: BRAND.gold, fontSize: 22, fontWeight: "900" },
  footerHint: { fontSize: 12, marginTop: 2, marginBottom: 12 },
});
