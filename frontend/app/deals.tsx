import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { useTheme, BRAND, FONTS } from "../theme/ThemeContext";
import { ScreenHeader, BrandButton, formatPrice } from "../components/ui";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { useCheckoutStore } from "../store/checkoutStore";
import { useDealsStore, DealInfo } from "../store/dealsStore";
import { lightHaptic } from "../utils/haptics";

const discountLabel = (deal: DealInfo) => {
  if (deal.discount_percentage) return `${deal.discount_percentage}% OFF`;
  if (deal.discount_amount) return `${formatPrice(deal.discount_amount).replace(".00", "")} OFF`;
  return "OFFER";
};

const formatExpiry = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const daysLeft = (value: string) => {
  const end = new Date(value);
  if (Number.isNaN(end.getTime())) return null;
  end.setHours(23, 59, 59, 999);
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
};

function DealCard({
  deal,
  onCopy,
  onUse,
}: {
  deal: DealInfo;
  onCopy: (code: string) => void;
  onUse: (code: string) => void;
}) {
  const { colors } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const expiry = formatExpiry(deal.valid_until);
  const remaining = daysLeft(deal.valid_until);
  const endingSoon = remaining != null && remaining <= 7;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.imageWrap, { backgroundColor: colors.surfaceLight }]}>
        {deal.image_url && !imageFailed ? (
          <Image
            source={{ uri: deal.image_url }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="pricetags" size={42} color={BRAND.gold} />
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{discountLabel(deal)}</Text>
        </View>
        {endingSoon && remaining != null && remaining >= 0 && (
          <View style={styles.soonBadge}>
            <Ionicons name="time" size={12} color={BRAND.white} />
            <Text style={styles.soonText}>
              {remaining === 0 ? "Ends today" : `${remaining} day${remaining === 1 ? "" : "s"} left`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.secondary }]}>{deal.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{deal.description}</Text>

        {deal.terms ? (
          <View style={styles.metaRow}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>{deal.terms}</Text>
          </View>
        ) : null}
        {expiry ? (
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>Valid until {expiry}</Text>
          </View>
        ) : null}

        {deal.code ? (
          <>
            <TouchableOpacity
              onPress={() => onCopy(deal.code!)}
              style={styles.codeBox}
              accessibilityRole="button"
              accessibilityLabel={`Copy code ${deal.code}`}
            >
              <View>
                <Text style={[styles.codeLabel, { color: colors.textMuted }]}>Use code</Text>
                <Text style={styles.codeText} selectable>
                  {deal.code}
                </Text>
              </View>
              <Ionicons name="copy-outline" size={20} color={BRAND.gold} />
            </TouchableOpacity>
            <View style={styles.actions}>
              <BrandButton
                title="Copy code"
                icon="copy-outline"
                variant="outline"
                size="sm"
                style={{ flex: 1 }}
                onPress={() => onCopy(deal.code!)}
              />
              <BrandButton
                title="Use code"
                icon="cart"
                size="sm"
                style={{ flex: 1 }}
                onPress={() => onUse(deal.code!)}
              />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

export default function DealsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const setPromoCode = useCheckoutStore((s) => s.setPromoCode);
  const { deals, isLoading, hasLoaded, error, fetchDeals } = useDealsStore();
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const ok = await fetchDeals();
    if (!ok) {
      const message = useDealsStore.getState().error;
      if (message) showToast({ message, type: "error" });
    }
  }, [fetchDeals, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const copyCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      lightHaptic();
      showToast({ message: `Copied ${code}`, type: "success" });
    } catch {
      showToast({ message: "Couldn't copy the code. Please note it down.", type: "error" });
    }
  };

  const applyCode = (code: string) => {
    lightHaptic();
    setPromoCode(code);
    showToast({ message: `${code} will be applied at checkout`, type: "info" });
    router.push("/cart");
  };

  const listEmpty = () => {
    if (!hasLoaded || (isLoading && !refreshing)) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={BRAND.gold} size="large" />
        </View>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load deals"
          message={error}
          actionLabel="Try again"
          onAction={load}
        />
      );
    }
    return (
      <EmptyState
        icon="pricetags-outline"
        title="No deals right now"
        message="New offers land regularly — check back soon, or treat yourself from the menu."
        actionLabel="Browse the menu"
        onAction={() => router.push("/menu")}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Deals & offers" subtitle="Codes apply at checkout" />
      <FlatList
        data={deals}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => <DealCard deal={item} onCopy={copyCode} onUse={applyCode} />}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListHeaderComponent={
          deals.length > 0 ? (
            <View style={styles.intro}>
              <Text style={styles.script}>Fresh offers</Text>
              <Text style={[styles.introTitle, { color: colors.secondary }]}>Today&apos;s deals</Text>
              <Text style={[styles.introText, { color: colors.textMuted }]}>
                Tap “Use code” and we&apos;ll add it to your order. One code per order.
              </Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
          deals.length === 0 && { flexGrow: 1 },
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
  intro: { marginBottom: 16 },
  script: { fontFamily: FONTS.script, fontSize: 24, color: BRAND.orange, marginBottom: -2 },
  introTitle: { fontSize: 24, fontWeight: "800" },
  introText: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  imageWrap: { height: 150, position: "relative" },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: BRAND.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: BRAND.purpleDeep, fontWeight: "900", fontSize: 14, letterSpacing: 0.5 },
  soonBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: BRAND.orange,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  soonText: { color: BRAND.white, fontWeight: "800", fontSize: 12 },
  body: { padding: 16 },
  title: { fontSize: 19, fontWeight: "800" },
  description: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 8 },
  metaText: { fontSize: 12, lineHeight: 17, flex: 1 },
  codeBox: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,215,79,0.5)",
    backgroundColor: "rgba(255,215,79,0.08)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  codeLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  codeText: { fontSize: 20, fontWeight: "900", color: BRAND.gold, letterSpacing: 1.5, marginTop: 2 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
});
