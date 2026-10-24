import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND } from "../theme/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { authAPI, apiErrorMessage } from "../services/api";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { BrandButton, BrandInput, Card, ListRow, ScreenHeader, SectionHeading } from "../components/ui";
import { errorHaptic, warningHaptic } from "../utils/haptics";

const WEBSITE = "https://naanstaap.co.uk";

type IconName = keyof typeof Ionicons.glyphMap;

const PRIVACY_POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "person-outline",
    title: "What we keep",
    body: "Your name, email, phone number, saved addresses, orders, bookings, reviews and loyalty points.",
  },
  {
    icon: "restaurant-outline",
    title: "Why we keep it",
    body: "To prepare and deliver your orders, run your loyalty account and, if you opt in, send you offers.",
  },
  {
    icon: "lock-closed-outline",
    title: "How it's protected",
    body: "Your password is stored securely hashed, and the app never stores card details.",
  },
  {
    icon: "options-outline",
    title: "Your choices",
    body: "Update your details or marketing preferences at any time, or delete your account below.",
  },
];

export default function AccountPrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { isAuthenticated, logout } = useAuthStore();

  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openWebsite = async () => {
    try {
      await Linking.openURL(WEBSITE);
    } catch {
      showToast({ message: "Couldn't open naanstaap.co.uk", type: "error" });
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await authAPI.deleteAccount(password);
      await logout();
      showToast({ message: "Your account has been deleted", type: "success" });
      router.replace("/");
    } catch (err: any) {
      errorHaptic();
      const message = apiErrorMessage(err, "Couldn't delete your account. Please try again.");
      if (err?.response?.status === 401 || err?.response?.status === 400) setError(message);
      showToast({ message, type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    if (!password) {
      setError("Enter your password to confirm");
      errorHaptic();
      return;
    }
    warningHaptic();
    Alert.alert(
      "Delete your account?",
      "Your personal details will be removed and your loyalty points lost. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: doDelete },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title="Privacy & account" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeading title="Your privacy" script="We respect your data" />
        <Card style={styles.card}>
          {PRIVACY_POINTS.map((p, i) => (
            <View
              key={p.title}
              style={[
                styles.point,
                i < PRIVACY_POINTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.pointIcon}>
                <Ionicons name={p.icon} size={18} color={BRAND.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pointTitle, { color: colors.text }]}>{p.title}</Text>
                <Text style={[styles.pointBody, { color: colors.textSecondary }]}>{p.body}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Card style={[styles.card, styles.linksCard]}>
          <ListRow
            icon="globe-outline"
            label="Full privacy policy"
            subtitle="naanstaap.co.uk"
            onPress={openWebsite}
            right={<Ionicons name="open-outline" size={18} color={colors.textMuted} />}
          />
          <ListRow
            icon="chatbubbles-outline"
            label="Questions about your data?"
            subtitle="Get in touch with your store"
            onPress={() => router.push("/contact")}
          />
          {isAuthenticated ? (
            <ListRow
              icon="notifications-outline"
              label="Marketing preferences"
              subtitle="Choose which messages you receive"
              onPress={() => router.push("/notifications")}
            />
          ) : null}
        </Card>

        {isAuthenticated ? (
          <>
            <SectionHeading title="Delete account" style={styles.heading} />
            <Card style={[styles.card, { borderColor: "rgba(255,107,107,0.4)" }]}>
              <Text style={[styles.dangerText, { color: colors.textSecondary }]}>
                Deleting your account removes your name, email and phone number from your profile and
                signs you out on every device. Any unused loyalty points will be lost.
              </Text>
              {showDelete ? (
                <>
                  <View>
                    <BrandInput
                      label="Confirm with your password"
                      icon="lock-closed-outline"
                      placeholder="Your password"
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        if (error) setError(null);
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="current-password"
                      textContentType="password"
                      error={error}
                      style={{ paddingRight: 36 }}
                      containerStyle={{ marginTop: 14 }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      style={styles.eye}
                      hitSlop={10}
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  <BrandButton
                    title="Delete my account"
                    icon="trash-outline"
                    onPress={confirmDelete}
                    loading={deleting}
                    style={{ backgroundColor: colors.error }}
                  />
                  <BrandButton
                    title="Cancel"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setShowDelete(false);
                      setPassword("");
                      setError(null);
                    }}
                    style={{ marginTop: 6 }}
                  />
                </>
              ) : (
                <ListRow
                  icon="trash-outline"
                  label="Delete my account"
                  destructive
                  onPress={() => setShowDelete(true)}
                />
              )}
            </Card>
          </>
        ) : (
          <View style={styles.signedOut}>
            <EmptyState
              icon="shield-checkmark-outline"
              title="Manage your account"
              message="Sign in to change your marketing choices or delete your account."
              actionLabel="Sign in"
              onAction={() => router.push("/auth/login")}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { padding: 16 },
  linksCard: { marginTop: 14, paddingVertical: 2 },
  point: { flexDirection: "row", gap: 12, paddingVertical: 12 },
  pointIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,215,79,0.12)",
  },
  pointTitle: { fontSize: 15, fontWeight: "700" },
  pointBody: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  heading: { marginTop: 26, marginBottom: 10 },
  dangerText: { fontSize: 13, lineHeight: 19 },
  eye: { position: "absolute", right: 14, top: 50 },
  signedOut: { marginTop: 12, minHeight: 320 },
});
