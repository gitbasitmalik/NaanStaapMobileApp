import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Platform, StatusBar, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCartStore } from "../store/cartStore";
import { ThemeProvider, useTheme } from "../theme/ThemeContext";
import { BounceView } from "../components/AnimatedComponents";

const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";

function TabLayoutContent() {
  const insets = useSafeAreaInsets();
  const cartItemCount = useCartStore((state) => state.getItemCount());
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
        },
      ]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={BRAND_PURPLE}
      />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: BRAND_GOLD,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: "Menu",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="restaurant" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: "Cart",
            tabBarIcon: ({ color, size }) => (
              <View>
                <Ionicons name="cart" size={size} color={color} />
                {cartItemCount > 0 && (
                  <BounceView trigger={cartItemCount} style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {cartItemCount > 9 ? "9+" : cartItemCount}
                    </Text>
                  </BounceView>
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="stores"
          options={{
            title: "Stores",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="location" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chai"
          options={{
            title: "Chai",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cafe" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="ellipsis-horizontal" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

export default function TabLayout() {
  return (
    <ThemeProvider>
      <TabLayoutContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  badge: {
    position: "absolute",
    right: -8,
    top: -4,
    backgroundColor: "#E53935",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});
