import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useTheme, BRAND } from "../theme/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { useLoyaltyStore } from "../store/loyaltyStore";
import { useOrdersStore } from "../store/ordersStore";
import { useFavoritesStore } from "../store/favoritesStore";
import { FadeInView, SlideInView } from "../components/AnimatedComponents";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import {
  BrandButton,
  Card,
  ListRow,
  ScreenHeader,
  SectionHeading,
  formatPrice,
} from "../components/ui";
import { lightHaptic, successHaptic } from "../utils/haptics";

type IconName = keyof typeof Ionicons.glyphMap;

const tierStyle = (tier: string): { color: string; icon: IconName } => {
  switch (tier.toLowerCase()) {
    case "gold":
      return { color: BRAND.gold, icon: "trophy" };
    case "silver":
      return { color: "rgba(255,255,255,0.85)", icon: "medal" };
    default:
      return { color: BRAND.orange, icon: "ribbon" };
  }
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user, isAuthenticated, logout, refreshUserData } = useAuthStore();
  const { balance, referralInfo, fetchBalance, fetchReferralInfo } = useLoyaltyStore();
  const { summary, fetchOrders } = useOrdersStore();
  const favouriteCount = useFavoritesStore((s) => s.favorites.length);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([fetchBalance(), fetchReferralInfo(), fetchOrders({ page: 1 }), refreshUserData()]);
  }, [fetchBalance, fetchReferralInfo, fetchOrders, refreshUserData]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    const err = useLoyaltyStore.getState().error || useOrdersStore.getState().error;
    if (err) showToast({ message: err, type: "error" });
  };

  const go = (path: Parameters<typeof router.push>[0]) => {
    lightHaptic();
    router.push(path);
  };

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await logout();
          setSigningOut(false);
          showToast({ message: "You've been signed out", type: "info" });
          router.replace("/");
        },
      },
    ]);
  };

  const handleShareReferral = async () => {
    if (!referralInfo) return;
    try {
      const result = await Share.share({
        message: referralInfo.share_message,
        title: "Join Naan Staap",
      });
      if (result.action === Share.sharedAction) successHaptic();
    } catch {
      showToast({ message: "Couldn't open the share sheet", type: "error" });
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="My account" />
        <EmptyState
          icon="person-circle-outline"
          title="Sign in to your account"
          message="See your orders, loyalty points, saved addresses and member offers."
          actionLabel="Sign in"
          onAction={() => go("/auth/login")}
        />
        <View style={[styles.guestLinks, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity onPress={() => go("/auth/register")} hitSlop={8}>
            <Text style={styles.goldLink}>Create an account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => go("/favorites")} hitSlop={8} style={{ marginTop: 14 }}>
            <Text style={[styles.mutedLink, { color: colors.textSecondary }]}>
              View my favourites{favouriteCount ? ` (${favouriteCount})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tierName = balance?.tier || user?.tier || "Bronze";
  const tier = tierStyle(tierName);
  const points = balance?.points ?? user?.loyalty_points ?? 0;
  const pointsValue = balance?.redeemable_value ?? Math.floor(points) / 100;
  const tierProgress = Math.max(0, Math.min(1, balance?.tier_progress ?? 0));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="My account" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.gold} />
        }
      >
        {/* Profile */}
        <FadeInView>
          <Card style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: BRAND.orange }]}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || "N"}</Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: tier.color, borderColor: colors.surface }]}>
                <Ionicons name={tier.icon} size={12} color={BRAND.purpleDeep} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {user?.name}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                {user?.email}
              </Text>
              <Text style={[styles.tierText, { color: tier.color }]}>{tierName} member</Text>
            </View>
            <TouchableOpacity
              onPress={() => go("/edit-profile")}
              hitSlop={10}
              accessibilityLabel="Edit profile"
              style={styles.editBtn}
            >
              <Ionicons name="create-outline" size={20} color={BRAND.gold} />
            </TouchableOpacity>
          </Card>
        </FadeInView>

        {/* Loyalty */}
        <SlideInView direction="bottom" delay={80}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => go("/loyalty")}>
            <Card style={styles.loyaltyCard}>
              <View style={styles.loyaltyTop}>
                <View>
                  <Text style={[styles.cardKicker, { color: colors.textMuted }]}>Loyalty points</Text>
                  <Text style={styles.pointsNumber}>{points.toLocaleString()}</Text>
                  <Text style={[styles.pointsValue, { color: colors.textSecondary }]}>
                    Worth {formatPrice(pointsValue)}
                  </Text>
                </View>
                <View style={styles.loyaltyCta}>
                  <Text style={styles.loyaltyCtaText}>View rewards</Text>
                  <Ionicons name="chevron-forward" size={16} color={BRAND.gold} />
                </View>
              </View>
              {balance?.next_tier ? (
                <>
                  <View style={[styles.progressTrack, { backgroundColor: colors.surfaceLight }]}>
                    <View style={[styles.progressFill, { width: `${tierProgress * 100}%` }]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.textMuted }]}>
                    Spend {formatPrice(balance.spend_to_next_tier)} more to reach {balance.next_tier}
                  </Text>
                </>
              ) : balance ? (
                <Text style={[styles.progressText, { color: colors.textMuted }]}>
                  You’re at our top tier. Thank you for being a regular!
                </Text>
              ) : null}
            </Card>
          </TouchableOpacity>
        </SlideInView>

        {/* Stats */}
        <SlideInView direction="bottom" delay={140}>
          <Card style={styles.stats}>
            <Stat value={String(summary?.total_orders ?? user?.total_orders ?? 0)} label="Orders" />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <Stat value={formatPrice(summary?.total_spent ?? user?.total_spent ?? 0)} label="Spent" />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <Stat value={String(referralInfo?.referral_count ?? 0)} label="Referrals" />
          </Card>
        </SlideInView>

        {/* Referral */}
        {referralInfo ? (
          <SlideInView direction="bottom" delay={200}>
            <View style={styles.referralCard}>
              <View style={styles.referralHead}>
                <Ionicons name="gift" size={30} color={BRAND.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.referralTitle}>Refer a friend</Text>
                  <Text style={styles.referralSubtitle}>
                    You get {referralInfo.reward_per_referral} points, they get {referralInfo.referee_bonus}.
                  </Text>
                </View>
              </View>
              <View style={styles.codeRow}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>Your code</Text>
                  <Text style={styles.code} selectable>
                    {referralInfo.referral_code}
                  </Text>
                </View>
                <BrandButton
                  title="Share"
                  icon="share-social"
                  variant="gold"
                  size="sm"
                  onPress={handleShareReferral}
                />
              </View>
            </View>
          </SlideInView>
        ) : null}

        {/* Activity */}
        <SlideInView direction="bottom" delay={260}>
          <SectionHeading title="Your activity" style={styles.sectionHeading} />
          <Card style={styles.listCard}>
            <ListRow icon="receipt-outline" label="Order history" onPress={() => go("/orders")} />
            <ListRow icon="location-outline" label="Saved addresses" onPress={() => go("/addresses")} />
            <ListRow
              icon="heart-outline"
              label="Favourites"
              subtitle={favouriteCount ? `${favouriteCount} saved` : undefined}
              onPress={() => go("/favorites")}
            />
            <ListRow icon="star-outline" label="My reviews" onPress={() => go("/my-reviews")} />
            <ListRow icon="calendar-outline" label="My bookings" onPress={() => go("/bookings")} />
          </Card>
        </SlideInView>

        {/* Settings */}
        <SlideInView direction="bottom" delay={320}>
          <SectionHeading title="Settings" style={styles.sectionHeading} />
          <Card style={styles.listCard}>
            <ListRow icon="person-outline" label="Edit profile" onPress={() => go("/edit-profile")} />
            <ListRow icon="lock-closed-outline" label="Change password" onPress={() => go("/change-password")} />
            <ListRow
              icon="notifications-outline"
              label="Notifications & preferences"
              subtitle="Alerts, dietary needs and allergens"
              onPress={() => go("/notifications")}
            />
            <ListRow
              icon="shield-checkmark-outline"
              label="Privacy & account"
              onPress={() => go("/account-privacy")}
            />
          </Card>
        </SlideInView>

        <SlideInView direction="bottom" delay={380}>
          <BrandButton
            title="Sign out"
            icon="log-out-outline"
            variant="outline"
            onPress={handleLogout}
            loading={signingOut}
            style={styles.signOut}
          />
          <Text style={[styles.version, { color: colors.textMuted }]}>
            Naan Staap · version {Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
        </SlideInView>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.secondary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  guestLinks: { alignItems: "center" },
  goldLink: { color: BRAND.gold, fontSize: 15, fontWeight: "700" },
  mutedLink: { fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 },
  avatarWrap: { position: "relative" },
  avatar: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
  tierBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: { fontSize: 19, fontWeight: "800" },
  userEmail: { fontSize: 13, marginTop: 2 },
  tierText: { fontSize: 13, fontWeight: "700", marginTop: 6 },
  editBtn: { padding: 8, borderRadius: 12, backgroundColor: "rgba(255,215,79,0.12)" },
  loyaltyCard: { marginTop: 14, padding: 18 },
  loyaltyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardKicker: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  pointsNumber: { color: BRAND.gold, fontSize: 36, fontWeight: "800", marginTop: 4 },
  pointsValue: { fontSize: 13, marginTop: 2 },
  loyaltyCta: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 4 },
  loyaltyCtaText: { color: BRAND.gold, fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 16 },
  progressFill: { height: "100%", backgroundColor: BRAND.gold, borderRadius: 4 },
  progressText: { fontSize: 12, marginTop: 6 },
  stats: { flexDirection: "row", marginTop: 14, paddingVertical: 18 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, marginVertical: 4 },
  referralCard: { marginTop: 14, borderRadius: 18, padding: 18, backgroundColor: BRAND.orange },
  referralHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  referralTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  referralSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 2 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
  codeBox: {
    flex: 1,
    backgroundColor: "rgba(58,38,64,0.35)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  codeLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600" },
  code: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", letterSpacing: 1.5 },
  sectionHeading: { marginTop: 24, marginBottom: 10 },
  listCard: { paddingVertical: 2 },
  signOut: { marginTop: 28 },
  version: { textAlign: "center", fontSize: 12, marginTop: 16 },
});
