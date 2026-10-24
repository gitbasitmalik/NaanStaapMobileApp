import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, BRAND } from "../../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { FadeInView, SlideInView } from "../../components/AnimatedComponents";
import { BrandButton, BrandInput, Logo, ScriptText } from "../../components/ui";
import { lightHaptic, successHaptic, errorHaptic } from "../../utils/haptics";
import { referralAPI } from "../../services/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mirrors validatePhone / validatePassword in backend/server.js.
const PHONE_RE = /^\+?[\d\s-]{10,}$/;
const PASSWORD_ALLOWED_RE = /^[a-zA-Z\d@$!%*?&]*$/;

const passwordChecks = (pw: string) => [
  { label: "8+ characters", ok: pw.length >= 8 },
  { label: "Uppercase letter", ok: /[A-Z]/.test(pw) },
  { label: "Lowercase letter", ok: /[a-z]/.test(pw) },
  { label: "Number", ok: /\d/.test(pw) },
];

const passwordError = (pw: string): string | undefined => {
  if (!pw) return "Please choose a password";
  if (!PASSWORD_ALLOWED_RE.test(pw))
    return "Use letters, numbers and these symbols only: @ $ ! % * ? &";
  if (passwordChecks(pw).some((c) => !c.ok))
    return "Password needs 8+ characters with an uppercase letter, a lowercase letter and a number";
  return undefined;
};

