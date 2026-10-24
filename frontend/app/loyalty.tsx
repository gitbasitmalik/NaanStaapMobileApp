import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { useTheme, BRAND, FONTS } from "../theme/ThemeContext";
import { ScreenHeader, BrandButton, SectionHeading, Card, formatPrice } from "../components/ui";
import { EmptyState } from "../components/EmptyState";
import { FadeInView } from "../components/AnimatedComponents";
import { useToast } from "../components/Toast";
import { useAuthStore } from "../store/authStore";
import { useCheckoutStore } from "../store/checkoutStore";
import {
  useLoyaltyStore,
  rewardPoundValue,
  Reward,
  Redemption,
  LoyaltyTransaction,
  POINTS_PER_POUND,
  POINTS_PER_POUND_OFF,
} from "../store/loyaltyStore";
import { lightHaptic, successHaptic, errorHaptic } from "../utils/haptics";

type IconName = keyof typeof Ionicons.glyphMap;

const TX_ICONS: Record<string, IconName> = {
  order_points: "receipt-outline",
  redemption: "pricetag-outline",
  review_bonus: "star-outline",
  referral_bonus: "people-outline",
  welcome_bonus: "gift-outline",
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export default function LoyaltyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { isAuthenticated, isLoading: authLoading, refreshUserData } = useAuthStore();
  const setPromoCode = useCheckoutStore((s) => s.setPromoCode);
  const {
    balance,
    rewards,
    history,
    historyPage,
    historyPages,
    referralInfo,
    isLoading,
    fetchAll,
    fetchHistory,
    redeemPoints,
  } = useLoyaltyStore();

  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);

  const load = useCallback(async () => {
    // Refresh the profile first so tier progress uses up-to-date lifetime spend.
    await refreshUserData();
    const ok = await fetchAll();
    setHasLoaded(true);
    if (!ok) {
      const message = useLoyaltyStore.getState().error;
      if (message) showToast({ message, type: "error" });
    }
  }, [fetchAll, refreshUserData, showToast]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const poundRewards = useMemo(
    () =>
      rewards
        .map((r) => ({ reward: r, value: rewardPoundValue(r) }))
        .filter((r): r is { reward: Reward; value: number } => r.value != null)
        .sort((a, b) => a.reward.points_required - b.reward.points_required),
    [rewards]
  );

  const copyCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      lightHaptic();
      showToast({ message: `Copied ${code}`, type: "success" });
    } catch {
      showToast({ message: "Couldn't copy the code. Please note it down.", type: "error" });
    }
  };

  const applyAtCheckout = (code: string) => {
    setPromoCode(code);
    router.push("/cart");
  };

  const confirmRedeem = (reward: Reward, value: number) => {
    Alert.alert(
      `Redeem ${reward.name}?`,
      `This uses ${reward.points_required} points and gives you a one-time code worth ${formatPrice(
        value
      )} off, valid for 30 days.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "Redeem", onPress: () => doRedeem(reward) },
      ]
    );
  };

  const doRedeem = async (reward: Reward) => {
    setRedeemingId(reward.id);
    const result = await redeemPoints(reward.points_required);
    setRedeemingId(null);
    if (result.ok) {
      successHaptic();
      setRedemption(result.redemption);
      showToast({
        message: `${formatPrice(result.redemption.discountValue)} off code ready!`,
        type: "success",
      });
    } else {
      errorHaptic();
      showToast({ message: result.error, type: "error" });
    }
  };

  const shareReferral = async () => {
    if (!referralInfo) return;
    try {
      await Share.share({
        message: `${referralInfo.share_message}`,
        title: "Join me at Naan Staap",
      });
    } catch {
      showToast({ message: "Couldn't open the share sheet.", type: "error" });
    }
  };

  const loadMoreHistory = async () => {
    setLoadingMoreHistory(true);
    const ok = await fetchHistory(historyPage + 1);
    setLoadingMoreHistory(false);
    if (!ok) {
      const message = useLoyaltyStore.getState().error;
      if (message) showToast({ message, type: "error" });
    }
  };

  // ----- Signed out -----
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Rewards" />
        {authLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={BRAND.gold} size="large" />
          </View>
        ) : (
          <EmptyState
            icon="gift-outline"
            title="Earn rewards with every order"
            message={`Sign in to collect ${POINTS_PER_POUND} points for every £1 you spend and swap ${POINTS_PER_POUND_OFF} points for £1 off.`}
            actionLabel="Sign in"
            onAction={() => router.push("/auth/login")}
          />
        )}
      </View>
    );
  }

  if (!balance && (!hasLoaded || isLoading)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Rewards" />
        <View style={styles.center}>
          <ActivityIndicator color={BRAND.gold} size="large" />
        </View>
      </View>
    );
  }

  if (!balance) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Rewards" />
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your rewards"
          message="Please check your connection and try again."
          actionLabel="Try again"
          onAction={load}
        />
      </View>
    );
  }

  const progressPct = Math.round(balance.tier_progress * 100);

  const renderTx = (tx: LoyaltyTransaction, index: number) => {
    const positive = tx.points >= 0;
    return (
      <View
        key={tx.id || `${tx.created_at}-${index}`}
        style={[
          styles.txRow,
          index < history.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.txIcon, { backgroundColor: "rgba(255,215,79,0.12)" }]}>
          <Ionicons name={TX_ICONS[tx.type] || "sparkles-outline"} size={18} color={BRAND.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={2}>
            {tx.description}
          </Text>
          <Text style={[styles.txDate, { color: colors.textMuted }]}>{formatDate(tx.created_at)}</Text>
          {tx.discount_code ? (
            <TouchableOpacity
              onPress={() => copyCode(tx.discount_code!)}
              style={styles.txCode}
              hitSlop={6}
              accessibilityLabel={`Copy code ${tx.discount_code}`}
            >
              <Ionicons name="copy-outline" size={13} color={BRAND.orange} />
              <Text style={styles.txCodeText}>{tx.discount_code}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={[styles.txPoints, { color: positive ? BRAND.lime : colors.error }]}>
          {positive ? "+" : ""}
          {tx.points}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Rewards" subtitle="Naan Staap loyalty" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.gold} colors={[BRAND.orange]} />
        }
      >
        {/* Balance card */}
        <FadeInView>
          <View style={[styles.balanceCard, { borderColor: "rgba(255,215,79,0.35)" }]}>
            <View style={styles.balanceTop}>
              <View>
                <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Your points</Text>
                <Text style={styles.balancePoints}>{balance.points.toLocaleString("en-GB")}</Text>
                <Text style={[styles.balanceValue, { color: colors.text }]}>
                  Worth {formatPrice(balance.redeemable_value)} off
                </Text>
              </View>
              <View style={styles.tierBadge}>
                <Ionicons name="trophy" size={16} color={BRAND.purpleDeep} />
                <Text style={styles.tierBadgeText}>{balance.tier}</Text>
              </View>
            </View>

            <View style={styles.progressWrap}>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {balance.next_tier
                    ? `Spend ${formatPrice(balance.spend_to_next_tier)} more to reach ${balance.next_tier}`
                    : "You're at our top tier — thank you!"}
                </Text>
                {balance.next_tier ? (
                  <Text style={[styles.progressText, { color: BRAND.gold, fontWeight: "800" }]}>
                    {progressPct}%
                  </Text>
                ) : null}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(progressPct, 3)}%` }]} />
              </View>
            </View>

            {balance.tier_benefits.length > 0 && (
              <View style={styles.benefits}>
                <Text style={[styles.benefitsTitle, { color: BRAND.gold }]}>
                  {balance.tier} benefits
                </Text>
                {balance.tier_benefits.map((b) => (
                  <View key={b} style={styles.benefitRow}>
                    <Ionicons name="checkmark-circle" size={16} color={BRAND.lime} />
                    <Text style={[styles.benefitText, { color: colors.text }]}>{b}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.statsRow, { borderTopColor: "rgba(255,255,255,0.14)" }]}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{balance.total_earned.toLocaleString("en-GB")}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Earned</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{balance.total_redeemed.toLocaleString("en-GB")}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Redeemed</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{balance.points_to_next_reward}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>To next £1</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* Fresh redemption code */}
        {redemption && (
          <FadeInView>
            <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: BRAND.gold }]}>
              <Text style={styles.script}>Enjoy!</Text>
              <Text style={[styles.codeTitle, { color: colors.text }]}>
                Your {formatPrice(redemption.discountValue)} off code
              </Text>
              <TouchableOpacity
                onPress={() => copyCode(redemption.code)}
                style={[styles.codeBox, { borderColor: "rgba(255,215,79,0.5)" }]}
                accessibilityLabel={`Copy code ${redemption.code}`}
              >
                <Text style={styles.codeText} selectable>
                  {redemption.code}
                </Text>
                <Ionicons name="copy-outline" size={20} color={BRAND.gold} />
              </TouchableOpacity>
              <Text style={[styles.codeNote, { color: colors.textMuted }]}>
                One use. Minimum order {formatPrice(redemption.discountValue + 5)}.
                {redemption.expiresAt ? ` Expires ${formatDate(redemption.expiresAt)}.` : ""} You can
                also find it in your points history below.
              </Text>
              <View style={styles.codeActions}>
                <BrandButton
                  title="Copy code"
                  icon="copy-outline"
                  variant="outline"
                  size="sm"
                  style={{ flex: 1 }}
                  onPress={() => copyCode(redemption.code)}
                />
                <BrandButton
                  title="Use at checkout"
                  icon="cart"
                  size="sm"
                  style={{ flex: 1 }}
                  onPress={() => applyAtCheckout(redemption.code)}
                />
              </View>
            </View>
          </FadeInView>
        )}

        {/* How it works */}
        <SectionHeading title="How it works" script="Eat, earn, repeat" style={styles.sectionGap} />
        <Card>
          {[
            { icon: "restaurant-outline" as IconName, text: `Earn ${POINTS_PER_POUND} points for every £1 you spend (more at Silver and Gold)` },
            { icon: "cash-outline" as IconName, text: `${POINTS_PER_POUND_OFF} points = £1 off your order` },
            { icon: "star-outline" as IconName, text: "Get 25 bonus points when you rate an order" },
            {
              icon: "people-outline" as IconName,
              text: referralInfo
                ? `${referralInfo.reward_per_referral} points for every friend who joins with your code`
                : "Bonus points for every friend you refer",
            },
          ].map((row, i, arr) => (
            <View
              key={row.text}
              style={[styles.howRow, i < arr.length - 1 && { marginBottom: 12 }]}
            >
              <View style={[styles.howIcon, { backgroundColor: "rgba(255,215,79,0.12)" }]}>
                <Ionicons name={row.icon} size={18} color={BRAND.gold} />
              </View>
              <Text style={[styles.howText, { color: colors.textSecondary }]}>{row.text}</Text>
            </View>
          ))}
        </Card>

        {/* Rewards */}
        <SectionHeading title="Redeem points" script="Treat yourself" style={styles.sectionGap} />
        {poundRewards.length === 0 ? (
          <Card>
            <Text style={[styles.muted, { color: colors.textMuted }]}>
              No rewards are available right now. Pull down to refresh.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            {poundRewards.map(({ reward, value }) => {
              const canRedeem = balance.points >= reward.points_required;
              const remaining = Math.max(0, reward.points_required - balance.points);
              const pct = Math.min(100, Math.round((balance.points / reward.points_required) * 100));
              return (
                <View
                  key={reward.id}
                  style={[
                    styles.rewardCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: canRedeem ? "rgba(255,215,79,0.45)" : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.rewardValue, { backgroundColor: canRedeem ? BRAND.gold : colors.surfaceLight }]}>
                    <Text style={[styles.rewardValueText, { color: canRedeem ? BRAND.purpleDeep : BRAND.gold }]}>
                      {formatPrice(value).replace(".00", "")}
                    </Text>
                    <Text style={[styles.rewardValueSub, { color: canRedeem ? BRAND.purpleDeep : colors.textMuted }]}>
                      OFF
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rewardName, { color: colors.text }]}>{reward.name}</Text>
                    <Text style={[styles.rewardDesc, { color: colors.textMuted }]}>
                      {reward.points_required.toLocaleString("en-GB")} points · {reward.description}
                    </Text>
                    {!canRedeem && (
                      <View style={{ marginTop: 8 }}>
                        <View style={[styles.miniTrack, { backgroundColor: colors.surfaceLight }]}>
                          <View style={[styles.miniFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={[styles.rewardDesc, { color: colors.textMuted, marginTop: 4 }]}>
                          {remaining} more points to go
                        </Text>
                      </View>
                    )}
                  </View>
                  {canRedeem && (
                    <BrandButton
                      title="Redeem"
                      size="sm"
                      loading={redeemingId === reward.id}
                      disabled={!!redeemingId && redeemingId !== reward.id}
                      onPress={() => confirmRedeem(reward, value)}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Referral */}
        {referralInfo && (
          <>
            <SectionHeading title="Invite friends" script="Share the love" style={styles.sectionGap} />
            <Card>
              <Text style={[styles.referralText, { color: colors.textSecondary }]}>
                Friends get {referralInfo.referee_bonus} bonus points when they sign up with your code, and you
                get {referralInfo.reward_per_referral} points for each one.
              </Text>
              <TouchableOpacity
                onPress={() => copyCode(referralInfo.referral_code)}
                style={[styles.codeBox, { borderColor: "rgba(255,215,79,0.5)", marginTop: 14 }]}
                accessibilityLabel={`Copy referral code ${referralInfo.referral_code}`}
              >
                <Text style={styles.codeText} selectable>
                  {referralInfo.referral_code}
                </Text>
                <Ionicons name="copy-outline" size={20} color={BRAND.gold} />
              </TouchableOpacity>
              <View style={styles.referralStats}>
                <Text style={[styles.muted, { color: colors.textMuted }]}>
                  {referralInfo.referral_count} friend{referralInfo.referral_count === 1 ? "" : "s"} joined ·{" "}
                  {referralInfo.total_points_earned.toLocaleString("en-GB")} points earned
                </Text>
              </View>
              <BrandButton title="Share my code" icon="share-social" variant="gold" onPress={shareReferral} />
            </Card>
          </>
        )}

        {/* History */}
        <SectionHeading title="Points history" style={styles.sectionGap} />
        <Card style={{ paddingVertical: 4 }}>
          {history.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Ionicons name="time-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.muted, { color: colors.textMuted, textAlign: "center", marginTop: 8 }]}>
                No points activity yet. Place an order to start earning.
              </Text>
              <BrandButton
                title="Order now"
                size="sm"
                style={{ marginTop: 12 }}
                onPress={() => router.push("/menu")}
              />
            </View>
          ) : (
            history.map(renderTx)
          )}
        </Card>
        {historyPage < historyPages && (
          <BrandButton
            title="Show more"
            variant="ghost"
            size="sm"
            loading={loadingMoreHistory}
            onPress={loadMoreHistory}
            style={{ marginTop: 8 }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16 },
  sectionGap: { marginTop: 28 },
  muted: { fontSize: 14, lineHeight: 20 },
  script: { fontFamily: FONTS.script, fontSize: 24, color: BRAND.orange, marginBottom: -2 },

  balanceCard: {
    backgroundColor: BRAND.purple,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  balanceLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  balancePoints: { fontSize: 48, fontWeight: "900", color: BRAND.gold, marginTop: 2 },
  balanceValue: { fontSize: 15, fontWeight: "600" },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BRAND.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierBadgeText: { color: BRAND.purpleDeep, fontWeight: "800", fontSize: 14 },
  progressWrap: { marginTop: 18 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  progressText: { fontSize: 13, flexShrink: 1 },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 5, backgroundColor: BRAND.gold },
  benefits: { marginTop: 18, gap: 8 },
  benefitsTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  benefitText: { fontSize: 14, flex: 1 },
  statsRow: { flexDirection: "row", marginTop: 18, paddingTop: 14, borderTopWidth: 1 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: BRAND.gold },
  statLabel: { fontSize: 12, marginTop: 2 },

  codeCard: { marginTop: 16, borderRadius: 18, borderWidth: 1.5, padding: 18, alignItems: "center" },
  codeTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,215,79,0.08)",
  },
  codeText: { fontSize: 20, fontWeight: "900", color: BRAND.gold, letterSpacing: 1.5 },
  codeNote: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 10 },
  codeActions: { flexDirection: "row", gap: 10, marginTop: 14, alignSelf: "stretch" },

  howRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  howIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  howText: { flex: 1, fontSize: 14, lineHeight: 20 },

  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  rewardValue: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardValueText: { fontSize: 20, fontWeight: "900" },
  rewardValueSub: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  rewardName: { fontSize: 16, fontWeight: "800" },
  rewardDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  miniTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  miniFill: { height: "100%", backgroundColor: BRAND.gold, borderRadius: 3 },

  referralText: { fontSize: 14, lineHeight: 20 },
  referralStats: { marginVertical: 12, alignItems: "center" },

  historyEmpty: { alignItems: "center", paddingVertical: 20 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txTitle: { fontSize: 14, fontWeight: "600" },
  txDate: { fontSize: 12, marginTop: 2 },
  txCode: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  txCodeText: { color: BRAND.orange, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  txPoints: { fontSize: 16, fontWeight: "800" },
});
