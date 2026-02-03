import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { useCartStore } from "../../store/cartStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { useTheme } from "../../theme/ThemeContext";
import { addToCartHaptic, lightHaptic, mediumHaptic } from "../../utils/haptics";

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
  is_spicy: boolean;
  calories: number | null;
  allergens: string[];
  customizations: string[];
}

interface MenuCategory {
  id: string;
  name: string;
  description: string;
  image_url: string;
}

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState<
    string[]
  >([]);

  const addItem = useCartStore((state) => state.addItem);
  const { favorites, addFavorite, removeFavorite, isFavorite, loadFavorites } =
    useFavoritesStore();

  useEffect(() => {
    fetchData();
    loadFavorites();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        axios.get(`${API_URL}/api/menu/categories`),
        axios.get(`${API_URL}/api/menu/items`),
      ]);
      setCategories(categoriesRes.data);
      setMenuItems(itemsRes.data);
    } catch (error) {
      console.error("Error fetching menu:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = () => {
    if (!selectedItem || !selectedItem.price) return;

    addItem({
      item_id: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price,
      quantity: quantity,
      customizations: selectedCustomizations,
      special_instructions: "",
      image_url: selectedItem.image_url,
    });

    Alert.alert(
      "Added to Cart",
      `${quantity}x ${selectedItem.name} added to your cart!`
    );
    setSelectedItem(null);
    setQuantity(1);
    setSelectedCustomizations([]);
  };

  const toggleCustomization = (custom: string) => {
    if (selectedCustomizations.includes(custom)) {
      setSelectedCustomizations(
        selectedCustomizations.filter((c) => c !== custom)
      );
    } else {
      setSelectedCustomizations([...selectedCustomizations, custom]);
    }
  };

  const toggleFavorite = (item: MenuItem) => {
    if (isFavorite(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite({
        item_id: item.id,
        name: item.name,
        price: item.price || 0,
        image_url: item.image_url,
      });
    }
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
          Loading Menu...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Our Menu
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          Traditional Desi, Contemporary, and Refined South Asian Cuisine
        </Text>
      </View>

      {/* Search Bar */}
      <View
        style={[styles.searchContainer, { backgroundColor: colors.surface }]}
      >
        <Ionicons
          name="search"
          size={20}
          color={colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search menu..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            { backgroundColor: colors.surface, borderColor: colors.border },
            selectedCategory === "all" && styles.categoryChipActive,
          ]}
          onPress={() => {
            lightHaptic();
            setSelectedCategory("all");
          }}
        >
          <Text
            style={[
              styles.categoryChipText,
              { color: colors.textMuted },
              selectedCategory === "all" && styles.categoryChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              selectedCategory === category.id && styles.categoryChipActive,
            ]}
            onPress={() => {
              lightHaptic();
              setSelectedCategory(category.id);
            }}
          >
            <Text
              style={[
                styles.categoryChipText,
                { color: colors.textMuted },
                selectedCategory === category.id &&
                  styles.categoryChipTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu Items */}
      <ScrollView
        style={styles.menuList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuListContent}
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No items found
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuCard, { backgroundColor: colors.surface }]}
              onPress={() => {
                lightHaptic();
                setSelectedItem(item);
              }}
            >
              <Image
                source={{ uri: item.image_url }}
                style={styles.menuImage}
                resizeMode="cover"
              />
              <View style={styles.menuContent}>
                <View style={styles.menuHeader}>
                  <Text
                    style={[styles.menuName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      mediumHaptic();
                      toggleFavorite(item);
                    }}
                    style={styles.favoriteButton}
                  >
                    <Ionicons
                      name={isFavorite(item.id) ? "heart" : "heart-outline"}
                      size={20}
                      color={isFavorite(item.id) ? "#E53935" : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={[styles.menuDescription, { color: colors.textMuted }]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
                <View style={styles.menuFooter}>
                  {item.price && (
                    <Text style={styles.menuPrice}>
                      £{item.price.toFixed(2)}
                    </Text>
                  )}
                  <View style={styles.badges}>
                    {item.is_popular && (
                      <View style={styles.popularBadge}>
                        <Ionicons name="flame" size={12} color="#FF6B35" />
                      </View>
                    )}
                    {item.is_spicy && (
                      <View style={styles.spicyBadge}>
                        <Text style={styles.spicyText}>🌶️</Text>
                      </View>
                    )}
                    {item.is_vegetarian && (
                      <View style={styles.vegBadge}>
                        <Ionicons name="leaf" size={14} color="#28A745" />
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  lightHaptic();
                  setSelectedItem(item);
                }}
              >
                <Ionicons name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Item Detail Modal */}
      <Modal visible={!!selectedItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => {
                setSelectedItem(null);
                setQuantity(1);
                setSelectedCustomizations([]);
              }}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                  source={{ uri: selectedItem.image_url }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <View style={styles.modalDetails}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {selectedItem.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        mediumHaptic();
                        toggleFavorite(selectedItem);
                      }}
                    >
                      <Ionicons
                        name={
                          isFavorite(selectedItem.id)
                            ? "heart"
                            : "heart-outline"
                        }
                        size={28}
                        color={
                          isFavorite(selectedItem.id)
                            ? "#E53935"
                            : colors.textMuted
                        }
                      />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      styles.modalDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {selectedItem.description}
                  </Text>

                  <View style={styles.modalBadges}>
                    {selectedItem.is_vegetarian && (
                      <View
                        style={[
                          styles.modalBadge,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        <Ionicons name="leaf" size={16} color="#28A745" />
                        <Text
                          style={[
                            styles.modalBadgeText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Vegetarian
                        </Text>
                      </View>
                    )}
                    {selectedItem.is_spicy && (
                      <View
                        style={[
                          styles.modalBadge,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        <Text>🌶️</Text>
                        <Text
                          style={[
                            styles.modalBadgeText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Spicy
                        </Text>
                      </View>
                    )}
                    {selectedItem.calories && (
                      <View
                        style={[
                          styles.modalBadge,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        <Ionicons
                          name="flame-outline"
                          size={16}
                          color={colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.modalBadgeText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {selectedItem.calories} cal
                        </Text>
                      </View>
                    )}
                  </View>

                  {selectedItem.allergens.length > 0 && (
                    <View style={styles.allergensSection}>
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        Allergens:
                      </Text>
                      <Text style={styles.allergensText}>
                        {selectedItem.allergens.join(", ")}
                      </Text>
                    </View>
                  )}

                  {selectedItem.customizations.length > 0 && (
                    <View style={styles.customizationsSection}>
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        Customizations:
                      </Text>
                      {selectedItem.customizations.map((custom) => (
                        <TouchableOpacity
                          key={custom}
                          style={styles.customOption}
                          onPress={() => {
                            lightHaptic();
                            toggleCustomization(custom);
                          }}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              { borderColor: colors.border },
                              selectedCustomizations.includes(custom) &&
                                styles.checkboxActive,
                            ]}
                          >
                            {selectedCustomizations.includes(custom) && (
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color="#FFF"
                              />
                            )}
                          </View>
                          <Text
                            style={[styles.customText, { color: colors.text }]}
                          >
                            {custom}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={styles.quantitySection}>
                    <Text
                      style={[styles.sectionLabel, { color: colors.textMuted }]}
                    >
                      Quantity:
                    </Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={[
                          styles.quantityBtn,
                          { backgroundColor: colors.border },
                        ]}
                        onPress={() => {
                          lightHaptic();
                          setQuantity(Math.max(1, quantity - 1));
                        }}
                      >
                        <Ionicons name="remove" size={20} color="#FFF" />
                      </TouchableOpacity>
                      <Text
                        style={[styles.quantityText, { color: colors.text }]}
                      >
                        {quantity}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.quantityBtn,
                          { backgroundColor: colors.border },
                        ]}
                        onPress={() => {
                          lightHaptic();
                          setQuantity(quantity + 1);
                        }}
                      >
                        <Ionicons name="add" size={20} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.addToCartBtn}
                    onPress={() => {
                      addToCartHaptic();
                      handleAddToCart();
                    }}
                  >
                    <Ionicons name="cart" size={20} color="#FFF" />
                    <Text style={styles.addToCartText}>
                      Add to Cart - £
                      {((selectedItem.price || 0) * quantity).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Halal Badge */}
      <View
        style={[
          styles.halalFloating,
          { backgroundColor: colors.surface, borderColor: BRAND_GOLD },
        ]}
      >
        <Ionicons name="checkmark-circle" size={16} color={BRAND_GOLD} />
        <Text style={[styles.halalFloatingText, { color: colors.text }]}>
          100% Halal
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },
  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  headerSubtitle: { fontSize: 13, lineHeight: 18 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  categoryScroll: { maxHeight: 50 },
  categoryContainer: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryChipActive: {
    backgroundColor: BRAND_PURPLE,
    borderColor: BRAND_PURPLE,
  },
  categoryChipText: { fontSize: 14, fontWeight: "500" },
  categoryChipTextActive: { color: "#FFF" },
  menuList: { flex: 1 },
  menuListContent: { padding: 16, paddingBottom: 80 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16 },
  menuCard: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  menuImage: { width: 100, height: 100 },
  menuContent: { flex: 1, padding: 12, justifyContent: "space-between" },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuName: { fontSize: 16, fontWeight: "600", flex: 1 },
  favoriteButton: { padding: 4 },
  menuDescription: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  menuFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  menuPrice: { fontSize: 16, fontWeight: "bold", color: BRAND_GOLD },
  badges: { flexDirection: "row", gap: 6 },
  popularBadge: {
    backgroundColor: "rgba(255, 107, 53, 0.2)",
    padding: 4,
    borderRadius: 8,
  },
  spicyBadge: { padding: 4 },
  spicyText: { fontSize: 12 },
  vegBadge: {
    backgroundColor: "rgba(40, 167, 69, 0.2)",
    padding: 4,
    borderRadius: 8,
  },
  addButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: BRAND_PURPLE,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  halalFloating: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  halalFloatingText: { fontSize: 12, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 20,
  },
  modalImage: { width: "100%", height: 200 },
  modalDetails: { padding: 20 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 24, fontWeight: "bold", flex: 1 },
  modalDescription: { fontSize: 14, marginTop: 8, lineHeight: 22 },
  modalBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  modalBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  modalBadgeText: { fontSize: 12 },
  allergensSection: { marginTop: 16 },
  sectionLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  allergensText: { color: "#FF6B35", fontSize: 13 },
  customizationsSection: { marginTop: 16 },
  customOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: { backgroundColor: BRAND_PURPLE, borderColor: BRAND_PURPLE },
  customText: { fontSize: 14 },
  quantitySection: { marginTop: 20 },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  quantityBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 20,
    fontWeight: "bold",
    width: 40,
    textAlign: "center",
  },
  addToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_PURPLE,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  addToCartText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
