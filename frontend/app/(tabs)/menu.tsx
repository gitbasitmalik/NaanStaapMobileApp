import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCartStore } from "../../store/cartStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { useTheme, BRAND, FONTS } from "../../theme/ThemeContext";
import { menuAPI, MenuItem, MenuCategory } from "../../services/api";
import { BrandButton, Chip, formatPrice } from "../../components/ui";
import { MenuItemSkeleton } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";
import { addToCartHaptic, lightHaptic, mediumHaptic } from "../../utils/haptics";

type DietFilter = "veg" | "new" | "popular";

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; item?: string }>();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filters, setFilters] = useState<DietFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");

  const addItem = useCartStore((state) => state.addItem);
  const cartCount = useCartStore((state) => state.items.reduce((s, i) => s + i.quantity, 0));
  const cartSubtotal = useCartStore((state) => state.subtotal);
  const favorites = useFavoritesStore((state) => state.favorites);
  const { addFavorite, removeFavorite } = useFavoritesStore();
  const isFavorite = (id: string) => favorites.some((f) => f.item_id === id);

  const fetchData = useCallback(async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        menuAPI.getCategories(),
        menuAPI.getItems(),
      ]);
      setCategories(categoriesRes.data);
      setMenuItems(itemsRes.data);
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

  const openItem = useCallback((item: MenuItem) => {
    lightHaptic();
    setSelectedItem(item);
    setQuantity(1);
    setSelectedCustomizations([]);
    setInstructions("");
  }, []);

  // Deep links: /menu?category=naan or /menu?item=<id>
  useEffect(() => {
    if (params.category) setSelectedCategory(String(params.category));
  }, [params.category]);

  useEffect(() => {
    if (!params.item || menuItems.length === 0) return;
    const item = menuItems.find((i) => i.id === String(params.item));
    if (item) openItem(item);
    router.setParams({ item: undefined });
  }, [params.item, menuItems, openItem, router]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (filters.includes("veg") && !item.is_vegetarian) return false;
      if (filters.includes("new") && !item.is_new) return false;
      if (filters.includes("popular") && !item.is_popular) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });
  }, [menuItems, selectedCategory, filters, searchQuery]);

  // Group by category so "All" reads like the printed menu.
  const sections = useMemo(() => {
    const order = categories.map((c) => c.id);
    const groups = new Map<string, MenuItem[]>();
    for (const item of filteredItems) {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category)!.push(item);
    }
    return [...groups.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([id, items]) => ({
        id,
        title: categories.find((c) => c.id === id)?.name || id,
        items,
      }));
  }, [filteredItems, categories]);

  const closeItem = () => setSelectedItem(null);

  const addToBasket = (item: MenuItem, qty: number, customizations: string[], notes: string) => {
    if (item.price == null) return;
    addToCartHaptic();
    addItem({
      item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: qty,
      customizations,
      special_instructions: notes.trim(),
      image_url: item.image_url,
    });
    showToast({ message: `${qty} × ${item.name} added to your basket`, type: "success" });
  };

  const toggleFilter = (filter: DietFilter) => {
    lightHaptic();
    setFilters((current) =>
      current.includes(filter) ? current.filter((f) => f !== filter) : [...current, filter]
    );
  };

  const toggleFavorite = (item: MenuItem) => {
    mediumHaptic();
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

  const renderCard = (item: MenuItem) => {
    const orderable = item.price != null;
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.85}
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => openItem(item)}
      >
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={() => toggleFavorite(item)} hitSlop={10}>
              <Ionicons
                name={isFavorite(item.id) ? "heart" : "heart-outline"}
                size={20}
                color={isFavorite(item.id) ? BRAND.orange : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>
              {orderable ? formatPrice(item.price) : "In store only"}
            </Text>
            <View style={styles.badges}>
              {item.is_popular && <Ionicons name="flame" size={15} color={BRAND.orange} />}
              {item.is_spicy && <Text style={styles.chilli}>🌶️</Text>}
              {item.is_vegetarian && <Ionicons name="leaf" size={15} color={BRAND.lime} />}
            </View>
          </View>
        </View>
        {orderable && (
          <TouchableOpacity
            style={styles.addButton}
            accessibilityLabel={`Add ${item.name}`}
            onPress={() =>
              item.customizations.length > 0 ? openItem(item) : addToBasket(item, 1, [], "")
            }
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const linePrice = (selectedItem?.price || 0) * quantity;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerScript}>Made fresh, served hot</Text>
        <Text style={styles.headerTitle}>Our Menu</Text>
      </View>

      {/* Search */}
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search naan, karahi, chai…"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories and filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        <Chip
          label="All"
          active={selectedCategory === "all"}
          onPress={() => setSelectedCategory("all")}
        />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            active={selectedCategory === category.id}
            onPress={() => {
              lightHaptic();
              setSelectedCategory(category.id);
            }}
          />
        ))}
      </ScrollView>
      <View style={styles.filterRow}>
        <Chip label="Veg" icon="leaf" active={filters.includes("veg")} onPress={() => toggleFilter("veg")} />
        <Chip label="New" icon="sparkles" active={filters.includes("new")} onPress={() => toggleFilter("new")} />
        <Chip
          label="Popular"
          icon="star"
          active={filters.includes("popular")}
          onPress={() => toggleFilter("popular")}
        />
      </View>

      {loading ? (
        <View style={styles.listContent}>
          {[0, 1, 2, 3, 4].map((i) => (
            <MenuItemSkeleton key={i} />
          ))}
        </View>
      ) : failed && menuItems.length === 0 ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Menu unavailable"
          message="We couldn't load the menu. Check your connection and try again."
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            fetchData();
          }}
        />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: cartCount > 0 ? 110 : 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
          {sections.length === 0 ? (
            <EmptyState
              icon="search"
              title="Nothing found"
              message="Try a different search or clear your filters."
              actionLabel="Clear filters"
              onAction={() => {
                setSearchQuery("");
                setFilters([]);
                setSelectedCategory("all");
              }}
            />
          ) : (
            sections.map((section) => (
              <View key={section.id} style={styles.section}>
                {selectedCategory === "all" && (
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                )}
                {section.items.map(renderCard)}
              </View>
            ))
          )}
          <Text style={[styles.allergyNote, { color: colors.textMuted }]}>
            100% Halal. Our food may contain allergens —{" "}
            <Text style={styles.allergyLink} onPress={() => router.push("/info/allergens")}>
              see allergen info
            </Text>
            .
          </Text>
        </ScrollView>
      )}

      {/* Basket bar */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.basketBar}
          onPress={() => router.push("/cart")}
          activeOpacity={0.9}
        >
          <View style={styles.basketCount}>
            <Text style={styles.basketCountText}>{cartCount}</Text>
          </View>
          <Text style={styles.basketText}>View basket</Text>
          <Text style={styles.basketTotal}>{formatPrice(cartSubtotal)}</Text>
        </TouchableOpacity>
      )}

      {/* Item sheet */}
      <Modal visible={!!selectedItem} animationType="slide" transparent onRequestClose={closeItem}>
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={styles.flex} onPress={closeItem} accessibilityLabel="Close" />
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 },
            ]}
          >
            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Image source={{ uri: selectedItem.image_url }} style={styles.sheetImage} />
                <TouchableOpacity
                  style={styles.sheetClose}
                  onPress={closeItem}
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={22} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.sheetBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.sheetTitle}>{selectedItem.name}</Text>
                    <TouchableOpacity onPress={() => toggleFavorite(selectedItem)} hitSlop={10}>
                      <Ionicons
                        name={isFavorite(selectedItem.id) ? "heart" : "heart-outline"}
                        size={26}
                        color={isFavorite(selectedItem.id) ? BRAND.orange : colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  {selectedItem.price != null && (
                    <Text style={styles.sheetPrice}>{formatPrice(selectedItem.price)}</Text>
                  )}
                  <Text style={[styles.sheetDesc, { color: colors.textSecondary }]}>
                    {selectedItem.description}
                  </Text>

                  <View style={styles.sheetBadges}>
                    {selectedItem.is_vegetarian && (
                      <Badge icon="leaf" label="Vegetarian" color={BRAND.lime} />
                    )}
                    {selectedItem.is_spicy && <Badge icon="flame" label="Spicy" color={BRAND.orange} />}
                    {selectedItem.calories ? (
                      <Badge
                        icon="flash-outline"
                        label={`${selectedItem.calories} kcal`}
                        color={colors.textSecondary}
                      />
                    ) : null}
                  </View>

                  {selectedItem.allergens.length > 0 && (
                    <View style={[styles.infoBox, { borderColor: colors.border }]}>
                      <Ionicons name="warning-outline" size={18} color={BRAND.gold} />
                      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Contains: {selectedItem.allergens.join(", ")}
                      </Text>
                    </View>
                  )}

                  {selectedItem.price != null && selectedItem.customizations.length > 0 && (
                    <View style={styles.block}>
                      <Text style={styles.blockTitle}>Make it yours</Text>
                      {selectedItem.customizations.map((custom) => {
                        const checked = selectedCustomizations.includes(custom);
                        return (
                          <TouchableOpacity
                            key={custom}
                            style={[styles.option, { borderBottomColor: colors.border }]}
                            onPress={() => {
                              lightHaptic();
                              setSelectedCustomizations((current) =>
                                checked
                                  ? current.filter((c) => c !== custom)
                                  : [...current, custom]
                              );
                            }}
                          >
                            <View
                              style={[
                                styles.checkbox,
                                { borderColor: checked ? BRAND.gold : colors.border },
                                checked && { backgroundColor: BRAND.gold },
                              ]}
                            >
                              {checked && (
                                <Ionicons name="checkmark" size={14} color={BRAND.purpleDeep} />
                              )}
                            </View>
                            <Text style={[styles.optionText, { color: colors.text }]}>{custom}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {selectedItem.price != null ? (
                    <>
                      <View style={styles.block}>
                        <Text style={styles.blockTitle}>Special instructions</Text>
                        <TextInput
                          style={[
                            styles.notes,
                            {
                              color: colors.text,
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                          ]}
                          placeholder="e.g. no onions, extra crispy"
                          placeholderTextColor={colors.textMuted}
                          value={instructions}
                          onChangeText={setInstructions}
                          maxLength={200}
                          multiline
                        />
                      </View>

                      <View style={styles.qtyRow}>
                        <TouchableOpacity
                          style={[styles.qtyBtn, { backgroundColor: colors.surface }]}
                          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                          accessibilityLabel="Decrease quantity"
                        >
                          <Ionicons name="remove" size={22} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.qtyText, { color: colors.text }]}>{quantity}</Text>
                        <TouchableOpacity
                          style={[styles.qtyBtn, { backgroundColor: colors.surface }]}
                          onPress={() => setQuantity((q) => Math.min(50, q + 1))}
                          accessibilityLabel="Increase quantity"
                        >
                          <Ionicons name="add" size={22} color={colors.text} />
                        </TouchableOpacity>
                      </View>

                      <BrandButton
                        title={`Add to basket · ${formatPrice(linePrice)}`}
                        icon="bag-add"
                        onPress={() => {
                          addToBasket(selectedItem, quantity, selectedCustomizations, instructions);
                          closeItem();
                        }}
                      />
                    </>
                  ) : (
                    <View style={[styles.infoBox, { borderColor: colors.border }]}>
                      <Ionicons name="storefront-outline" size={18} color={BRAND.gold} />
                      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Available in store — ask our team for today&apos;s price.
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Badge({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  headerScript: { fontFamily: FONTS.script, fontSize: 24, color: BRAND.orange },
  headerTitle: { fontSize: 32, fontWeight: "900", color: BRAND.gold, marginTop: -4 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15 },
  chipScroll: { flexGrow: 0, marginTop: 12 },
  chipRow: { paddingHorizontal: 16, gap: 8 },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  list: { flex: 1 },
  listContent: { padding: 16 },
  section: { marginBottom: 8 },
  sectionTitle: {
    color: BRAND.gold,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 6,
  },
  card: { flexDirection: "row", borderRadius: 18, marginBottom: 12, overflow: "hidden" },
  cardImage: { width: 108, height: 116 },
  cardBody: { flex: 1, padding: 12, paddingRight: 14 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardName: { flex: 1, fontSize: 16, fontWeight: "800" },
  cardDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: "auto",
    paddingRight: 36,
    gap: 10,
  },
  cardPrice: { color: BRAND.gold, fontSize: 16, fontWeight: "900" },
  badges: { flexDirection: "row", alignItems: "center", gap: 6 },
  chilli: { fontSize: 12 },
  addButton: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BRAND.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  allergyNote: { fontSize: 12, textAlign: "center", marginTop: 12, lineHeight: 18 },
  allergyLink: { color: BRAND.gold, fontWeight: "700" },
  basketBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND.orange,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  basketCount: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 12,
    minWidth: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  basketCountText: { color: "#FFF", fontWeight: "900" },
  basketText: { flex: 1, color: "#FFF", fontSize: 16, fontWeight: "800" },
  basketTotal: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    overflow: "hidden",
  },
  sheetImage: { width: "100%", height: 230 },
  sheetClose: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(58,38,64,0.7)",
    borderRadius: 20,
    padding: 8,
  },
  sheetBody: { padding: 20 },
  sheetTitle: { flex: 1, fontSize: 26, fontWeight: "900", color: BRAND.gold },
  sheetPrice: { fontSize: 20, fontWeight: "900", color: "#FFF", marginTop: 4 },
  sheetDesc: { fontSize: 15, lineHeight: 22, marginTop: 10 },
  sheetBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  block: { marginTop: 20 },
  blockTitle: { color: BRAND.gold, fontSize: 16, fontWeight: "800", marginBottom: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { fontSize: 15 },
  notes: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    minHeight: 70,
    fontSize: 14,
    textAlignVertical: "top",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginVertical: 20,
  },
  qtyBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { fontSize: 24, fontWeight: "900", minWidth: 30, textAlign: "center" },
});
