import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCartStore } from "../../store/cartStore";
import { useTheme, BRAND, FONTS } from "../../theme/ThemeContext";
import { chaiAPI, ChaiItem } from "../../services/api";
import { BrandButton, SectionHeading, formatPrice } from "../../components/ui";
import { EmptyState } from "../../components/EmptyState";
import { MenuItemSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { SITE } from "../../data/siteContent";
import { addToCartHaptic } from "../../utils/haptics";

type Chai = ChaiItem & { type?: "hot" | "cold"; flavoured?: boolean };

export default function ChaiScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [chaiItems, setChaiItems] = useState<Chai[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const fetchChai = useCallback(async () => {
    try {
      const response = await chaiAPI.getAll();
      setChaiItems(response.data as Chai[]);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChai();
  }, [fetchChai]);

  const addToBasket = (chai: Chai) => {
    if (chai.price == null) return;
    addToCartHaptic();
    addItem({
      item_id: chai.id,
      name: chai.name,
      price: chai.price,
      quantity: 1,
      customizations: [],
      special_instructions: "",
      image_url: chai.image_url,
    });
    showToast({ message: `${chai.name} added to your basket`, type: "success" });
  };

  const signature = chaiItems.find((c) => c.is_signature);
  const sections = [
    { title: "Hot chai", script: "Brewed desi-style", items: chaiItems.filter((c) => !c.is_signature && c.type !== "cold" && !c.flavoured) },
    { title: "Flavoured chai", script: "Sip on relish", items: chaiItems.filter((c) => c.flavoured && c.type !== "cold") },
    { title: "Iced & frappés", script: "Chai, but chill", items: chaiItems.filter((c) => c.type === "cold") },
  ].filter((s) => s.items.length > 0);

  const renderChai = (chai: Chai) => (
    <View key={chai.id} style={[styles.card, { backgroundColor: colors.surface }]}>
      <Image source={{ uri: chai.image_url }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {chai.name}
        </Text>
        <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>
          {chai.description}
        </Text>
        <Text style={styles.cardPrice}>{chai.price != null ? formatPrice(chai.price) : "In store"}</Text>
      </View>
      {chai.price != null && (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => addToBasket(chai)}
          accessibilityLabel={`Add ${chai.name}`}
        >
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchChai();
          }}
          tintColor={BRAND.gold}
        />
      }
    >
      <ImageBackground source={{ uri: SITE.chaiHeroImage }} style={[styles.hero, { paddingTop: insets.top }]}>
        <View style={styles.heroOverlay}>
          <Text style={styles.heroScript}>The essence of hospitality</Text>
          <Text style={styles.heroTitle}>Our Chais</Text>
          <Text style={styles.heroText}>
            Carefully selected tea leaves, infused with cardamom and simmered to perfection.
          </Text>
        </View>
      </ImageBackground>

      {loading ? (
        <View style={styles.padded}>
          {[0, 1, 2, 3].map((i) => (
            <MenuItemSkeleton key={i} />
          ))}
        </View>
      ) : failed && chaiItems.length === 0 ? (
        <EmptyState
          icon="cafe-outline"
          title="The kettle's off"
          message="We couldn't load our chai menu. Check your connection and try again."
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            fetchChai();
          }}
        />
      ) : (
        <>
          {signature && (
            <View style={styles.padded}>
              <View style={styles.signatureTag}>
                <Ionicons name="star" size={14} color={BRAND.purpleDeep} />
                <Text style={styles.signatureTagText}>SIGNATURE</Text>
              </View>
              <View style={[styles.signature, { backgroundColor: colors.surface }]}>
                <Image source={{ uri: signature.image_url }} style={styles.signatureImage} />
                <View style={styles.signatureBody}>
                  <Text style={styles.signatureName}>{signature.name}</Text>
                  <Text style={[styles.signatureDesc, { color: colors.textSecondary }]}>
                    {signature.description}
                  </Text>
                  {signature.price != null && (
                    <BrandButton
                      title={`Add to basket · ${formatPrice(signature.price)}`}
                      icon="bag-add"
                      onPress={() => addToBasket(signature)}
                    />
                  )}
                </View>
              </View>
            </View>
          )}

          {sections.map((section) => (
            <View key={section.title} style={styles.padded}>
              <SectionHeading script={section.script} title={section.title} />
              {section.items.map(renderChai)}
            </View>
          ))}

          <TouchableOpacity style={styles.cupBanner} onPress={() => router.push("/info/know-your-cup")}>
            <Ionicons name="color-palette" size={30} color={BRAND.purpleDeep} />
            <View style={styles.flex}>
              <Text style={styles.cupTitle}>Know your cup</Text>
              <Text style={styles.cupText}>
                Every Naan Staap cup tells a story — from truck art to icons.
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={BRAND.purpleDeep} />
          </TouchableOpacity>

          <Text style={[styles.note, { color: colors.textMuted }]}>
            Items marked &quot;In store&quot; are served at our cafés — ask our team for today&apos;s price.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  hero: { minHeight: 280, justifyContent: "flex-end" },
  heroOverlay: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "rgba(58, 38, 64, 0.6)",
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  heroScript: { fontFamily: FONTS.script, fontSize: 28, color: BRAND.orange },
  heroTitle: { fontSize: 38, fontWeight: "900", color: BRAND.gold, marginTop: -4 },
  heroText: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20, marginTop: 6 },
  padded: { paddingHorizontal: 16, paddingTop: 24 },
  signatureTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: BRAND.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  signatureTagText: { color: BRAND.purpleDeep, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  signature: { borderRadius: 22, overflow: "hidden" },
  signatureImage: { width: "100%", height: 220 },
  signatureBody: { padding: 18, gap: 10 },
  signatureName: { fontSize: 26, fontWeight: "900", color: BRAND.gold },
  signatureDesc: { fontSize: 14, lineHeight: 21, marginBottom: 6 },
  card: { flexDirection: "row", borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  cardImage: { width: 96, height: 104 },
  cardBody: { flex: 1, padding: 12, paddingRight: 52 },
  cardName: { fontSize: 16, fontWeight: "800" },
  cardDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  cardPrice: { color: BRAND.gold, fontSize: 15, fontWeight: "900", marginTop: "auto" },
  addBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -17,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BRAND.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  cupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: BRAND.gold,
  },
  cupTitle: { fontSize: 18, fontWeight: "900", color: BRAND.purpleDeep },
  cupText: { fontSize: 13, color: BRAND.purpleDeep, marginTop: 2 },
  note: { fontSize: 12, textAlign: "center", padding: 24, paddingBottom: 40, lineHeight: 18 },
});
