import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Linking,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import axios from "axios";
import { useTheme } from "../theme/ThemeContext";
import {
  AnimatedButton,
  FadeInView,
  SlideInView,
  ScaleInView,
  PulseView,
} from "../components/AnimatedComponents";
import { HomeScreenSkeleton } from "../components/Skeleton";
import { lightHaptic, mediumHaptic } from "../utils/haptics";

const { width } = Dimensions.get("window");
const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number | null;
  category: string;
  image_url: string;
  is_vegetarian: boolean;
  is_popular: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  description: string;
  image_url: string;
  item_count: number;
}

interface Deal {
  id: string;
  title: string;
  description: string;
  discount_percentage: number | null;
  discount_amount: number | null;
  code: string | null;
  image_url: string;
  valid_until: string;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [popularRes, categoriesRes, dealsRes] = await Promise.all([
        axios.get(`${API_URL}/api/menu/items/popular`),
        axios.get(`${API_URL}/api/menu/categories`),
        axios.get(`${API_URL}/api/deals`),
      ]);
      setPopularItems(popularRes.data);
      setCategories(categoriesRes.data);
      setDeals(dealsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openOrderingApp = () => {
    mediumHaptic();
    Linking.openURL("https://naanstaap.app4food.co.uk/");
  };

  const navigateTo = (route: any) => {
    lightHaptic();
    router.push(route);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <HomeScreenSkeleton />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={BRAND_GOLD}
        />
      }
    >
      {/* Hero Section */}
      <FadeInView style={styles.heroSection}>
        <Image
          source={{
            uri: "https://images.pexels.com/photos/35287423/pexels-photo-35287423.jpeg",
          }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <ScaleInView style={styles.logoContainer} delay={200}>
            <Text style={styles.logoText}>NAAN STAAP</Text>
            <Text style={styles.tagline}>Flavours of South Asia</Text>
          </ScaleInView>
          <SlideInView direction="bottom" delay={400}>
            <PulseView>
              <AnimatedButton
                style={styles.orderButton}
                onPress={openOrderingApp}
              >
                <Ionicons name="fast-food" size={20} color="#FFF" />
                <Text style={styles.orderButtonText}>Order Now</Text>
              </AnimatedButton>
            </PulseView>
          </SlideInView>
        </View>
      </FadeInView>

      {/* Quick Actions */}
      <SlideInView
        direction="bottom"
        delay={300}
        style={[styles.quickActions, { backgroundColor: colors.surface }]}
      >
        <AnimatedButton
          style={styles.quickActionItem}
          onPress={() => navigateTo("/menu")}
        >
          <View
            style={[styles.quickActionIcon, { backgroundColor: "#E8D5E0" }]}
          >
            <Ionicons name="restaurant" size={24} color={BRAND_PURPLE} />
          </View>
          <Text style={[styles.quickActionText, { color: colors.text }]}>
            Menu
          </Text>
        </AnimatedButton>
        <AnimatedButton
          style={styles.quickActionItem}
          onPress={() => navigateTo("/stores")}
        >
          <View
            style={[styles.quickActionIcon, { backgroundColor: "#FFF3D4" }]}
          >
            <Ionicons name="location" size={24} color={BRAND_GOLD} />
          </View>
          <Text style={[styles.quickActionText, { color: colors.text }]}>
            Find Store
          </Text>
        </AnimatedButton>
        <AnimatedButton
          style={styles.quickActionItem}
          onPress={() => navigateTo("/more")}
        >
          <View
            style={[styles.quickActionIcon, { backgroundColor: "#D4EDDA" }]}
          >
            <Ionicons name="calendar" size={24} color="#28A745" />
          </View>
          <Text style={[styles.quickActionText, { color: colors.text }]}>
            Book Table
          </Text>
        </AnimatedButton>
        <AnimatedButton
          style={styles.quickActionItem}
          onPress={() => navigateTo("/cart")}
        >
          <View
            style={[styles.quickActionIcon, { backgroundColor: "#FFE5E5" }]}
          >
            <Ionicons name="cart" size={24} color="#E53935" />
          </View>
          <Text style={[styles.quickActionText, { color: colors.text }]}>
            Cart
          </Text>
        </AnimatedButton>
      </SlideInView>

      {/* Deals Section */}
      {deals.length > 0 && (
        <FadeInView delay={400} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Special Deals
            </Text>
            <View style={styles.dealBadge}>
              <Ionicons name="pricetag" size={14} color="#FFF" />
              <Text style={styles.dealBadgeText}>{deals.length} offers</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {deals.map((deal, index) => (
              <SlideInView key={deal.id} direction="right" delay={index * 100}>
                <AnimatedButton style={styles.dealCard}>
                  <Image
                    source={{ uri: deal.image_url }}
                    style={styles.dealImage}
                    resizeMode="cover"
                  />
                  <View style={styles.dealOverlay}>
                    {deal.discount_percentage && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>
                          {deal.discount_percentage}% OFF
                        </Text>
                      </View>
                    )}
                    <Text style={styles.dealTitle}>{deal.title}</Text>
                    <Text style={styles.dealDescription} numberOfLines={2}>
                      {deal.description}
                    </Text>
                    {deal.code && (
                      <View style={styles.codeContainer}>
                        <Text style={styles.codeLabel}>Use code: </Text>
                        <Text style={styles.codeText}>{deal.code}</Text>
                      </View>
                    )}
                  </View>
                </AnimatedButton>
              </SlideInView>
            ))}
          </ScrollView>
        </FadeInView>
      )}

      {/* Popular Items */}
      <FadeInView delay={500} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Popular Items
          </Text>
          <AnimatedButton onPress={() => navigateTo("/menu")}>
            <Text style={styles.seeAllText}>See All</Text>
          </AnimatedButton>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {popularItems.slice(0, 6).map((item, index) => (
            <SlideInView key={item.id} direction="right" delay={index * 80}>
              <AnimatedButton
                style={[
                  styles.popularCard,
                  { backgroundColor: colors.surface },
                ]}
                onPress={() => navigateTo("/menu")}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.popularImage}
                  resizeMode="cover"
                />
                <View style={styles.popularContent}>
                  <Text
                    style={[styles.popularName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.popularDescription,
                      { color: colors.textMuted },
                    ]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                  {item.price && (
                    <Text style={styles.popularPrice}>
                      £{item.price.toFixed(2)}
                    </Text>
                  )}
                </View>
                {item.is_vegetarian && (
                  <View style={styles.vegBadge}>
                    <Ionicons name="leaf" size={12} color="#28A745" />
                  </View>
                )}
              </AnimatedButton>
            </SlideInView>
          ))}
        </ScrollView>
      </FadeInView>

      {/* Menu Categories */}
      <FadeInView delay={600} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Explore Our Menu
        </Text>
        <View style={styles.categoriesGrid}>
          {categories.slice(0, 6).map((category, index) => (
            <ScaleInView key={category.id} delay={index * 100}>
              <AnimatedButton
                style={styles.categoryCard}
                onPress={() => navigateTo("/menu")}
              >
                <Image
                  source={{ uri: category.image_url }}
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
                <View style={styles.categoryOverlay}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryCount}>
                    {category.item_count} items
                  </Text>
                </View>
              </AnimatedButton>
            </ScaleInView>
          ))}
        </View>
      </FadeInView>

