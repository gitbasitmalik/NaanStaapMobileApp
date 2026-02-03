import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeContext";
import { useLoyaltyStore } from "../store/loyaltyStore";
import { useAuthStore } from "../store/authStore";
import {
  AnimatedButton,
  FadeInView,
  SlideInView,
  ScaleInView,
} from "../components/AnimatedComponents";
import { EmptyState } from "../components/EmptyState";
import { lightHaptic, successHaptic } from "../utils/haptics";

const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";

export default function LoyaltyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuthStore();
  const {
    balance,
    history,
    rewards,
    referralInfo,
    isLoading,
    fetchBalance,
    fetchHistory,
    fetchRewards,
    fetchReferralInfo,
    redeemPoints,
  } = useLoyaltyStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "history" | "rewards"
  >("overview");

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchBalance(),
      fetchHistory(),
      fetchRewards(),
      fetchReferralInfo(),
    ]);
  }, [fetchBalance, fetchHistory, fetchRewards, fetchReferralInfo]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRedeemReward = async (reward: any) => {
    if (!reward.is_available) {
      Alert.alert(
        "Not Enough Points",
        `You need ${reward.points_required} points for this reward.`
      );
      return;
    }

    Alert.alert(
      "Redeem Reward",
      `Redeem ${reward.points_required} points for "${reward.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Redeem",
          onPress: async () => {
            const result = await redeemPoints(reward.points_required);
            if (result.success) {
              successHaptic();
              Alert.alert(
                "Success!",
                `You've redeemed ${
                  reward.name
                }. Discount of £${result.discount?.toFixed(
                  2
                )} will be applied to your next order.`
              );
            }
          },
        },
      ]
    );
  };

  const handleShareReferral = async () => {
    if (!referralInfo) return;

    try {
      await Share.share({
        message: referralInfo.share_message,
        title: "Join Naan Staap!",
      });
      successHaptic();
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const getTierInfo = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "gold":
        return {
          color: "#FFD700",
          icon: "trophy",
          perks: ["15% bonus points", "Free delivery", "Exclusive offers"],
        };
      case "silver":
        return {
          color: "#C0C0C0",
          icon: "medal",
          perks: ["10% bonus points", "Priority support", "Early access"],
        };
      default:
        return {
          color: "#CD7F32",
          icon: "ribbon",
          perks: ["10 points per £1", "Birthday bonus", "Special deals"],
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
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
          icon="gift-outline"
          title="Sign in to view rewards"
          message="Earn loyalty points with every order"
          actionLabel="Sign In"
          onAction={() => router.push("/auth/login")}
        />
      </View>
    );
  }

  const tierInfo = getTierInfo(balance?.tier || "Bronze");

  const renderTabs = () => (
    <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
      {(["overview", "history", "rewards"] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => {
            lightHaptic();
            setActiveTab(tab);
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textMuted },
              activeTab === tab && styles.tabTextActive,
            ]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverview = () => (
    <>
      {/* Points Card */}
      <ScaleInView
        delay={100}
        style={[styles.pointsCard, { backgroundColor: BRAND_PURPLE }]}
      >
        <View style={styles.pointsHeader}>
          <View style={[styles.tierBadge, { backgroundColor: tierInfo.color }]}>
            <Ionicons name={tierInfo.icon as any} size={16} color="#FFF" />
            <Text style={styles.tierBadgeText}>
              {balance?.tier || "Bronze"}
            </Text>
          </View>
        </View>

        <Text style={styles.pointsNumber}>
          {balance?.points?.toLocaleString() || 0}
        </Text>
        <Text style={styles.pointsLabel}>Total Points</Text>

        <View style={styles.pointsValue}>
          <Text style={styles.pointsValueText}>
            Worth £{((balance?.points || 0) / 100).toFixed(2)}
          </Text>
        </View>

        {/* Progress to next tier */}
        {balance?.next_tier && (
          <View style={styles.tierProgress}>
            <View style={styles.tierProgressHeader}>
              <Text style={styles.tierProgressLabel}>
                Progress to {balance.next_tier}
              </Text>
              <Text style={styles.tierProgressValue}>
                {Math.round((balance.tier_progress || 0) * 100)}%
              </Text>
            </View>
            <View style={styles.tierProgressBar}>
              <View
                style={[
                  styles.tierProgressFill,
                  { width: `${(balance.tier_progress || 0) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.tierProgressHint}>
              {balance.points_to_next_tier} more points to {balance.next_tier}
            </Text>
          </View>
        )}
      </ScaleInView>

      {/* Tier Perks */}
      <SlideInView direction="bottom" delay={200}>
        <View style={[styles.perksCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your {balance?.tier || "Bronze"} Perks
          </Text>
          {tierInfo.perks.map((perk, index) => (
            <View key={index} style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={20} color={BRAND_GOLD} />
              <Text style={[styles.perkText, { color: colors.textSecondary }]}>
                {perk}
              </Text>
            </View>
          ))}
        </View>
      </SlideInView>

      {/* Referral Card */}
      {referralInfo && (
        <SlideInView direction="bottom" delay={300}>
          <View
            style={[styles.referralCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.referralHeader}>
              <Ionicons name="people" size={28} color={BRAND_GOLD} />
              <View style={styles.referralHeaderText}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text, marginBottom: 2 },
                  ]}
                >
                  Refer Friends
                </Text>
                <Text
                  style={[styles.referralSubtitle, { color: colors.textMuted }]}
                >
                  Get {referralInfo.reward_per_referral} points per friend
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.referralCodeBox,
                { backgroundColor: colors.surfaceLight },
              ]}
            >
              <Text
                style={[styles.referralCodeLabel, { color: colors.textMuted }]}
              >
                Your Code
              </Text>
              <Text style={[styles.referralCode, { color: colors.text }]}>
                {referralInfo.referral_code}
              </Text>
            </View>

            <View style={styles.referralStats}>
              <View style={styles.referralStat}>
                <Text
                  style={[styles.referralStatNumber, { color: colors.text }]}
                >
                  {referralInfo.referral_count}
                </Text>
                <Text
                  style={[
                    styles.referralStatLabel,
                    { color: colors.textMuted },
                  ]}
                >
                  Referrals
                </Text>
              </View>
              <View style={styles.referralStat}>
                <Text
                  style={[styles.referralStatNumber, { color: BRAND_GOLD }]}
                >
                  {referralInfo.total_points_earned}
                </Text>
                <Text
                  style={[
                    styles.referralStatLabel,
                    { color: colors.textMuted },
                  ]}
                >
                  Points Earned
                </Text>
              </View>
            </View>

            <AnimatedButton
              style={styles.shareButton}
              onPress={handleShareReferral}
            >
              <Ionicons name="share-social" size={18} color="#FFF" />
              <Text style={styles.shareButtonText}>Share & Earn</Text>
            </AnimatedButton>
          </View>
        </SlideInView>
      )}

      {/* How to Earn */}
      <SlideInView direction="bottom" delay={400}>
        <View style={[styles.earnCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            How to Earn Points
          </Text>

          {[
            { icon: "cart", label: "Order food", value: "10 pts per £1" },
            { icon: "star", label: "Write a review", value: "25 pts" },
            { icon: "camera", label: "Review with photo", value: "50 pts" },
            { icon: "people", label: "Refer a friend", value: "500 pts" },
          ].map((item, index) => (
            <View
              key={index}
              style={[styles.earnItem, { borderColor: colors.border }]}
            >
              <View
                style={[
                  styles.earnIcon,
                  { backgroundColor: colors.surfaceLight },
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={BRAND_PURPLE}
                />
              </View>
              <Text style={[styles.earnLabel, { color: colors.text }]}>
                {item.label}
              </Text>
              <Text style={[styles.earnValue, { color: BRAND_GOLD }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </SlideInView>
    </>
  );

  const renderHistory = () => (
    <SlideInView direction="bottom" delay={100}>
      <View style={[styles.historyCard, { backgroundColor: colors.surface }]}>
        {history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="time-outline" size={48} color={colors.textMuted} />
            <Text
              style={[styles.emptyHistoryText, { color: colors.textMuted }]}
            >
              No transactions yet
            </Text>
          </View>
        ) : (
          history.map((transaction, index) => (
            <View
              key={transaction.id}
              style={[styles.historyItem, { borderColor: colors.border }]}
            >
              <View
                style={[
                  styles.historyIcon,
                  {
                    backgroundColor:
                      transaction.points > 0 ? "#D4EDDA" : "#F8D7DA",
                  },
                ]}
              >
                <Ionicons
                  name={transaction.points > 0 ? "add" : "remove"}
                  size={18}
                  color={transaction.points > 0 ? "#155724" : "#721C24"}
                />
              </View>
              <View style={styles.historyContent}>
                <Text
                  style={[styles.historyDescription, { color: colors.text }]}
                >
                  {transaction.description}
                </Text>
                <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                  {formatDate(transaction.created_at)}
                </Text>
              </View>
              <Text
                style={[
                  styles.historyPoints,
                  { color: transaction.points > 0 ? "#28A745" : "#E53935" },
                ]}
              >
                {transaction.points > 0 ? "+" : ""}
                {transaction.points}
              </Text>
            </View>
          ))
        )}
      </View>
    </SlideInView>
  );

  const renderRewards = () => (
    <SlideInView direction="bottom" delay={100}>
      <View style={styles.rewardsGrid}>
        {rewards.map((reward, index) => (
          <TouchableOpacity
            key={reward.id}
            style={[
              styles.rewardCard,
              { backgroundColor: colors.surface },
              !reward.is_available && styles.rewardCardDisabled,
            ]}
            onPress={() => handleRedeemReward(reward)}
            activeOpacity={reward.is_available ? 0.7 : 1}
          >
            <View
              style={[
                styles.rewardIcon,
                {
                  backgroundColor: reward.is_available
                    ? BRAND_GOLD
                    : colors.border,
                },
              ]}
            >
              <Ionicons
                name="gift"
                size={24}
                color={reward.is_available ? "#FFF" : colors.textMuted}
              />
            </View>
            <Text style={[styles.rewardName, { color: colors.text }]}>
              {reward.name}
            </Text>
            <Text
              style={[styles.rewardDescription, { color: colors.textMuted }]}
              numberOfLines={2}
            >
              {reward.description}
            </Text>
            <View
              style={[
                styles.rewardPoints,
                {
                  backgroundColor: reward.is_available
                    ? BRAND_PURPLE
                    : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.rewardPointsText,
                  { color: reward.is_available ? "#FFF" : colors.textMuted },
                ]}
              >
                {reward.points_required} pts
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SlideInView>
  );

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
          Loyalty Rewards
        </Text>
        <View style={styles.placeholder} />
      </FadeInView>

      {renderTabs()}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND_GOLD}
          />
        }
      >
        {isLoading && !balance ? (
          <ActivityIndicator
            size="large"
            color={BRAND_GOLD}
            style={styles.loader}
          />
        ) : (
          <>
            {activeTab === "overview" && renderOverview()}
            {activeTab === "history" && renderHistory()}
            {activeTab === "rewards" && renderRewards()}
          </>
        )}
      </ScrollView>
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
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: BRAND_PURPLE,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#FFF",
  },
  content: {
    paddingHorizontal: 16,
  },
  loader: {
    marginTop: 40,
  },
  pointsCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  pointsHeader: {
    marginBottom: 16,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tierBadgeText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  pointsNumber: {
    color: "#FFF",
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 4,
  },
  pointsLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    marginBottom: 12,
  },
  pointsValue: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  pointsValueText: {
    color: BRAND_GOLD,
    fontSize: 16,
    fontWeight: "600",
  },
  tierProgress: {
    width: "100%",
  },
  tierProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tierProgressLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  tierProgressValue: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  tierProgressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  tierProgressFill: {
    height: "100%",
    backgroundColor: BRAND_GOLD,
    borderRadius: 4,
  },
  tierProgressHint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
  },
  perksCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  perkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  perkText: {
    fontSize: 14,
  },
  referralCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  referralHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  referralHeaderText: {
    flex: 1,
  },
  referralSubtitle: {
    fontSize: 13,
  },
  referralCodeBox: {
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  referralCodeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 3,
  },
  referralStats: {
    flexDirection: "row",
    marginBottom: 16,
  },
  referralStat: {
    flex: 1,
    alignItems: "center",
  },
  referralStatNumber: {
    fontSize: 24,
    fontWeight: "bold",
  },
  referralStatLabel: {
    fontSize: 12,
  },
  shareButton: {
    backgroundColor: BRAND_PURPLE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  shareButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  earnCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  earnItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  earnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  earnLabel: {
    flex: 1,
    fontSize: 14,
  },
  earnValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  historyCard: {
    borderRadius: 12,
    padding: 16,
  },
  emptyHistory: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyHistoryText: {
    fontSize: 14,
    marginTop: 12,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyDescription: {
    fontSize: 14,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
  },
  historyPoints: {
    fontSize: 16,
    fontWeight: "bold",
  },
  rewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  rewardCard: {
    width: "48%",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  rewardCardDisabled: {
    opacity: 0.6,
  },
  rewardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  rewardName: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 16,
  },
  rewardPoints: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardPointsText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});
