import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { AnimatedButton, FadeInView } from "./AnimatedComponents";
import { mediumHaptic } from "../utils/haptics";

interface MenuCardProps {
  item: {
    id: string;
    name: string;
    description: string;
    price: number | null;
    image_url: string;
    is_vegetarian?: boolean;
    is_popular?: boolean;
    is_spicy?: boolean;
  };
  index: number;
  onPress: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

export function MenuCard({
  item,
  index,
  onPress,
  onFavorite,
  isFavorite,
}: MenuCardProps) {
  const { colors } = useTheme();

  const handleFavorite = () => {
    mediumHaptic();
    onFavorite?.();
  };

  return (
    <FadeInView delay={index * 50} style={{ marginBottom: 12 }}>
      <AnimatedButton
        onPress={onPress}
        style={[styles.container, { backgroundColor: colors.surface }]}
      >
        <View style={styles.content}>
          <Image source={{ uri: item.image_url }} style={styles.image} />
          <View style={styles.details}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.name, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View style={styles.badges}>
                {item.is_vegetarian && (
                  <View style={[styles.badge, { backgroundColor: "#E8F5E9" }]}>
                    <Ionicons name="leaf" size={12} color="#28A745" />
                  </View>
                )}
                {item.is_spicy && (
                  <View style={[styles.badge, { backgroundColor: "#FFEBEE" }]}>
                    <Ionicons name="flame" size={12} color="#E53935" />
                  </View>
                )}
                {item.is_popular && (
                  <View style={[styles.badge, { backgroundColor: "#FFF3E0" }]}>
                    <Ionicons name="star" size={12} color="#FF9800" />
                  </View>
                )}
              </View>
            </View>
            <Text
              style={[styles.description, { color: colors.textMuted }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
            <View style={styles.footer}>
              {item.price ? (
                <Text style={[styles.price, { color: colors.secondary }]}>
                  £{item.price.toFixed(2)}
                </Text>
              ) : (
                <Text style={[styles.priceVaries, { color: colors.textMuted }]}>
                  Price varies
                </Text>
              )}
            </View>
          </View>
          {onFavorite && (
            <TouchableOpacity
              style={styles.favoriteBtn}
              onPress={handleFavorite}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "#E53935" : colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </AnimatedButton>
    </FadeInView>
  );
}

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    description: string;
    image_url: string;
    item_count?: number;
  };
  index: number;
  onPress: () => void;
  size?: "small" | "medium" | "large";
}

export function CategoryCard({
  category,
  index,
  onPress,
  size = "medium",
}: CategoryCardProps) {
  const { colors } = useTheme();

  const dimensions = {
    small: { width: 100, height: 80 },
    medium: { width: 150, height: 120 },
    large: { width: "100%" as const, height: 140 },
  };

  return (
    <FadeInView delay={index * 100}>
      <AnimatedButton
        onPress={onPress}
        style={[
          styles.categoryContainer,
          {
            width: dimensions[size].width,
            height: dimensions[size].height,
          },
        ]}
      >
        <Image
          source={{ uri: category.image_url }}
          style={styles.categoryImage}
        />
        <View
          style={[styles.categoryOverlay, { backgroundColor: colors.overlay }]}
        >
          <Text style={styles.categoryName}>{category.name}</Text>
          {category.item_count !== undefined && (
            <Text style={[styles.categoryCount, { color: colors.secondary }]}>
              {category.item_count} items
            </Text>
          )}
        </View>
      </AnimatedButton>
    </FadeInView>
  );
}

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  backgroundColor: string;
  onPress: () => void;
  index: number;
}

export function QuickAction({
  icon,
  label,
  color,
  backgroundColor,
  onPress,
  index,
}: QuickActionProps) {
  const { colors } = useTheme();

  return (
    <FadeInView delay={index * 100}>
      <AnimatedButton onPress={onPress} style={styles.quickActionContainer}>
        <View style={[styles.quickActionIcon, { backgroundColor }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.quickActionLabel, { color: colors.text }]}>
          {label}
        </Text>
      </AnimatedButton>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    padding: 12,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },
  details: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  badges: {
    flexDirection: "row",
    gap: 4,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
  },
  priceVaries: {
    fontSize: 12,
    fontStyle: "italic",
  },
  favoriteBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
  },
  categoryContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 12,
  },
  categoryName: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  categoryCount: {
    fontSize: 12,
    marginTop: 2,
  },
  quickActionContainer: {
    alignItems: "center",
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
});