      {/* Halal Badge */}
      <ScaleInView
        delay={700}
        style={[styles.halalSection, { backgroundColor: colors.surface }]}
      >
        <View style={styles.halalBadge}>
          <Ionicons name="checkmark-circle" size={24} color={BRAND_GOLD} />
          <Text style={[styles.halalText, { color: colors.text }]}>
            100% HALAL Certified
          </Text>
        </View>
        <Text style={[styles.halalSubtext, { color: colors.textMuted }]}>
          All our food is prepared according to Islamic dietary guidelines
        </Text>
      </ScaleInView>

      {/* Delivery Partners */}
      <FadeInView delay={800} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Delivery Partners
        </Text>
        <View style={styles.deliveryPartners}>
          <AnimatedButton
            style={styles.deliveryPartner}
            onPress={() => {
              mediumHaptic();
              Linking.openURL("https://deliveroo.co.uk/");
            }}
          >
            <View style={styles.deliveryIcon}>
              <Ionicons name="bicycle" size={32} color="#00CCBC" />
            </View>
            <Text style={[styles.deliveryName, { color: colors.text }]}>
              Deliveroo
            </Text>
          </AnimatedButton>
          <AnimatedButton
            style={styles.deliveryPartner}
            onPress={() => {
              mediumHaptic();
              Linking.openURL("https://www.ubereats.com/");
            }}
          >
            <View style={styles.deliveryIcon}>
              <Ionicons name="car" size={32} color="#000" />
            </View>
            <Text style={[styles.deliveryName, { color: colors.text }]}>
              Uber Eats
            </Text>
          </AnimatedButton>
        </View>
      </FadeInView>