type Field = "name" | "email" | "phone" | "password" | "confirmPassword" | "referralCode";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const { colors } = useTheme();
  const register = useAuthStore((s) => s.register);

  const [form, setForm] = useState<Record<Field, string>>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    referralCode: typeof ref === "string" ? ref.toUpperCase() : "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showReferral, setShowReferral] = useState(!!ref);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const update = (key: Field, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const validate = () => {
    const next: Partial<Record<Field, string>> = {};
    const name = form.name.trim();
    if (!name) next.name = "Please enter your name";
    else if (name.length < 2) next.name = "Name must be at least 2 characters";

    const email = form.email.trim();
    if (!email) next.email = "Please enter your email address";
    else if (!EMAIL_RE.test(email)) next.email = "That doesn't look like a valid email";

    const phone = form.phone.trim();
    if (phone && !PHONE_RE.test(phone))
      next.phone = "Enter a valid phone number (at least 10 digits, e.g. 07700 900123)";

    const pwErr = passwordError(form.password);
    if (pwErr) next.password = pwErr;

    if (!form.confirmPassword) next.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword) next.confirmPassword = "Passwords don't match";

    const code = form.referralCode.trim();
    if (code && !/^[A-Za-z0-9]{4,20}$/.test(code))
      next.referralCode = "Referral codes are letters and numbers only";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async () => {
    setFormError(null);
    if (!validate()) {
      errorHaptic();
      return;
    }
    lightHaptic();
    setSubmitting(true);
    const code = form.referralCode.trim().toUpperCase();
    if (code) {
      try {
        await referralAPI.validate(code);
      } catch (err: any) {
        // Only block on a definite "not found"; network hiccups fall through to sign-up.
        if (err?.response?.status === 404) {
          setSubmitting(false);
          errorHaptic();
          setErrors((e) => ({ ...e, referralCode: "We couldn't find that referral code" }));
          return;
        }
      }
    }
    const ok = await register({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      phone: form.phone.trim(),
      referral_code: code || undefined,
    });
    setSubmitting(false);
    if (ok) {
      successHaptic();
      leave();
    } else {
      errorHaptic();
      setFormError(useAuthStore.getState().error || "We couldn't create your account. Please try again.");
    }
  };

  const checks = passwordChecks(form.password);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FadeInView style={styles.topBar}>
          <TouchableOpacity onPress={leave} hitSlop={10} style={styles.close} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
        </FadeInView>

        <SlideInView direction="bottom" delay={80} style={styles.brand}>
          <Logo width={130} />
          <ScriptText style={styles.script}>Join the family</ScriptText>
          <Text style={[styles.title, { color: colors.secondary }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Earn points on every order and get member-only deals.
          </Text>
        </SlideInView>

        <SlideInView direction="bottom" delay={160}>
          {formError ? (
            <View style={[styles.banner, { borderColor: colors.error }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.bannerText, { color: colors.text }]}>{formError}</Text>
            </View>
          ) : null}

          <BrandInput
            label="Full name"
            icon="person-outline"
            placeholder="Your name"
            value={form.name}
            onChangeText={(t) => update("name", t)}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            error={errors.name}
          />
          <BrandInput
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={(t) => update("email", t)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            error={errors.email}
          />
          <BrandInput
            label="Mobile number (optional)"
            icon="call-outline"
            placeholder="07700 900123"
            value={form.phone}
            onChangeText={(t) => update("phone", t)}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={errors.phone}
          />

          <View>
            <BrandInput
              label="Password"
              icon="lock-closed-outline"
              placeholder="Create a password"
              value={form.password}
              onChangeText={(t) => update("password", t)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              error={errors.password}
              style={{ paddingRight: 36 }}
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
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Letters, numbers and @ $ ! % * ? & only.
          </Text>

          <BrandInput
            label="Confirm password"
            icon="lock-closed-outline"
            placeholder="Type it again"
            value={form.confirmPassword}
            onChangeText={(t) => update("confirmPassword", t)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.confirmPassword}
          />

          {showReferral ? (
            <BrandInput
              label="Referral code (optional)"
              icon="gift-outline"
              placeholder="e.g. NAANAB12CD"
              value={form.referralCode}
              onChangeText={(t) => update("referralCode", t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              error={errors.referralCode}
            />
          ) : (
            <TouchableOpacity onPress={() => setShowReferral(true)} style={styles.referralToggle} hitSlop={8}>
              <Ionicons name="gift-outline" size={16} color={BRAND.gold} />
              <Text style={styles.referralToggleText}>Have a referral code?</Text>
            </TouchableOpacity>
          )}

          <BrandButton
            title="Create account"
            icon="person-add-outline"
            onPress={handleRegister}
            loading={submitting}
            style={styles.cta}
          />

          <Text style={[styles.terms, { color: colors.textMuted }]}>
            By creating an account you agree to the Naan Staap{" "}
            <Text style={styles.termsLink} onPress={() => Linking.openURL("https://naanstaap.co.uk")}>
              terms and privacy policy
            </Text>
            .
          </Text>

          <View style={styles.switchRow}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/auth/login")} hitSlop={8}>
              <Text style={styles.link}>Sign in</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={leave} style={styles.guest} hitSlop={8}>
            <Text style={[styles.guestText, { color: colors.textSecondary }]}>Continue as guest</Text>
          </TouchableOpacity>
        </SlideInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  topBar: { flexDirection: "row", justifyContent: "flex-end" },
  close: { padding: 6 },
  brand: { alignItems: "center", marginBottom: 20 },
  script: { marginTop: 10, fontSize: 26 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 6, maxWidth: 300 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    backgroundColor: "rgba(255,107,107,0.12)",
  },
  bannerText: { flex: 1, fontSize: 14 },
  eye: { position: "absolute", right: 14, top: 36 },
  checks: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: -6, marginBottom: 4 },
  check: { flexDirection: "row", alignItems: "center", gap: 4 },
  checkText: { fontSize: 12 },
  hint: { fontSize: 12, marginBottom: 14 },
  referralToggle: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18, alignSelf: "flex-start" },
  referralToggleText: { color: BRAND.gold, fontSize: 14, fontWeight: "700" },
  cta: { marginTop: 4 },
  terms: { fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 14 },
  termsLink: { color: BRAND.gold, fontWeight: "600", textDecorationLine: "underline" },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  link: { color: BRAND.orange, fontSize: 14, fontWeight: "700" },
  guest: { alignSelf: "center", marginTop: 16, padding: 6 },
  guestText: { fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});
