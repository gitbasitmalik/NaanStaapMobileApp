import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCartStore } from "../../store/cartStore";
import { useTheme, BRAND } from "../../theme/ThemeContext";
import { BounceView } from "../../components/AnimatedComponents";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({ color, size, focused }: { color: unknown; size: number; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color as string} />;
  };
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const cartItemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BRAND.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: BRAND.purple,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: tabIcon("home", "home-outline") }}
      />
      <Tabs.Screen
        name="menu"
        options={{ title: "Menu", tabBarIcon: tabIcon("restaurant", "restaurant-outline") }}
      />
      <Tabs.Screen
        name="chai"
        options={{ title: "Chai", tabBarIcon: tabIcon("cafe", "cafe-outline") }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Basket",
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <Ionicons name={focused ? "bag" : "bag-outline"} size={size} color={color as string} />
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
        options={{ title: "Stores", tabBarIcon: tabIcon("location", "location-outline") }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarIcon: tabIcon("menu", "menu-outline") }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -10,
    top: -4,
    backgroundColor: BRAND.orange,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
});
