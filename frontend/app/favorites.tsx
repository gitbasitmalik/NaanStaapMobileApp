import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND } from "../theme/ThemeContext";
import { useFavoritesStore, FavoriteItem } from "../store/favoritesStore";
import { useCartStore } from "../store/cartStore";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { FadeInView } from "../components/AnimatedComponents";
import { BrandButton, ScreenHeader, formatPrice } from "../components/ui";
import { addToCartHaptic, removeItemHaptic } from "../utils/haptics";

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const favorites = useFavoritesStore((s) => s.favorites);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);
  const addItem = useCartStore((s) => s.addItem);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, [loadFavorites]);

  const handleAdd = (item: FavoriteItem) => {
    addItem({
      item_id: item.item_id,
      name: item.name,
      price: item.price,
      quantity: 1,
      customizations: [],
      special_instructions: "",
      image_url: item.image_url,
    });
    addToCartHaptic();
    showToast({ message: `${item.name} added to your basket`, type: "success" });
  };

  const handleRemove = (item: FavoriteItem) => {
    removeFavorite(item.item_id);
    removeItemHaptic();
    showToast({ message: `Removed ${item.name} from favourites`, type: "info" });
  };

  const renderItem = ({ item, index }: { item: FavoriteItem; index: number }) => (
    <FadeInView delay={Math.min(index, 8) * 40}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="restaurant-outline" size={28} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <TouchableOpacity
              onPress={() => handleRemove(item)}
              hitSlop={10}
              accessibilityLabel={`Remove ${item.name} from favourites`}
            >
              <Ionicons name="heart" size={22} color={BRAND.orange} />
            </TouchableOpacity>
          </View>
          <View style={styles.bottomRow}>
            <Text style={styles.price}>{formatPrice(item.price)}</Text>
            <BrandButton
              title="Add to basket"
              icon="bag-add-outline"
              size="sm"
              onPress={() => handleAdd(item)}
            />
          </View>
        </View>
      </View>
    </FadeInView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Favourites"
        subtitle={favorites.length ? `${favorites.length} saved item${favorites.length === 1 ? "" : "s"}` : undefined}
      />
      {favorites.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No favourites yet"
          message="Tap the heart on any dish to save it here for a quick reorder."
          actionLabel="Browse menu"
          onAction={() => router.push("/menu")}
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(f) => f.item_id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.gold} />
          }
          ListFooterComponent={
            <TouchableOpacity onPress={() => router.push("/menu")} style={styles.footer} hitSlop={8}>
              <Text style={styles.footerText}>Browse the full menu</Text>
              <Ionicons name="chevron-forward" size={16} color={BRAND.gold} />
            </TouchableOpacity>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { flexDirection: "row", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  image: { width: 104, height: 112 },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 12, justifyContent: "space-between" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: "700" },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  price: { color: BRAND.gold, fontSize: 17, fontWeight: "800" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 12, padding: 8 },
  footerText: { color: BRAND.gold, fontSize: 14, fontWeight: "700" },
});
