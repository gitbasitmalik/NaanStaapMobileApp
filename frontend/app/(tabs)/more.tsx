import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useAuthStore } from "../../store/authStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { useTheme, BRAND, FONTS } from "../../theme/ThemeContext";
import { BrandButton, BrandInput, ListRow, Logo } from "../../components/ui";
import { useToast } from "../../components/Toast";
import { newsletterAPI, apiErrorMessage } from "../../services/api";
import { SITE } from "../../data/siteContent";
import { lightHaptic, successHaptic } from "../../utils/haptics";

type IconName = keyof typeof Ionicons.glyphMap;
type Row = { icon: IconName; label: string; subtitle?: string; route?: string; url?: string };

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuthStore();
  const favouriteCount = useFavoritesStore((s) => s.favorites.length);
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const subscribe = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast({ message: "Please enter a valid email address", type: "error" });
      return;
    }
    setSubscribing(true);
    try {
      await newsletterAPI.subscribe(email.trim());
      successHaptic();
      showToast({ message: "You're on the list — welcome to the family!", type: "success" });
      setEmail("");
    } catch (error) {
      showToast({ message: apiErrorMessage(error, "Couldn't subscribe right now."), type: "error" });
    } finally {
      setSubscribing(false);
    }
  };

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "Your Naan Staap",
      rows: [
        { icon: "receipt-outline", label: "My orders", subtitle: "Track and reorder", route: "/orders" },
        {
          icon: "gift-outline",
          label: "Rewards",
          subtitle: isAuthenticated ? `${user?.loyalty_points ?? 0} points` : "10 points for every £1",
          route: "/loyalty",
        },
        { icon: "pricetag-outline", label: "Deals & offers", route: "/deals" },
        { icon: "calendar-outline", label: "My bookings", route: "/bookings" },
        { icon: "heart-outline", label: "Favourites", subtitle: `${favouriteCount} saved`, route: "/favorites" },
        { icon: "location-outline", label: "My addresses", route: "/addresses" },
      ],
    },
    {
      title: "Visit us",
      rows: [
        { icon: "restaurant-outline", label: "Book a table", route: "/book-table" },
        { icon: "storefront-outline", label: "Find a store", route: "/stores" },
        { icon: "color-palette-outline", label: "Know your cup", route: "/info/know-your-cup" },
        { icon: "medkit-outline", label: "Allergen guide", route: "/info/allergens" },
      ],
    },
    {
      title: "About Naan Staap",
      rows: [
        { icon: "information-circle-outline", label: "About us", route: "/info/about" },
        { icon: "business-outline", label: "Franchise", subtitle: "Become our partner", route: "/info/franchise" },
        { icon: "people-outline", label: "Catering", subtitle: "Our venue is your place", route: "/info/catering" },
        { icon: "briefcase-outline", label: "Careers", subtitle: "Join the family", route: "/info/career" },
        { icon: "mail-outline", label: "Contact us", subtitle: SITE.email, route: "/contact" },
        { icon: "globe-outline", label: "Website", subtitle: "naanstaap.co.uk", url: SITE.website },
      ],
    },
  ];

  const open = (row: Row) => {
    lightHaptic();
    if (row.url) Linking.openURL(row.url);
    else if (row.route) router.push(row.route as any);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account */}
        <TouchableOpacity
          style={[styles.account, { backgroundColor: colors.surface }]}
          onPress={() => router.push(isAuthenticated ? "/profile" : "/auth/login")}
          activeOpacity={0.85}
        >
          <View style={styles.avatar}>
            {isAuthenticated ? (
              <Text style={styles.avatarText}>{(user?.name || "?").charAt(0).toUpperCase()}</Text>
            ) : (
              <Ionicons name="person" size={26} color={BRAND.purpleDeep} />
            )}
          </View>
          <View style={styles.flex}>
            <Text style={styles.accountScript}>{isAuthenticated ? "Welcome back" : "Hey there!"}</Text>
            <Text style={[styles.accountName, { color: colors.text }]}>
              {isAuthenticated ? user?.name : "Sign in or join"}
            </Text>
            <Text style={[styles.accountSub, { color: colors.textMuted }]}>
              {isAuthenticated
                ? `${user?.tier ?? "Bronze"} member · ${user?.loyalty_points ?? 0} points`
                : "Earn points, save favourites and track orders"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              {section.rows.map((row) => (
                <ListRow
                  key={row.label}
                  icon={row.icon}
                  label={row.label}
                  subtitle={row.subtitle}
                  onPress={() => open(row)}
                  right={
                    row.url ? <Ionicons name="open-outline" size={18} color={colors.textMuted} /> : undefined
                  }
                />
              ))}
            </View>
          </View>
        ))}

        {/* Newsletter */}
        <View style={[styles.newsletter, { backgroundColor: colors.surface }]}>
          <Text style={styles.newsScript}>Stay in the loop</Text>
          <Text style={[styles.newsTitle, { color: colors.text }]}>Join our newsletter</Text>
          <Text style={[styles.newsText, { color: colors.textMuted }]}>
            New drops, seasonal cups and offers — straight to your inbox.
          </Text>
          <BrandInput
            icon="mail-outline"
            placeholder="Your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={styles.newsInput}
          />
          <BrandButton title="Subscribe" variant="gold" loading={subscribing} onPress={subscribe} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Logo width={110} />
          <View style={styles.socials}>
            {SITE.socials.map((s) => (
              <TouchableOpacity
                key={s.name}
                onPress={() => Linking.openURL(s.url)}
                style={[styles.social, { borderColor: colors.border }]}
                accessibilityLabel={s.name}
              >
                <Ionicons name={s.icon as IconName} size={20} color={BRAND.gold} />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            © 2018–{new Date().getFullYear()} Naan Staap Ltd · v{Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  account: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 22,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "900", color: BRAND.purpleDeep },
  accountScript: { fontFamily: FONTS.script, fontSize: 20, color: BRAND.orange },
  accountName: { fontSize: 19, fontWeight: "900", marginTop: -2 },
  accountSub: { fontSize: 12, marginTop: 2 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { color: BRAND.gold, fontSize: 15, fontWeight: "900", marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 20, paddingHorizontal: 14 },
  newsletter: { margin: 16, marginTop: 28, padding: 20, borderRadius: 22 },
  newsScript: { fontFamily: FONTS.script, fontSize: 22, color: BRAND.orange },
  newsTitle: { fontSize: 20, fontWeight: "900", marginTop: -2 },
  newsText: { fontSize: 13, marginTop: 4, marginBottom: 14, lineHeight: 19 },
  newsInput: { marginBottom: 10 },
  footer: { alignItems: "center", marginTop: 12 },
  socials: { flexDirection: "row", gap: 12, marginVertical: 14 },
  social: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  footerText: { fontSize: 12 },
});