      {/* Footer */}
      <FadeInView
        delay={900}
        style={[styles.footer, { borderTopColor: colors.border }]}
      >
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          © 2018-2025 Naan Staap Ltd.
        </Text>
        <Text style={[styles.footerSubtext, { color: colors.textMuted }]}>
          All rights reserved.
        </Text>
        <View style={styles.socialLinks}>
          <AnimatedButton
            onPress={() => {
              lightHaptic();
              Linking.openURL("https://www.facebook.com/NaanStaap");
            }}
          >
            <Ionicons name="logo-facebook" size={28} color="#4267B2" />
          </AnimatedButton>
          <AnimatedButton
            onPress={() => {
              lightHaptic();
              Linking.openURL("https://www.instagram.com/naanstaap/");
            }}
            style={{ marginLeft: 20 }}
          >
            <Ionicons name="logo-instagram" size={28} color="#E1306C" />
          </AnimatedButton>
        </View>
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1 },
  heroSection: { height: 280, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logoContainer: { alignItems: "center", marginBottom: 24 },
  logoText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFF",
    letterSpacing: 4,
  },
  tagline: { fontSize: 16, color: BRAND_GOLD, marginTop: 8, letterSpacing: 2 },
  orderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND_PURPLE,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    gap: 8,
  },
  orderButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  quickActionItem: { alignItems: "center" },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: { fontSize: 12, fontWeight: "500" },
  section: { padding: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  seeAllText: { color: BRAND_GOLD, fontSize: 14, fontWeight: "600" },
  dealBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E53935",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  dealBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  horizontalScroll: { paddingRight: 20 },
  dealCard: {
    width: 280,
    height: 160,
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
  },
  dealImage: { width: "100%", height: "100%" },
  dealOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 16,
    justifyContent: "flex-end",
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#E53935",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  dealTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  dealDescription: { color: "#CCC", fontSize: 12, marginBottom: 8 },
  codeContainer: { flexDirection: "row", alignItems: "center" },
  codeLabel: { color: "#888", fontSize: 11 },
  codeText: { color: BRAND_GOLD, fontSize: 12, fontWeight: "bold" },
  popularCard: {
    width: 160,
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
  },
  popularImage: { width: "100%", height: 100 },
  popularContent: { padding: 12 },
  popularName: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  popularDescription: { fontSize: 11, marginBottom: 8 },
  popularPrice: { fontSize: 14, fontWeight: "bold", color: BRAND_GOLD },
  vegBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 4,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    width: (width - 52) / 2,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  categoryImage: { width: "100%", height: "100%" },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
    padding: 12,
  },
  categoryName: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  categoryCount: { color: BRAND_GOLD, fontSize: 12 },
  halalSection: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  halalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  halalText: { fontSize: 16, fontWeight: "bold" },
  halalSubtext: { fontSize: 12, textAlign: "center" },
  deliveryPartners: { flexDirection: "row", justifyContent: "center", gap: 40 },
  deliveryPartner: { alignItems: "center" },
  deliveryIcon: {
    width: 60,
    height: 60,
    backgroundColor: "#FFF",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  deliveryName: { fontSize: 12, fontWeight: "500" },
  footer: {
    alignItems: "center",
    paddingVertical: 32,
    borderTopWidth: 1,
    marginTop: 20,
  },
  footerText: { fontSize: 12 },
  footerSubtext: { fontSize: 11, marginTop: 4 },
  socialLinks: { flexDirection: "row", marginTop: 16 },
});
