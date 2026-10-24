import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme, BRAND } from "../theme/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { newsletterAPI } from "../services/api";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { BrandButton, Card, Chip, ScreenHeader, SectionHeading } from "../components/ui";
import { errorHaptic, selectionHaptic, successHaptic } from "../utils/haptics";

type IconName = keyof typeof Ionicons.glyphMap;

// Keys are stored as-is in user.notification_preferences (the API merges any keys).
const NOTIFICATION_OPTIONS: {
  key: string;
  label: string;
  description: string;
  icon: IconName;
  fallback: boolean;
}[] = [
  { key: "order_updates", label: "Order updates", description: "When your order is accepted, ready or on its way", icon: "receipt-outline", fallback: true },
  { key: "promotions", label: "Offers & deals", description: "New deals and member-only discounts", icon: "pricetag-outline", fallback: true },
  { key: "loyalty_reminders", label: "Loyalty reminders", description: "Points earned and rewards you can claim", icon: "gift-outline", fallback: true },
  { key: "newsletter", label: "Newsletter", description: "News, new menu items and events by email", icon: "mail-outline", fallback: false },
];

// Values accepted by PUT /api/auth/preferences.
const DIETARY_OPTIONS: { value: string; label: string; icon: IconName }[] = [
  { value: "vegetarian", label: "Vegetarian", icon: "leaf-outline" },
  { value: "vegan", label: "Vegan", icon: "flower-outline" },
  { value: "halal", label: "Halal only", icon: "checkmark-circle-outline" },
  { value: "gluten-free", label: "Gluten-free", icon: "ban-outline" },
  { value: "dairy-free", label: "Dairy-free", icon: "water-outline" },
];

// The 14 UK allergens, named exactly as in the allergen guide and accepted by
// PUT /api/auth/preferences.
const UK_ALLERGENS: { label: string; api?: string }[] = [
  "Celery",
  "Gluten",
  "Crustaceans",
  "Eggs",
  "Fish",
  "Lupin",
  "Milk",
  "Molluscs",
  "Mustard",
  "Tree Nuts",
  "Peanuts",
  "Sesame Seeds",
  "Soybeans",
  "Sulphur Dioxide and Sulphites",
].map((label) => ({ label, api: label }));

const allergenKey = (userId: string) => `@naanstaap_allergen_alerts_${userId}`;

const toApiAllergens = (labels: string[]) =>
  Array.from(
    new Set(
      labels
        .map((l) => UK_ALLERGENS.find((a) => a.label === l)?.api)
        .filter((v): v is string => !!v)
    )
  );

