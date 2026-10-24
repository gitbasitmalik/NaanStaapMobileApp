import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, BRAND } from "../../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { FadeInView, SlideInView } from "../../components/AnimatedComponents";
import { BrandButton, BrandInput, Logo, ScriptText } from "../../components/ui";
import { lightHaptic, successHaptic, errorHaptic } from "../../utils/haptics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Please enter your email address";
    else if (!EMAIL_RE.test(email.trim())) next.email = "That doesn't look like a valid email";
    if (!password) next.password = "Please enter your password";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    setFormError(null);
    if (!validate()) {
      errorHaptic();
      return;
    }
    lightHaptic();
    setSubmitting(true);
    const ok = await login(email.trim().toLowerCase(), password);
    setSubmitting(false);
    if (ok) {
      successHaptic();
      leave();
    } else {
      errorHaptic();
      setFormError(useAuthStore.getState().error || "Sign in failed. Please try again.");
    }
  };

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
          <TouchableOpacity
            onPress={leave}
            hitSlop={10}
            style={styles.close}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
        </FadeInView>

        <SlideInView direction="bottom" delay={80} style={styles.brand}>
          <Logo width={150} />
          <ScriptText style={styles.script}>Welcome back</ScriptText>
          <Text style={[styles.title, { color: colors.secondary }]}>Sign in</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Track your orders, collect loyalty points and reorder your favourites.
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
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            error={errors.email}
          />

          <View>
            <BrandInput
              label="Password"
              icon="lock-closed-outline"
              placeholder="Your password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
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

          <TouchableOpacity
            onPress={() => router.push("/contact")}
            style={styles.forgot}
            hitSlop={8}
          >
            <Text style={[styles.forgotText, { color: colors.textMuted }]}>
              Forgotten your password?{" "}
              <Text style={{ color: BRAND.gold, fontWeight: "700" }}>Contact your store</Text>
            </Text>
          </TouchableOpacity>

          <BrandButton
            title="Sign in"
            icon="log-in-outline"
            onPress={handleLogin}
            loading={submitting}
            style={styles.cta}
          />

          <View style={styles.switchRow}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>New to Naan Staap? </Text>
            <TouchableOpacity onPress={() => router.replace("/auth/register")} hitSlop={8}>
              <Text style={styles.link}>Create an account</Text>
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
  brand: { alignItems: "center", marginBottom: 24 },
  script: { marginTop: 12, fontSize: 26 },
  title: { fontSize: 30, fontWeight: "800" },
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
  forgot: { alignSelf: "flex-end", marginBottom: 20 },
  forgotText: { fontSize: 13 },
  cta: { marginTop: 4 },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  link: { color: BRAND.orange, fontSize: 14, fontWeight: "700" },
  guest: { alignSelf: "center", marginTop: 18, padding: 6 },
  guestText: { fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});
