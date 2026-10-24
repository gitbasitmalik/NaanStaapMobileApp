import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND, FONTS } from "../theme/ThemeContext";
import { BrandButton, BrandInput, Card, Chip, ScreenHeader } from "../components/ui";
import { useToast } from "../components/Toast";
import { contactAPI, apiErrorMessage } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { SITE } from "../data/siteContent";
import { errorHaptic, successHaptic } from "../utils/haptics";

const SUBJECTS = ["General enquiry", "Feedback", "An order", "Account help", "Allergies"];

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Please enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Please enter a valid email";
    if (message.trim().length < 5) next.message = "Please tell us a little more";
    setErrors(next);
    if (Object.keys(next).length) {
      errorHaptic();
      return;
    }
    setSending(true);
    try {
      await contactAPI.submit({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        subject,
        message: message.trim(),
      });
      successHaptic();
      setSent(true);
    } catch (error) {
      errorHaptic();
      showToast({ message: apiErrorMessage(error), type: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title="Contact us" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.script}>We&apos;d love to hear from you</Text>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Questions, feedback or a shout-out for the team — drop us a message. For anything about a live
          order, calling the store is quickest.
        </Text>

        <View style={styles.quick}>
          <BrandButton
            title="Email us"
            icon="mail"
            variant="outline"
            size="sm"
            onPress={() => Linking.openURL(`mailto:${SITE.email}`)}
            style={styles.flex}
          />
          <BrandButton
            title="Call a store"
            icon="call"
            variant="outline"
            size="sm"
            onPress={() => router.push("/stores")}
            style={styles.flex}
          />
        </View>

        {sent ? (
          <Card style={styles.card}>
            <Ionicons name="checkmark-circle" size={44} color={BRAND.lime} style={styles.center} />
            <Text style={styles.title}>Message sent</Text>
            <Text style={[styles.intro, styles.centerText, { color: colors.textSecondary }]}>
              Thanks, {name.split(" ")[0]}! We&apos;ll get back to you at {email}.
            </Text>
            <BrandButton title="Back" variant="ghost" onPress={() => router.back()} />
          </Card>
        ) : (
          <Card style={styles.card}>
            <BrandInput label="Name *" icon="person-outline" value={name} onChangeText={setName} error={errors.name} />
            <BrandInput
              label="Email *"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <BrandInput label="Phone" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Subject</Text>
            <View style={styles.chips}>
              {SUBJECTS.map((s) => (
                <Chip key={s} label={s} active={subject === s} onPress={() => setSubject(s)} />
              ))}
            </View>
            <BrandInput
              label="Message *"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={2000}
              error={errors.message}
            />
            <BrandButton title="Send message" icon="send" loading={sending} onPress={send} />
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16 },
  script: { fontFamily: FONTS.script, fontSize: 26, color: BRAND.orange },
  intro: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  quick: { flexDirection: "row", gap: 10, marginTop: 16 },
  card: { marginTop: 20 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  title: { color: BRAND.gold, fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: 8 },
  center: { alignSelf: "center" },
  centerText: { textAlign: "center", marginBottom: 12 },
});