const fromApiAllergens = (values: string[]) =>
  UK_ALLERGENS.filter((a) => a.api && values.includes(a.api)).map((a) => a.label);

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user, isAuthenticated, refreshUserData, updatePreferences } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notify, setNotify] = useState<Record<string, boolean>>({});
  const [dietary, setDietary] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [initial, setInitial] = useState<{
    notify: Record<string, boolean>;
    dietary: string[];
    allergens: string[];
  } | null>(null);

  const hydrate = useCallback(async () => {
    const u = useAuthStore.getState().user as
      | (NonNullable<typeof user> & { notification_preferences?: Record<string, boolean> })
      | null;
    if (!u) return;
    const prefs = u.notification_preferences ?? {};
    const n: Record<string, boolean> = {};
    NOTIFICATION_OPTIONS.forEach((o) => (n[o.key] = prefs[o.key] ?? o.fallback));

    const d = (u.dietary_preferences ?? []).filter((v) => DIETARY_OPTIONS.some((o) => o.value === v));

    const apiAllergens = u.allergen_alerts ?? [];
    let a = fromApiAllergens(apiAllergens);
    try {
      const stored = await AsyncStorage.getItem(allergenKey(u.id));
      if (stored) {
        const local: string[] = JSON.parse(stored);
        // Trust the local list only while it still agrees with what the server holds.
        if (sameSet(toApiAllergens(local), apiAllergens)) a = local;
      }
    } catch {
      // Ignore unreadable local storage and fall back to the server's list.
    }

    setNotify(n);
    setDietary(d);
    setAllergens(a);
    setInitial({ notify: n, dietary: d, allergens: a });
  }, []);

  const load = useCallback(async () => {
    await refreshUserData();
    await hydrate();
  }, [refreshUserData, hydrate]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    load().finally(() => setLoading(false));
  }, [isAuthenticated, load]);

  const dirty = useMemo(() => {
    if (!initial) return false;
    return (
      NOTIFICATION_OPTIONS.some((o) => notify[o.key] !== initial.notify[o.key]) ||
      !sameSet(dietary, initial.dietary) ||
      !sameSet(allergens, initial.allergens)
    );
  }, [initial, notify, dietary, allergens]);

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Notifications" />
        <EmptyState
          icon="notifications-outline"
          title="Sign in to manage notifications"
          message="Choose which updates you get and save your dietary needs and allergens."
          actionLabel="Sign in"
          onAction={() => router.push("/auth/login")}
        />
      </View>
    );
  }

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) => {
    selectionHaptic();
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const ok = await updatePreferences({
      notification_preferences: notify,
      dietary_preferences: dietary,
      allergen_alerts: toApiAllergens(allergens),
    });
    if (!ok) {
      setSaving(false);
      errorHaptic();
      showToast({ message: useAuthStore.getState().error || "Couldn't save your preferences", type: "error" });
      return;
    }
    try {
      await AsyncStorage.setItem(allergenKey(user.id), JSON.stringify(allergens));
    } catch {
      // Non-fatal: the server copy is saved.
    }
    // Keep the newsletter list in step with the toggle (best effort).
    if (initial && notify.newsletter !== initial.notify.newsletter && user.email) {
      const call = notify.newsletter ? newsletterAPI.subscribe : newsletterAPI.unsubscribe;
      call(user.email).catch(() => {});
    }
    setInitial({ notify, dietary, allergens });
    setSaving(false);
    successHaptic();
    showToast({ message: "Preferences saved", type: "success" });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Notifications" subtitle="Alerts & dietary preferences" />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND.gold} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.gold} />}
          >
            <SectionHeading title="Notifications" script="Stay in the loop" />
            <Card style={styles.listCard}>
              {NOTIFICATION_OPTIONS.map((o, i) => (
                <View
                  key={o.key}
                  style={[
                    styles.switchRow,
                    i < NOTIFICATION_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name={o.icon} size={20} color={BRAND.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{o.label}</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>{o.description}</Text>
                  </View>
                  <Switch
                    value={!!notify[o.key]}
                    onValueChange={(v) => {
                      selectionHaptic();
                      setNotify((s) => ({ ...s, [o.key]: v }));
                    }}
                    trackColor={{ false: colors.surfaceLight, true: BRAND.orange }}
                    thumbColor={BRAND.white}
                    ios_backgroundColor={colors.surfaceLight}
                    accessibilityLabel={o.label}
                  />
                </View>
              ))}
            </Card>

            <SectionHeading title="Dietary preferences" style={styles.heading} />
            <Text style={[styles.help, { color: colors.textMuted }]}>
              We’ll use these to highlight suitable dishes for you.
            </Text>
            <View style={styles.chips}>
              {DIETARY_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  icon={o.icon}
                  active={dietary.includes(o.value)}
                  onPress={() => toggle(dietary, o.value, setDietary)}
                />
              ))}
            </View>

            <SectionHeading title="Allergen alerts" style={styles.heading} />
            <Text style={[styles.help, { color: colors.textMuted }]}>
              Choose any of the 14 allergens you need to avoid and we’ll flag dishes that contain them.
            </Text>
            <View style={styles.chips}>
              {UK_ALLERGENS.map((a) => (
                <Chip
                  key={a.label}
                  label={a.label}
                  icon={allergens.includes(a.label) ? "alert-circle" : undefined}
                  active={allergens.includes(a.label)}
                  onPress={() => toggle(allergens, a.label, setAllergens)}
                />
              ))}
            </View>

            <View style={[styles.notice, { borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={18} color={BRAND.gold} />
              <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                Allergen alerts are a guide only. Our kitchens handle all 14 allergens, so always tell
                the team about allergies when you order.
              </Text>
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopColor: colors.border },
            ]}
          >
            <BrandButton
              title={dirty ? "Save preferences" : "All changes saved"}
              icon={dirty ? "checkmark" : "checkmark-done"}
              onPress={handleSave}
              loading={saving}
              disabled={!dirty}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listCard: { paddingVertical: 2 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,215,79,0.12)",
  },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 2 },
  heading: { marginTop: 26, marginBottom: 6 },
  help: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  notice: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 22,
    backgroundColor: "rgba(255,215,79,0.08)",
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
