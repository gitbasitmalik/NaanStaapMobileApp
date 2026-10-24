import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND, FONTS } from "../../theme/ThemeContext";
import { ScreenHeader } from "../../components/ui";
import { KNOW_YOUR_CUP } from "../../data/siteContent";
import { lightHaptic } from "../../utils/haptics";

type Cup = (typeof KNOW_YOUR_CUP.cups)[number];

const { width } = Dimensions.get("window");
const CARD = (width - 16 * 2 - 12) / 2;

export default function KnowYourCupScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<Cup | null>(null);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Know your cup" subtitle={`${KNOW_YOUR_CUP.cups.length} designs`} />
      <FlatList
        data={KNOW_YOUR_CUP.cups}
        keyExtractor={(cup) => cup.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 30 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.script}>Collect them all</Text>
            <Text style={[styles.intro, { color: colors.textSecondary }]}>{KNOW_YOUR_CUP.intro}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={() => {
              lightHaptic();
              setSelected(item);
            }}
          >
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.story ? (
              <Text style={styles.cardStory}>Read the story</Text>
            ) : null}
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          {selected && (
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <TouchableOpacity style={styles.close} onPress={() => setSelected(null)} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
              <Image source={{ uri: selected.image }} style={styles.sheetImage} />
              <Text style={styles.sheetTitle}>{selected.title || selected.name}</Text>
              <Text style={[styles.sheetStory, { color: colors.textSecondary }]}>
                {selected.story || "Pick one up with your next chai at any Naan Staap store."}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16 },
  row: { gap: 12 },
  header: { marginBottom: 16 },
  script: { fontFamily: FONTS.script, fontSize: 26, color: BRAND.orange },
  intro: { fontSize: 15, lineHeight: 22 },
  card: { width: CARD, borderRadius: 18, overflow: "hidden", marginBottom: 12, paddingBottom: 12 },
  cardImage: { width: CARD, height: CARD, backgroundColor: "#FFFFFF" },
  cardName: { fontSize: 14, fontWeight: "800", marginTop: 10, marginHorizontal: 12 },
  cardStory: { fontSize: 12, color: BRAND.gold, fontWeight: "700", marginTop: 2, marginHorizontal: 12 },
  overlay: { flex: 1, justifyContent: "center", padding: 20 },
  sheet: { borderRadius: 24, padding: 20, alignItems: "center" },
  close: { position: "absolute", top: 12, right: 12, padding: 6, zIndex: 2 },
  sheetImage: { width: 220, height: 220, borderRadius: 16, backgroundColor: "#FFFFFF" },
  sheetTitle: { color: BRAND.gold, fontSize: 22, fontWeight: "900", marginTop: 16, textAlign: "center" },
  sheetStory: { fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: "center" },
});
