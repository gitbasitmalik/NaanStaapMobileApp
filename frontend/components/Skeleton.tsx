import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  Dimensions,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";

const { width } = Dimensions.get("window");

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width: skeletonWidth = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: skeletonWidth as any,
          height,
          borderRadius,
          backgroundColor: colors.surfaceLight,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function MenuItemSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.menuItem, { backgroundColor: colors.surface }]}>
      <Skeleton width={120} height={100} borderRadius={12} />
      <View style={styles.menuItemContent}>
        <Skeleton width="80%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={12} style={{ marginBottom: 4 }} />
        <Skeleton width="60%" height={12} style={{ marginBottom: 12 }} />
        <Skeleton width={60} height={20} />
      </View>
    </View>
  );
}

export function CategorySkeleton() {
  return (
    <View style={styles.category}>
      <Skeleton width={(width - 52) / 2} height={120} borderRadius={12} />
    </View>
  );
}

export function PopularItemSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.popularCard, { backgroundColor: colors.surface }]}>
      <Skeleton width="100%" height={100} borderRadius={0} />
      <View style={styles.popularContent}>
        <Skeleton width="80%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={10} style={{ marginBottom: 4 }} />
        <Skeleton width="40%" height={14} />
      </View>
    </View>
  );
}

export function DealSkeleton() {
  return (
    <View style={styles.dealCard}>
      <Skeleton width={280} height={160} borderRadius={12} />
    </View>
  );
}

export function CartItemSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.cartItem, { backgroundColor: colors.surface }]}>
      <Skeleton width={70} height={70} borderRadius={8} />
      <View style={styles.cartContent}>
        <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={14} />
      </View>
      <Skeleton width={80} height={32} borderRadius={16} />
    </View>
  );
}

export function StoreCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.storeCard, { backgroundColor: colors.surface }]}>
      <Skeleton width="100%" height={140} borderRadius={0} />
      <View style={styles.storeContent}>
        <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="80%" height={12} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}

export function HomeScreenSkeleton() {
  return (
    <View style={styles.homeSkeleton}>
      {/* Hero */}
      <Skeleton width="100%" height={280} borderRadius={0} />

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.quickAction}>
            <Skeleton width={50} height={50} borderRadius={25} />
            <Skeleton width={40} height={10} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* Section */}
      <View style={styles.section}>
        <Skeleton width={150} height={24} style={{ marginBottom: 16 }} />
        <View style={styles.horizontalScroll}>
          {[1, 2, 3].map((i) => (
            <PopularItemSkeleton key={i} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: "row",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  category: {
    marginBottom: 12,
  },
  popularCard: {
    width: 160,
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
  },
  popularContent: {
    padding: 12,
  },
  dealCard: {
    marginRight: 12,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  cartContent: {
    flex: 1,
    marginLeft: 12,
  },
  storeCard: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  storeContent: {
    padding: 16,
  },
  homeSkeleton: {
    flex: 1,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 24,
    marginTop: -20,
    marginHorizontal: 16,
  },
  quickAction: {
    alignItems: "center",
  },
  section: {
    padding: 20,
  },
  horizontalScroll: {
    flexDirection: "row",
  },
});
