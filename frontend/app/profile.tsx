import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { useLoyaltyStore } from "../store/loyaltyStore";
import { useOrdersStore } from "../store/ordersStore";
import {
  AnimatedButton,
  FadeInView,
  SlideInView,
} from "../components/AnimatedComponents";
import { lightHaptic, successHaptic } from "../utils/haptics";

const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const {
    user,
    isAuthenticated,
    logout,
    isLoading: authLoading,
  } = useAuthStore();
  const { balance, referralInfo, fetchBalance, fetchReferralInfo } =
    useLoyaltyStore();
  const { summary, fetchOrders } = useOrdersStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchBalance(),
      fetchReferralInfo(),
      fetchOrders({ page: 1 }),
    ]);
  }, [fetchBalance, fetchReferralInfo, fetchOrders]);

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

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);
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

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "gold":
        return "#FFD700";
      case "silver":
        return "#C0C0C0";
      default:
        return "#CD7F32";
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "gold":
        return "trophy";
      case "silver":
        return "medal";
      default:
        return "ribbon";
    }
  };

  if (!isAuthenticated) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <View style={styles.notAuthContainer}>
          <View style={styles.notAuthIcon}>
            <Ionicons
              name="person-circle-outline"
              size={100}
              color={colors.textMuted}
            />
          </View>
          <Text style={[styles.notAuthTitle, { color: colors.text }]}>
            Sign in to your account
          </Text>
          <Text style={[styles.notAuthSubtitle, { color: colors.textMuted }]}>
            Access your orders, loyalty points, and exclusive offers
          </Text>
          <AnimatedButton
            style={styles.signInButton}
            onPress={() => {
              lightHaptic();
              router.push("/auth/login");
            }}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </AnimatedButton>
          <TouchableOpacity
            style={styles.createAccountLink}
            onPress={() => {
              lightHaptic();
              router.push("/auth/register");
            }}
          >
            <Text style={[styles.createAccountText, { color: BRAND_GOLD }]}>
              Create an account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 20,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={BRAND_GOLD}
        />
      }
    >
      {/* Header */}
      <FadeInView style={styles.header}>
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
          My Profile
        </Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {
            lightHaptic();
            // Navigate to settings
          }}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </FadeInView>

      {/* Profile Card */}
      <SlideInView direction="bottom" delay={100} style={styles.profileCard}>
        <View
          style={[styles.profileCardInner, { backgroundColor: colors.surface }]}
        >
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: BRAND_PURPLE }]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View
              style={[
                styles.tierBadge,
                { backgroundColor: getTierColor(balance?.tier || "Bronze") },
              ]}
            >
              <Ionicons
                name={getTierIcon(balance?.tier || "Bronze") as any}
                size={12}
                color="#FFF"
              />
            </View>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.name}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>
            {user?.email}
          </Text>

          <View style={styles.tierContainer}>
            <Text
              style={[
                styles.tierText,
                { color: getTierColor(balance?.tier || "Bronze") },
              ]}
            >
              {balance?.tier || "Bronze"} Member
            </Text>
          </View>
        </View>
      </SlideInView>

      {/* Loyalty Points */}
      <SlideInView direction="bottom" delay={200}>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Loyalty Points
            </Text>
            <TouchableOpacity
              onPress={() => {
                lightHaptic();
                router.push("/loyalty");
              }}
            >
              <Text style={[styles.seeAllText, { color: BRAND_GOLD }]}>
                See all
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pointsCard}>
            <View style={[styles.pointsCircle, { borderColor: BRAND_GOLD }]}>
              <Text style={[styles.pointsNumber, { color: BRAND_GOLD }]}>
                {balance?.points?.toLocaleString() || 0}
              </Text>
              <Text style={[styles.pointsLabel, { color: colors.textMuted }]}>
                Points
              </Text>
            </View>

            <View style={styles.pointsInfo}>
              <View style={styles.pointsRow}>
                <Text
                  style={[styles.pointsInfoLabel, { color: colors.textMuted }]}
                >
                  Value
                </Text>
                <Text style={[styles.pointsInfoValue, { color: colors.text }]}>
                  £{((balance?.points || 0) / 100).toFixed(2)}
                </Text>
              </View>
              {balance?.next_tier && (
                <View style={styles.pointsRow}>
                  <Text
                    style={[
                      styles.pointsInfoLabel,
                      { color: colors.textMuted },
                    ]}
                  >
                    To {balance.next_tier}
                  </Text>
                  <Text
                    style={[styles.pointsInfoValue, { color: colors.text }]}
                  >
                    {balance.points_to_next_tier} pts
                  </Text>
                </View>
              )}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(balance?.tier_progress || 0) * 100}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </SlideInView>

      {/* Quick Stats */}
      <SlideInView direction="bottom" delay={300}>
        <View
          style={[styles.statsContainer, { backgroundColor: colors.surface }]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {summary?.total_orders || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Orders
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              £{(summary?.total_spent || 0).toFixed(0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Spent
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {referralInfo?.referral_count || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Referrals
            </Text>
          </View>
        </View>
      </SlideInView>

      {/* Referral Card */}
      {referralInfo && (
        <SlideInView direction="bottom" delay={400}>
          <View
            style={[styles.referralCard, { backgroundColor: BRAND_PURPLE }]}
          >
            <View style={styles.referralContent}>
              <Ionicons name="gift" size={32} color={BRAND_GOLD} />
              <View style={styles.referralText}>
                <Text style={styles.referralTitle}>Refer & Earn</Text>
                <Text style={styles.referralSubtitle}>
                  Get {referralInfo.reward_per_referral} points for each friend
                </Text>
              </View>
            </View>
            <View style={styles.referralCodeContainer}>
              <Text style={styles.referralCodeLabel}>Your code:</Text>
              <Text style={styles.referralCode}>
                {referralInfo.referral_code}
              </Text>
            </View>
            <AnimatedButton
              style={styles.shareButton}
              onPress={handleShareReferral}
            >
              <Ionicons name="share-social" size={18} color={BRAND_PURPLE} />
              <Text style={styles.shareButtonText}>Share</Text>
            </AnimatedButton>
          </View>
        </SlideInView>
      )}

      {/* Menu Options */}
      <SlideInView direction="bottom" delay={500}>
        <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
          <MenuItem
            icon="receipt-outline"
            label="Order History"
            onPress={() => {
              lightHaptic();
              router.push("/orders");
            }}
            colors={colors}
          />
          <MenuItem
            icon="location-outline"
            label="Saved Addresses"
            onPress={() => {
              lightHaptic();
              Alert.alert(
                "Coming Soon",
                "Saved addresses feature is coming soon!"
              );
            }}
            colors={colors}
          />
          <MenuItem
            icon="heart-outline"
            label="Favorites"
            onPress={() => {
              lightHaptic();
              Alert.alert("Coming Soon", "Favorites feature is coming soon!");
            }}
            colors={colors}
          />
          <MenuItem
            icon="star-outline"
            label="My Reviews"
            onPress={() => {
              lightHaptic();
              Alert.alert("Coming Soon", "Reviews feature is coming soon!");
            }}
            colors={colors}
          />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => {
              lightHaptic();
              Alert.alert("Coming Soon", "Notifications settings coming soon!");
            }}
            colors={colors}
          />
          <MenuItem
            icon={isDark ? "sunny-outline" : "moon-outline"}
            label={isDark ? "Light Mode" : "Dark Mode"}
            onPress={() => {
              lightHaptic();
              toggleTheme();
            }}
            colors={colors}
            showChevron={false}
          />
        </View>
      </SlideInView>

      {/* Account Actions */}
      <SlideInView direction="bottom" delay={600}>
        <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            onPress={() => {
              lightHaptic();
              Alert.alert(
                "Coming Soon",
                "Edit profile feature is coming soon!"
              );
            }}
            colors={colors}
          />
          <MenuItem
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => {
              lightHaptic();
              Alert.alert(
                "Coming Soon",
                "Password change feature will be available soon."
              );
            }}
            colors={colors}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Privacy & Security"
            onPress={() => lightHaptic()}
            colors={colors}
          />
        </View>
      </SlideInView>

      {/* Logout */}
      <SlideInView direction="bottom" delay={700} style={styles.logoutSection}>
        <AnimatedButton
          style={[styles.logoutButton, { borderColor: "#E53935" }]}
          onPress={handleLogout}
        >
          {authLoading ? (
            <ActivityIndicator color="#E53935" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#E53935" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </>
          )}
        </AnimatedButton>
      </SlideInView>

      {/* App Version */}
      <Text style={[styles.versionText, { color: colors.textMuted }]}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
}

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  colors: any;
  showChevron?: boolean;
}

const MenuItem = ({
  icon,
  label,
  onPress,
  colors,
  showChevron = true,
}: MenuItemProps) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemLeft}>
      <Ionicons name={icon as any} size={22} color={colors.textSecondary} />
      <Text style={[styles.menuItemLabel, { color: colors.text }]}>
        {label}
      </Text>
    </View>
    {showChevron && (
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  settingsButton: {
    padding: 8,
  },
  notAuthContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  notAuthIcon: {
    marginBottom: 24,
  },
  notAuthTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  notAuthSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  signInButton: {
    backgroundColor: BRAND_PURPLE,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
  },
  signInButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  createAccountLink: {
    padding: 8,
  },
  createAccountText: {
    fontSize: 15,
    fontWeight: "600",
  },
  profileCard: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  profileCardInner: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "bold",
  },
  tierBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  tierContainer: {
    marginTop: 4,
  },
  tierText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pointsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  pointsCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  pointsNumber: {
    fontSize: 24,
    fontWeight: "bold",
  },
  pointsLabel: {
    fontSize: 12,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pointsInfoLabel: {
    fontSize: 13,
  },
  pointsInfoValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: BRAND_GOLD,
    borderRadius: 3,
  },
  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: "100%",
  },
  referralCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  referralContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  referralText: {
    flex: 1,
  },
  referralTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  referralSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  referralCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  referralCodeLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  referralCode: {
    color: BRAND_GOLD,
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  shareButton: {
    backgroundColor: BRAND_GOLD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  shareButtonText: {
    color: BRAND_PURPLE,
    fontSize: 14,
    fontWeight: "bold",
  },
  menuSection: {
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 15,
  },
  logoutSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  logoutText: {
    color: "#E53935",
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 20,
  },
});
