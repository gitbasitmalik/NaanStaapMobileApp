import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  Dimensions,
  Linking,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, BRAND, FONTS } from "../../theme/ThemeContext";
import { FadeInView, SlideInView, AnimatedButton } from "../../components/AnimatedComponents";
import { HomeScreenSkeleton } from "../../components/Skeleton";
import { BrandButton, Logo, SectionHeading, formatPrice } from "../../components/ui";
import { menuAPI, dealsAPI, MenuItem, Deal } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { SITE } from "../../data/siteContent";
import { lightHaptic } from "../../utils/haptics";

const { width } = Dimensions.get("window");

type IconName = keyof typeof Ionicons.glyphMap;

const QUICK_ACTIONS: { icon: IconName; label: string; route: string }[] = [
  { icon: "calendar-outline", label: "Book a table", route: "/book-table" },
  { icon: "gift-outline", label: "Rewards", route: "/loyalty" },
  { icon: "receipt-outline", label: "My orders", route: "/orders" },
  { icon: "restaurant-outline", label: "Catering", route: "/info/catering" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { user, isAuthenticated } = useAuthStore();
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [popularRes, dealsRes] = await Promise.all([
        menuAPI.getPopularItems(),
        dealsAPI.getAll(),
      ]);
      setPopularItems(popularRes.data);
      setDeals(dealsRes.data);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const go = (route: any) => {
    lightHaptic();
    router.push(route);
  };

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <HomeScreenSkeleton />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }}
          tintColor={BRAND.gold}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Logo width={118} />
        <TouchableOpacity
          style={styles.headerAccount}
          onPress={() => go(isAuthenticated ? "/profile" : "/auth/login")}
          accessibilityLabel={isAuthenticated ? "My account" : "Sign in"}
        >
          <Ionicons
            name={isAuthenticated ? "person-circle" : "person-circle-outline"}
            size={34}
            color={BRAND.gold}
          />
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <FadeInView style={styles.heroWrap}>
        <ImageBackground source={{ uri: SITE.heroImage }} style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroOverlay}>
            <Text style={styles.heroScript}>
              {isAuthenticated && user?.name ? `Hey ${user.name.split(" ")[0]}!` : "Welcome!"}
            </Text>
            <Text style={styles.heroTitle}>Flavours of{"\n"}South Asia</Text>
            <Text style={styles.heroText}>{SITE.tagline}</Text>
            <View style={styles.heroButtons}>
              <BrandButton title="Order now" icon="bag-handle" onPress={() => go("/menu")} style={styles.heroBtn} />
              <BrandButton
                title="Find a store"
                variant="outline"
                icon="location"
                onPress={() => go("/stores")}
                style={styles.heroBtn}
              />
            </View>
          </View>
        </ImageBackground>
      </FadeInView>

      {failed && (
        <TouchableOpacity
          style={[styles.offline, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            setLoading(true);
            fetchData();
          }}
        >
          <Ionicons name="cloud-offline-outline" size={20} color={BRAND.gold} />
          <Text style={[styles.offlineText, { color: colors.textSecondary }]}>
            Couldn&apos;t load the latest menu. Tap to retry.
          </Text>
        </TouchableOpacity>
      )}

      {/* Chai / Naan / Street */}
      <View style={styles.section}>
        <SectionHeading script="Taste the vibe" title="What we do" />
        <View style={styles.tiles}>
          {SITE.featureTiles.map((tile, index) => (
            <SlideInView key={tile.title} direction="bottom" delay={index * 90} style={styles.tileWrap}>
              <AnimatedButton style={styles.tile} onPress={() => go(tile.route)}>
                <Image
                  source={{ uri: tile.image }}
                  style={styles.tileImage}
                  accessibilityLabel={tile.title}
                />
              </AnimatedButton>
            </SlideInView>
          ))}
        </View>
      </View>

      {/* Quick actions */}
      <View style={[styles.quickActions, { backgroundColor: colors.surface }]}>
        {QUICK_ACTIONS.map((action) => (
          <AnimatedButton key={action.label} style={styles.quickAction} onPress={() => go(action.route)}>
            <View style={styles.quickIcon}>
              <Ionicons name={action.icon} size={22} color={BRAND.gold} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>{action.label}</Text>
          </AnimatedButton>
        ))}
      </View>

      {/* Deals */}
      {deals.length > 0 && (
        <View style={styles.section}>
          <SectionHeading
            script="Don't miss out"
            title="Deals & offers"
            action="See all"
            onAction={() => go("/deals")}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {deals.map((deal) => (
              <AnimatedButton key={deal.id} style={styles.dealCard} onPress={() => go("/deals")}>
                <Image source={{ uri: deal.image_url }} style={StyleSheet.absoluteFill} />
                <View style={styles.dealOverlay}>
                  {deal.discount_percentage || deal.discount_amount ? (
                    <View style={styles.dealBadge}>
                      <Text style={styles.dealBadgeText}>
                        {deal.discount_percentage
                          ? `${deal.discount_percentage}% OFF`
                          : `${formatPrice(deal.discount_amount)} OFF`}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.dealTitle}>{deal.title}</Text>
                  <Text style={styles.dealText} numberOfLines={2}>
                    {deal.description}
                  </Text>
                  {deal.code && (
                    <Text style={styles.dealCode}>
                      Code <Text style={styles.dealCodeValue}>{deal.code}</Text>
                    </Text>
                  )}
                </View>
              </AnimatedButton>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Popular */}
      {popularItems.length > 0 && (
        <View style={styles.section}>
          <SectionHeading
            script="Fan favourites"
            title="Popular right now"
            action="Full menu"
            onAction={() => go("/menu")}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {popularItems.slice(0, 8).map((item) => (
              <AnimatedButton
                key={item.id}
                style={[styles.popularCard, { backgroundColor: colors.surface }]}
                onPress={() => go({ pathname: "/menu", params: { item: item.id } })}
              >
                <Image source={{ uri: item.image_url }} style={styles.popularImage} />
                {item.is_vegetarian && (
                  <View style={styles.vegBadge}>
                    <Ionicons name="leaf" size={12} color={BRAND.purpleDeep} />
                  </View>
                )}
                <View style={styles.popularBody}>
                  <Text style={[styles.popularName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.popularDesc, { color: colors.textMuted }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                  {item.price != null && <Text style={styles.popularPrice}>{formatPrice(item.price)}</Text>}
                </View>
              </AnimatedButton>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Know your cup */}
      <AnimatedButton style={styles.banner} onPress={() => go("/info/know-your-cup")}>
        <Ionicons name="cafe" size={34} color={BRAND.purpleDeep} />
        <View style={styles.flex}>
          <Text style={styles.bannerTitle}>Know your cup</Text>
          <Text style={styles.bannerText}>Find your perfect chai — strength, sweetness and spice.</Text>
        </View>
        <Ionicons name="arrow-forward" size={22} color={BRAND.purpleDeep} />
      </AnimatedButton>

      {/* Halal & allergens */}
      <View style={[styles.halal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="shield-checkmark" size={26} color={BRAND.lime} />
        <View style={styles.flex}>
          <Text style={[styles.halalTitle, { color: colors.text }]}>100% Halal</Text>
          <Text style={[styles.halalText, { color: colors.textMuted }]}>
            Allergies? Check our{" "}
            <Text style={styles.inlineLink} onPress={() => go("/info/allergens")}>
              allergen guide
            </Text>{" "}
            or speak to our team before ordering.
          </Text>
        </View>
      </View>

      {/* Franchise */}
      <View style={[styles.franchise, { backgroundColor: colors.surface }]}>
        <Text style={styles.franchiseScript}>Become our</Text>
        <Text style={styles.franchiseTitle}>Franchise Partner</Text>
        <Text style={[styles.franchiseText, { color: colors.textSecondary }]}>
          Profitable and consistent growth is the ingredient to achieve our goals.
        </Text>
        <BrandButton
          title="Find out more"
          variant="gold"
          size="sm"
          onPress={() => go("/info/franchise")}
          style={styles.franchiseBtn}
        />
      </View>

      {/* Delivery partners */}
      <View style={styles.section}>
        <SectionHeading title="Delivery partners" />
        <View style={styles.partners}>
          {SITE.deliveryPartners.map((partner) => (
            <AnimatedButton
              key={partner.name}
              style={[styles.partner, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => Linking.openURL(partner.url)}
            >
              <Ionicons name={partner.icon as IconName} size={24} color={BRAND.gold} />
              <Text style={[styles.partnerName, { color: colors.text }]}>{partner.name}</Text>
            </AnimatedButton>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={styles.footerScript}>Can&apos;t wait to have you back!</Text>
        <View style={styles.socials}>
          {SITE.socials.map((social) => (
            <TouchableOpacity
              key={social.name}
              onPress={() => Linking.openURL(social.url)}
              style={[styles.social, { borderColor: colors.border }]}
              accessibilityLabel={social.name}
            >
              <Ionicons name={social.icon as IconName} size={22} color={BRAND.gold} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          © 2018–{new Date().getFullYear()} Naan Staap Ltd. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

const TILE_WIDTH = (width - 40 - 20) / 3;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: BRAND.purple,
  },
  headerAccount: { padding: 4 },
  heroWrap: { paddingHorizontal: 16, marginTop: 16 },
  hero: { minHeight: 320, justifyContent: "flex-end" },
  heroImage: { borderRadius: 24 },
  heroOverlay: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: "rgba(58, 38, 64, 0.7)",
    padding: 22,
    justifyContent: "flex-end",
  },
  heroScript: { fontFamily: FONTS.script, fontSize: 28, color: BRAND.orange },
  heroTitle: { fontSize: 34, lineHeight: 38, fontWeight: "900", color: BRAND.gold },
  heroText: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20, marginTop: 8 },
  heroButtons: { gap: 10, marginTop: 18 },
  heroBtn: { alignSelf: "stretch" },
  offline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  offlineText: { flex: 1, fontSize: 13 },
  section: { paddingHorizontal: 20, paddingTop: 28 },
  tiles: { flexDirection: "row", gap: 10 },
  tileWrap: { width: TILE_WIDTH },
  tile: { width: TILE_WIDTH, height: TILE_WIDTH * 1.35, borderRadius: 18, overflow: "hidden" },
  tileImage: { width: "100%", height: "100%" },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  quickAction: { alignItems: "center", width: (width - 52) / 4 },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,215,79,0.12)",
    marginBottom: 8,
  },
  quickLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  hScroll: { paddingRight: 20, gap: 12 },
  dealCard: { width: 270, height: 160, borderRadius: 20, overflow: "hidden" },
  dealOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: "flex-end",
    backgroundColor: "rgba(58, 38, 64, 0.65)",
  },
  dealBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: BRAND.orange,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dealBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  dealTitle: { color: BRAND.gold, fontSize: 17, fontWeight: "800" },
  dealText: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  dealCode: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 6 },
  dealCodeValue: { color: BRAND.gold, fontWeight: "800", letterSpacing: 1 },
  popularCard: { width: 168, borderRadius: 18, overflow: "hidden" },
  popularImage: { width: "100%", height: 110 },
  vegBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: BRAND.lime,
    borderRadius: 10,
    padding: 4,
  },
  popularBody: { padding: 12 },
  popularName: { fontSize: 15, fontWeight: "700" },
  popularDesc: { fontSize: 12, marginTop: 4, minHeight: 32 },
  popularPrice: { color: BRAND.gold, fontSize: 15, fontWeight: "800", marginTop: 6 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginTop: 28,
    padding: 18,
    borderRadius: 20,
    backgroundColor: BRAND.gold,
  },
  bannerTitle: { fontSize: 18, fontWeight: "900", color: BRAND.purpleDeep },
  bannerText: { fontSize: 13, marginTop: 2, color: BRAND.purpleDeep },
  halal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  halalTitle: { fontSize: 16, fontWeight: "800" },
  halalText: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  inlineLink: { color: BRAND.gold, fontWeight: "700" },
  franchise: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 22,
    borderRadius: 20,
    alignItems: "center",
  },
  franchiseScript: { fontFamily: FONTS.script, fontSize: 26, color: BRAND.orange },
  franchiseTitle: { fontSize: 26, fontWeight: "900", color: BRAND.gold, textAlign: "center" },
  franchiseText: { fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 },
  franchiseBtn: { marginTop: 14 },
  partners: { flexDirection: "row", gap: 12 },
  partner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  partnerName: { fontSize: 15, fontWeight: "700" },
  footer: { alignItems: "center", paddingVertical: 32, marginTop: 28, borderTopWidth: 1 },
  footerScript: { fontFamily: FONTS.script, fontSize: 24, color: BRAND.gold },
  socials: { flexDirection: "row", gap: 14, marginVertical: 14 },
  social: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: { fontSize: 12 },
});
