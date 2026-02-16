import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeContext";
import { useDealsStore } from "../store/dealsStore";
import { Deal } from "../services/api";
import {
  AnimatedButton,
  FadeInView,
  SlideInView,
} from "../components/AnimatedComponents";
import { EmptyState } from "../components/EmptyState";
import { lightHaptic, successHaptic } from "../utils/haptics";
import * as Clipboard from "expo-clipboard";

const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { deals, isLoading, error, fetchDeals, clearError } = useDealsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadDeals = useCallback(async () => {
    await fetchDeals();
  }, [fetchDeals]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
      clearError();
    }
  }, [error, clearError]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeals();
    setRefreshing(false);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedCode(code);
      successHaptic();
      setTimeout(() => setCopiedCode(null), 3000);
    } catch {
      Alert.alert("Error", "Failed to copy code");
    }
  };

  const handleShareDeal = async (deal: Deal) => {
    try {
      await Share.share({
        message: `🎉 Check out this deal at Naan Staap!\n\n${deal.title}\n${
          deal.description
        }\n\n${deal.code ? `Use code: ${deal.code}` : ""}`,
        title: deal.title,
      });
      successHaptic();
    } catch (e) {
      console.error("Error sharing:", e);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isExpiringSoon = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const daysLeft = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysLeft <= 3 && daysLeft > 0;
  };

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  if (isLoading && deals.length === 0) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={BRAND_GOLD} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading deals...
        </Text>
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
      {/* Header */}
      <View style={styles.header}>
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
          Deals & Offers
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND_GOLD}
          />
        }
      >
        {/* Featured Banner */}
        <FadeInView>
          <View
            style={[styles.featuredBanner, { backgroundColor: BRAND_PURPLE }]}
          >
            <View style={styles.bannerContent}>
              <Text style={styles.bannerEmoji}>🎉</Text>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>Exclusive Deals</Text>
                <Text style={styles.bannerSubtitle}>
                  Save big on your favorite items
                </Text>
              </View>
            </View>
            <View style={styles.bannerDecoration}>
              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
            </View>
          </View>
        </FadeInView>

        {deals.length === 0 ? (
          <EmptyState
            icon="pricetag-outline"
            title="No deals available"
            message="Check back soon for new offers!"
          />
        ) : (
          deals.map((deal, index) => {
            const expired = isExpired(deal.valid_until);
            const expiringSoon = isExpiringSoon(deal.valid_until);

            return (
              <SlideInView key={deal.id} delay={index * 100}>
                <View
                  style={[
                    styles.dealCard,
                    { backgroundColor: colors.card },
                    expired && styles.expiredCard,
                  ]}
                >
                  {/* Deal Image */}
                  {deal.image_url && (
                    <Image
                      source={{ uri: deal.image_url }}
                      style={styles.dealImage}
                      resizeMode="cover"
                    />
                  )}

                  {/* Discount Badge */}
                  <View style={styles.discountBadge}>
                    {deal.discount_percentage ? (
                      <Text style={styles.discountText}>
                        {deal.discount_percentage}% OFF
                      </Text>
                    ) : deal.discount_amount ? (
                      <Text style={styles.discountText}>
                        £{deal.discount_amount} OFF
                      </Text>
                    ) : (
                      <Text style={styles.discountText}>SPECIAL</Text>
                    )}
                  </View>

                  {/* Expiring Soon Badge */}
                  {expiringSoon && !expired && (
                    <View style={styles.expiringSoonBadge}>
                      <Ionicons name="time-outline" size={12} color="#fff" />
                      <Text style={styles.expiringSoonText}>Ending Soon!</Text>
                    </View>
                  )}

                  {/* Deal Content */}
                  <View style={styles.dealContent}>
                    <Text
                      style={[
                        styles.dealTitle,
                        { color: colors.text },
                        expired && styles.expiredText,
                      ]}
                    >
                      {deal.title}
                    </Text>
                    <Text
                      style={[
                        styles.dealDescription,
                        { color: colors.textMuted },
                      ]}
                    >
                      {deal.description}
                    </Text>

                    {/* Validity */}
                    <View style={styles.validityContainer}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={expired ? "#E74C3C" : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.validityText,
                          { color: expired ? "#E74C3C" : colors.textMuted },
                        ]}
                      >
                        {expired
                          ? "Expired"
                          : `Valid until ${formatDate(deal.valid_until)}`}
                      </Text>
                    </View>

                    {/* Promo Code */}
                    {deal.code && !expired && (
                      <View style={styles.codeContainer}>
                        <View
                          style={[
                            styles.codeBox,
                            { backgroundColor: colors.background },
                          ]}
                        >
                          <Text
                            style={[styles.codeText, { color: BRAND_PURPLE }]}
                          >
                            {deal.code}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.copyButton,
                            copiedCode === deal.code && styles.copiedButton,
                          ]}
                          onPress={() => handleCopyCode(deal.code!)}
                        >
                          <Ionicons
                            name={
                              copiedCode === deal.code
                                ? "checkmark"
                                : "copy-outline"
                            }
                            size={18}
                            color="#fff"
                          />
                          <Text style={styles.copyButtonText}>
                            {copiedCode === deal.code ? "Copied!" : "Copy"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Action Buttons */}
                    {!expired && (
                      <View style={styles.actionRow}>
                        <AnimatedButton
                          style={styles.orderButton}
                          onPress={() => {
                            lightHaptic();
                            router.push("/(tabs)/menu");
                          }}
                        >
                          <Text style={styles.orderButtonText}>Order Now</Text>
                          <Ionicons
                            name="arrow-forward"
                            size={18}
                            color="#fff"
                          />
                        </AnimatedButton>
                        <TouchableOpacity
                          style={[
                            styles.shareButton,
                            { borderColor: colors.border },
                          ]}
                          onPress={() => handleShareDeal(deal)}
                        >
                          <Ionicons
                            name="share-social-outline"
                            size={20}
                            color={colors.text}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </SlideInView>
            );
          })
        )}

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.textMuted}
          />
          <Text style={[styles.termsText, { color: colors.textMuted }]}>
            Deals cannot be combined with other offers. Terms and conditions
            apply.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
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
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  // Featured Banner
  featuredBanner: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    zIndex: 1,
  },
  bannerEmoji: {
    fontSize: 48,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  bannerDecoration: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 150,
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  decorCircle1: {
    width: 120,
    height: 120,
    right: -30,
    top: -30,
  },
  decorCircle2: {
    width: 80,
    height: 80,
    right: 20,
    bottom: -20,
  },
  // Deal Card
  dealCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expiredCard: {
    opacity: 0.6,
  },
  dealImage: {
    width: "100%",
    height: 160,
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: BRAND_GOLD,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  expiringSoonBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#E74C3C",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expiringSoonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 11,
  },
  dealContent: {
    padding: 16,
  },
  dealTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  expiredText: {
    textDecorationLine: "line-through",
  },
  dealDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  validityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  validityText: {
    fontSize: 13,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  codeBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: BRAND_PURPLE,
    alignItems: "center",
  },
  codeText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: BRAND_PURPLE,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  copiedButton: {
    backgroundColor: "#27AE60",
  },
  copyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orderButton: {
    flex: 1,
    backgroundColor: BRAND_PURPLE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  orderButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
