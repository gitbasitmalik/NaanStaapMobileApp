import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { useCartStore } from "../../store/cartStore";
import { useTheme } from "../../theme/ThemeContext";
import { addToCartHaptic } from "../../utils/haptics";

const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

interface ChaiItem {
  id: string;
  name: string;
  description: string;
  price: number | null;
  image_url: string;
  is_signature: boolean;
  size_options: { size: string; price: number }[];
}

export default function ChaiScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [chaiItems, setChaiItems] = useState<ChaiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    fetchChaiItems();
  }, []);

  const fetchChaiItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chai`);
      setChaiItems(response.data);
    } catch (error) {
      console.error("Error fetching chai items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (chai: ChaiItem, size: string = "Regular") => {
    const selectedOption = chai.size_options.find((opt) => opt.size === size);
    const price = selectedOption?.price || chai.price || 0;

    addItem({
      item_id: chai.id,
      name: `${chai.name} (${size})`,
      price: price,
      quantity: 1,
      customizations: [],
      special_instructions: "",
      image_url: chai.image_url,
    });

    Alert.alert("Added!", `${chai.name} (${size}) added to your cart!`);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={BRAND_GOLD} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Brewing...
        </Text>
      </View>
    );
  }

  const signatureChai = chaiItems.find((item) => item.is_signature);
  const otherChais = chaiItems.filter((item) => !item.is_signature);

  return (
    <ScrollView
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Image
          source={{
            uri: "https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg",
          }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>Our Chais</Text>
          <Text style={styles.heroSubtitle}>
            The true essence of Pakistani hospitality and tradition
          </Text>
        </View>
      </View>

      {/* Signature Chai */}
      {signatureChai && (
        <View style={styles.signatureSection}>
          <View style={styles.signatureBadge}>
            <Ionicons name="star" size={16} color={BRAND_GOLD} />
            <Text style={styles.signatureLabel}>SIGNATURE</Text>
          </View>
          <View
            style={[styles.signatureCard, { backgroundColor: colors.surface }]}
          >
            <Image
              source={{ uri: signatureChai.image_url }}
              style={styles.signatureImage}
              resizeMode="cover"
            />
            <View style={styles.signatureContent}>
              <Text style={[styles.signatureName, { color: colors.text }]}>
                {signatureChai.name}
              </Text>
              <Text
                style={[
                  styles.signatureDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {signatureChai.description}
              </Text>

              {/* Size Options */}
              <View style={styles.sizeOptions}>
                {signatureChai.size_options.map((option) => (
                  <TouchableOpacity
                    key={option.size}
                    style={[
                      styles.sizeOption,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      addToCartHaptic();
                      handleAddToCart(signatureChai, option.size);
                    }}
                  >
                    <View style={styles.sizeInfo}>
                      <Text style={[styles.sizeLabel, { color: colors.text }]}>
                        {option.size}
                      </Text>
                      <Text style={styles.sizePrice}>
                        £{option.price.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.addBtn}>
                      <Ionicons name="add" size={16} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* About Karak Chai */}
      <View style={styles.aboutSection}>
        <View
          style={[styles.quoteContainer, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="cafe" size={32} color={BRAND_GOLD} />
          <Text style={[styles.quoteText, { color: colors.textSecondary }]}>
            "Prepared with carefully selected tea leaves, infused with cardamom,
            and simmered to perfection - it's a bold and flavourful beverage
            with a velvety texture and a warming spice."
          </Text>
        </View>
      </View>

      {/* Flavored Chais */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Flavored Chai
          </Text>
          <Text style={styles.sectionSubtitle}>Sip on Relish</Text>
        </View>
        <View style={styles.chaiGrid}>
          {otherChais.map((chai) => (
            <View
              key={chai.id}
              style={[styles.chaiCard, { backgroundColor: colors.surface }]}
            >
              <Image
                source={{ uri: chai.image_url }}
                style={styles.chaiImage}
                resizeMode="cover"
              />
              <View style={styles.chaiContent}>
                <Text style={[styles.chaiName, { color: colors.text }]}>
                  {chai.name}
                </Text>
                <Text
                  style={[styles.chaiDescription, { color: colors.textMuted }]}
                  numberOfLines={2}
                >
                  {chai.description}
                </Text>
                <View style={styles.chaiFooter}>
                  <Text style={styles.chaiPrice}>
                    from £{chai.price?.toFixed(2)}
                  </Text>
                  <View style={styles.sizeButtons}>
                    {chai.size_options.slice(0, 2).map((option) => (
                      <TouchableOpacity
                        key={option.size}
                        style={styles.smallSizeBtn}
                        onPress={() => {
                          addToCartHaptic();
                          handleAddToCart(chai, option.size);
                        }}
                      >
                        <Text style={styles.smallSizeText}>
                          {option.size === "Regular" ? "R" : "L"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View
          style={[styles.footerContent, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="heart" size={20} color={BRAND_GOLD} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Whether you're seeking a comforting moment of solitude or a lively
            chat with friends, our Karak Chai is the perfect companion.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#FFF", marginTop: 12, fontSize: 16 },
  heroSection: { height: 220, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
  },
  heroSubtitle: { fontSize: 14, color: BRAND_GOLD, textAlign: "center" },
  signatureSection: { padding: 20, paddingTop: 24 },
  signatureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  signatureLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: BRAND_GOLD,
    letterSpacing: 2,
  },
  signatureCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    overflow: "hidden",
  },
  signatureImage: { width: "100%", height: 180 },
  signatureContent: { padding: 16 },
  signatureName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
  },
  signatureDescription: {
    fontSize: 14,
    color: "#AAA",
    lineHeight: 22,
    marginBottom: 16,
  },
  sizeOptions: { flexDirection: "row", gap: 12 },
  sizeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  sizeInfo: {},
  sizeLabel: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  sizePrice: {
    color: BRAND_GOLD,
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: BRAND_PURPLE,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  aboutSection: { paddingHorizontal: 20, marginBottom: 8 },
  quoteContainer: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: BRAND_GOLD,
  },
  quoteText: {
    fontSize: 14,
    color: "#AAA",
    fontStyle: "italic",
    lineHeight: 22,
    textAlign: "center",
    marginTop: 12,
  },
  section: { padding: 20 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: "bold", color: "#FFF" },
  sectionSubtitle: { fontSize: 14, color: BRAND_GOLD, marginTop: 4 },
  chaiGrid: { gap: 12 },
  chaiCard: {
    flexDirection: "row",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    overflow: "hidden",
  },
  chaiImage: { width: 100, height: 110 },
  chaiContent: { flex: 1, padding: 12, justifyContent: "space-between" },
  chaiName: { fontSize: 16, fontWeight: "600", color: "#FFF", marginBottom: 4 },
  chaiDescription: { fontSize: 12, color: "#888", lineHeight: 16 },
  chaiFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  chaiPrice: { fontSize: 14, fontWeight: "bold", color: BRAND_GOLD },
  sizeButtons: { flexDirection: "row", gap: 8 },
  smallSizeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND_PURPLE,
    justifyContent: "center",
    alignItems: "center",
  },
  smallSizeText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  footer: { padding: 20, paddingBottom: 40 },
  footerContent: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 12,
  },
});
