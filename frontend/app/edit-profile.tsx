import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { BrandButton, BrandInput, Card, ScreenHeader } from "../components/ui";
import { errorHaptic, successHaptic } from "../utils/haptics";

// Same rule as validatePhone in backend/server.js.
const PHONE_RE = /^\+?[\d\s-]{10,}$/;

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user, isAuthenticated, updateProfile } = useAuthStore();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);

  // Fill the form once the profile arrives (e.g. after a cold start).
  useEffect(() => {
    if (user) {
      setName((n) => n || user.name || "");
      setPhone((p) => p || user.phone || "");
    }
  }, [user]);

  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Edit profile" />
        <EmptyState
          icon="person-outline"
          title="Sign in to edit your profile"
          message="Your name and phone number are used for your orders and bookings."
          actionLabel="Sign in"
          onAction={() => router.push("/auth/login")}
        />
      </View>
    );
  }

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const dirty = trimmedName !== (user.name ?? "") || trimmedPhone !== (user.phone ?? "");

  const validate = () => {
    const next: { name?: string; phone?: string } = {};
    if (!trimmedName) next.name = "Please enter your name";
    else if (trimmedName.length < 2) next.name = "Name must be at least 2 characters";
    if (trimmedPhone && !PHONE_RE.test(trimmedPhone))
      next.phone = "Enter a valid phone number (at least 10 digits, e.g. 07700 900123)";
    else if (!trimmedPhone && user.phone)
      next.phone = "Phone number can't be removed, only changed";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      errorHaptic();
      return;
    }
    setSaving(true);
    const payload: { name?: string; phone?: string } = {};
    if (trimmedName !== user.name) payload.name = trimmedName;
    if (trimmedPhone && trimmedPhone !== user.phone) payload.phone = trimmedPhone;
    const ok = await updateProfile(payload);
    setSaving(false);
    if (ok) {
      successHaptic();
      showToast({ message: "Profile updated", type: "success" });
      if (router.canGoBack()) router.back();
    } else {
      errorHaptic();
      showToast({
        message: useAuthStore.getState().error || "Couldn't update your profile",
        type: "error",
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title="Edit profile" subtitle="Your contact details" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <BrandInput
            label="Full name"
            icon="person-outline"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
            }}
            placeholder="Your name"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            error={errors.name}
          />
          <BrandInput
            label="Mobile number"
            icon="call-outline"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
            }}
            placeholder="07700 900123"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={errors.phone}
          />
          <BrandInput
            label="Email"
            icon="mail-outline"
            value={user.email}
            editable={false}
            selectTextOnFocus={false}
            style={{ color: colors.textMuted }}
            containerStyle={{ marginBottom: 6 }}
          />
          <Text style={[styles.note, { color: colors.textMuted }]}>
            Your email is your sign-in and can’t be changed in the app. Contact your store if it needs
            updating.
          </Text>
        </Card>

        <BrandButton
          title="Save changes"
          icon="checkmark"
          onPress={handleSave}
          loading={saving}
          disabled={!dirty}
          style={styles.save}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { padding: 18 },
  note: { fontSize: 12, lineHeight: 17 },
  save: { marginTop: 20 },
});
