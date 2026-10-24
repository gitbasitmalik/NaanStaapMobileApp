import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND } from "../../theme/ThemeContext";
import { Chip, ScreenHeader } from "../../components/ui";
import { EmptyState } from "../../components/EmptyState";
import { allergensAPI, AllergenGuide } from "../../services/api";

export default function AllergensScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [guide, setGuide] = useState<AllergenGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [avoid, setAvoid] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await allergensAPI.get();
      setGuide(response.data);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // "Avoid" hides dishes that contain or may contain the chosen allergens.
  const items = useMemo(() => {
    if (!guide) return [];
    const q = query.trim().toLowerCase();
    return guide.items.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) {
        return false;
      }
      return !avoid.some((a) => item.contains.includes(a) || item.may_contain.includes(a));
    });
  }, [guide, query, avoid]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Allergen guide" subtitle="14 major allergens, by dish" />
      {loading ? (
        <ActivityIndicator color={BRAND.gold} style={styles.loader} />
      ) : failed || !guide ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load the guide"
          message="Please check your connection, or ask our team in store."
          actionLabel="Try again"
          onAction={load}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 30 }]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <View style={[styles.warning, { borderColor: BRAND.gold }]}>
                <Ionicons name="warning" size={22} color={BRAND.gold} />
                <Text style={[styles.warningText, { color: colors.text }]}>
                  {guide.disclaimer} {guide.note}
                </Text>
              </View>
              <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search a dish"
                  placeholderTextColor={colors.textMuted}
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
              <Text style={[styles.avoidLabel, { color: colors.textSecondary }]}>
                Hide dishes containing:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {guide.allergen_list.map((allergen) => (
                  <Chip
                    key={allergen}
                    label={allergen}
                    active={avoid.includes(allergen)}
                    onPress={() =>
                      setAvoid((current) =>
                        current.includes(allergen)
                          ? current.filter((a) => a !== allergen)
                          : [...current, allergen]
                      )
                    }
                  />
                ))}
              </ScrollView>
              <Text
                style={styles.printLink}
                onPress={() => Linking.openURL(guide.printable_guide_url)}
              >
                Open the printable allergen guide
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>No dishes match.</Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.category, { color: colors.textMuted }]}>{item.category}</Text>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              {item.contains.length === 0 && item.may_contain.length === 0 ? (
                <Text style={[styles.line, { color: BRAND.lime }]}>No major allergens listed</Text>
              ) : (
                <>
                  {item.contains.length > 0 && (
                    <Text style={[styles.line, { color: colors.textSecondary }]}>
                      <Text style={styles.lineLabel}>Contains: </Text>
                      {item.contains.join(", ")}
                    </Text>
                  )}
                  {item.may_contain.length > 0 && (
                    <Text style={[styles.line, { color: colors.textSecondary }]}>
                      <Text style={styles.lineLabel}>May contain: </Text>
                      {item.may_contain.join(", ")}
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 60 },
  list: { padding: 16 },
  warning: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  warningText: { flex: 1, fontSize: 13, lineHeight: 19 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  avoidLabel: { fontSize: 13, fontWeight: "600", marginTop: 14, marginBottom: 8 },
  chips: { gap: 8, paddingBottom: 4 },
  printLink: { color: BRAND.gold, fontWeight: "700", marginVertical: 14 },
  empty: { textAlign: "center", marginTop: 30 },
  card: { borderRadius: 16, padding: 14, marginBottom: 10 },
  category: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  name: { fontSize: 16, fontWeight: "800", marginTop: 2, marginBottom: 6 },
  line: { fontSize: 13, lineHeight: 19 },
  lineLabel: { color: BRAND.gold, fontWeight: "700" },
});
