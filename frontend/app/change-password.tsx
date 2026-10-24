import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND } from "../theme/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { BrandButton, BrandInput, Card, ScreenHeader } from "../components/ui";
import { errorHaptic, successHaptic } from "../utils/haptics";

// Mirrors validatePassword in backend/server.js.
const PASSWORD_ALLOWED_RE = /^[a-zA-Z\d@$!%*?&]*$/;
const passwordChecks = (pw: string) => [
  { label: "8+ characters", ok: pw.length >= 8 },
  { label: "Uppercase letter", ok: /[A-Z]/.test(pw) },
  { label: "Lowercase letter", ok: /[a-z]/.test(pw) },
  { label: "Number", ok: /\d/.test(pw) },
];

type Field = "current" | "next" | "confirm";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { isAuthenticated, changePassword, logout } = useAuthStore();

  const [values, setValues] = useState<Record<Field, string>>({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Change password" />
        <EmptyState
          icon="lock-closed-outline"
          title="Sign in first"
          message="Sign in to change your account password."
          actionLabel="Sign in"
          onAction={() => router.push("/auth/login")}
        />
      </View>
    );
  }

  const set = (key: Field, v: string) => {
    setValues((s) => ({ ...s, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<Field, string>> = {};
    if (!values.current) e.current = "Enter your current password";
    if (!values.next) e.next = "Choose a new password";
    else if (!PASSWORD_ALLOWED_RE.test(values.next))
      e.next = "Use letters, numbers and these symbols only: @ $ ! % * ? &";
    else if (passwordChecks(values.next).some((c) => !c.ok))
      e.next = "Needs 8+ characters with an uppercase letter, a lowercase letter and a number";
    else if (values.next === values.current) e.next = "Your new password must be different";
    if (!values.confirm) e.confirm = "Confirm your new password";
    else if (values.confirm !== values.next) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      errorHaptic();
      return;
    }
    setSaving(true);
    const ok = await changePassword(values.current, values.next);
    if (!ok) {
      setSaving(false);
      errorHaptic();
      const message = useAuthStore.getState().error || "Couldn't change your password";
      if (/current password/i.test(message)) setErrors({ current: message });
      showToast({ message, type: "error" });
      return;
    }
    // The API signs every device out after a password change, so start a fresh session.
    await logout();
    setSaving(false);
    successHaptic();
    showToast({ message: "Password changed. Please sign in with your new password.", type: "success" });
    router.replace("/auth/login");
  };

  const eye = (
    <TouchableOpacity
      onPress={() => setShow((v) => !v)}
      hitSlop={10}
      accessibilityLabel={show ? "Hide passwords" : "Show passwords"}
      style={styles.showToggle}
    >
      <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={18} color={BRAND.gold} />
      <Text style={styles.showToggleText}>{show ? "Hide" : "Show"} passwords</Text>
    </TouchableOpacity>
  );

  const checks = passwordChecks(values.next);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title="Change password" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <BrandInput
            label="Current password"
            icon="lock-closed-outline"
            value={values.current}
            onChangeText={(t) => set("current", t)}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            error={errors.current}
          />
          <BrandInput
            label="New password"
            icon="key-outline"
            value={values.next}
            onChangeText={(t) => set("next", t)}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.next}
          />
          <View style={styles.checks}>
            {checks.map((c) => (
              <View key={c.label} style={styles.check}>
                <Ionicons
                  name={c.ok ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={c.ok ? colors.success : colors.textMuted}
                />
                <Text style={[styles.checkText, { color: c.ok ? colors.text : colors.textMuted }]}>
                  {c.label}
                </Text>
              </View>
            ))}
          </View>
          <BrandInput
            label="Confirm new password"
            icon="key-outline"
            value={values.confirm}
            onChangeText={(t) => set("confirm", t)}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.confirm}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          {eye}
        </Card>

        <Text style={[styles.note, { color: colors.textMuted }]}>
          For your security you’ll be signed out on all devices and asked to sign in again with
          your new password.
        </Text>

        <BrandButton title="Update password" icon="checkmark" onPress={handleSave} loading={saving} style={styles.save} />

        <TouchableOpacity onPress={() => router.push("/contact")} style={styles.forgot} hitSlop={8}>
          <Text style={[styles.forgotText, { color: colors.textMuted }]}>
            Forgotten your current password?{" "}
            <Text style={{ color: BRAND.gold, fontWeight: "700" }}>Contact your store</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { padding: 18 },
  checks: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: -6, marginBottom: 14 },
  check: { flexDirection: "row", alignItems: "center", gap: 4 },
  checkText: { fontSize: 12 },
  showToggle: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  showToggleText: { color: BRAND.gold, fontSize: 13, fontWeight: "700" },
  note: { fontSize: 12, lineHeight: 18, marginTop: 14, paddingHorizontal: 4 },
  save: { marginTop: 18 },
  forgot: { alignSelf: "center", marginTop: 18, padding: 6 },
  forgotText: { fontSize: 13 },
});
