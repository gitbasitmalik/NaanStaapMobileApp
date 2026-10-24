import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND, FONTS } from "../../theme/ThemeContext";
import { BrandButton, BrandInput, Card, Chip, ScreenHeader } from "../../components/ui";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";
import { INFO_PAGES, InfoPage } from "../../data/siteContent";
import { enquiriesAPI, apiErrorMessage } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { successHaptic, errorHaptic } from "../../utils/haptics";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InfoScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const page = INFO_PAGES[String(slug)];

  if (!page) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Not found" />
        <EmptyState
          icon="help-circle-outline"
          title="Page not found"
          message="This page doesn't exist any more."
          actionLabel="Go home"
          onAction={() => router.replace("/")}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title={page.title} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image source={{ uri: page.image }} style={styles.image} />
        <View style={styles.body}>
          <Text style={styles.script}>{page.script}</Text>
          <Text style={[styles.intro, { color: colors.text }]}>{page.intro}</Text>

          {page.quote && (
            <View style={styles.quote}>
              <Ionicons name="chatbubble-ellipses" size={20} color={BRAND.purpleDeep} />
              <Text style={styles.quoteText}>&ldquo;{page.quote}&rdquo;</Text>
            </View>
          )}

          {page.sections?.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.heading}>{section.heading}</Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{section.body}</Text>
            </View>
          ))}

          {page.bullets && (
            <View style={styles.section}>
              <Text style={styles.heading}>{page.bullets.heading}</Text>
              {page.bullets.items.map((item) => (
                <View key={item} style={styles.bullet}>
                  <Ionicons name="checkmark-circle" size={20} color={BRAND.lime} />
                  <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {page.cta && (
            <BrandButton
              title={page.cta.label}
              icon="arrow-forward"
              onPress={() => router.push(page.cta!.route as any)}
              style={styles.section}
            />
          )}

          {page.enquiry && <EnquiryForm enquiry={page.enquiry} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EnquiryForm({ enquiry }: { enquiry: NonNullable<InfoPage["enquiry"]> }) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Please enter your name";
    if (!EMAIL_PATTERN.test(email.trim())) next.email = "Please enter a valid email";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Please enter a valid phone number";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      errorHaptic();
      return;
    }
    setSubmitting(true);
    try {
      await enquiriesAPI.submit({
        type: enquiry.type,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
        details,
      });
      successHaptic();
      setSent(true);
    } catch (error) {
      errorHaptic();
      showToast({ message: apiErrorMessage(error), type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <Card style={styles.formCard}>
        <Ionicons name="checkmark-circle" size={44} color={BRAND.lime} style={styles.center} />
        <Text style={[styles.formTitle, styles.centerText]}>Thank you!</Text>
        <Text style={[styles.paragraph, styles.centerText, { color: colors.textSecondary }]}>
          We&apos;ve received your details and our team will be in touch shortly.
        </Text>
      </Card>
    );
  }

  return (
    <Card style={styles.formCard}>
      <Text style={styles.formTitle}>{enquiry.heading}</Text>
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
      <BrandInput
        label="Phone *"
        icon="call-outline"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        error={errors.phone}
      />
      {enquiry.fields.map((field) => (
        <BrandInput
          key={field.key}
          label={field.label}
          value={details[field.key] || ""}
          keyboardType={field.keyboard || "default"}
          onChangeText={(value) => setDetails((d) => ({ ...d, [field.key]: value }))}
        />
      ))}
      {enquiry.options && (
        <View style={styles.optionsBlock}>
          <Text style={[styles.optionsLabel, { color: colors.textSecondary }]}>{enquiry.options.label}</Text>
          <View style={styles.optionsRow}>
            {enquiry.options.values.map((value) => (
              <Chip
                key={value}
                label={value}
                active={details[enquiry.options!.key] === value}
                onPress={() => setDetails((d) => ({ ...d, [enquiry.options!.key]: value }))}
              />
            ))}
          </View>
        </View>
      )}
      <BrandInput label="Message" value={message} onChangeText={setMessage} multiline maxLength={1000} />
      {enquiry.note && (
        <Text style={[styles.note, { color: colors.textMuted }]}>{enquiry.note}</Text>
      )}
      <BrandButton title="Send" icon="send" loading={submitting} onPress={submit} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  image: { width: "100%", height: 240 },
  body: { padding: 20 },
  script: { fontFamily: FONTS.script, fontSize: 28, color: BRAND.orange },
  intro: { fontSize: 17, lineHeight: 26, fontWeight: "600", marginTop: 4 },
  quote: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: BRAND.gold,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  quoteText: { flex: 1, color: BRAND.purpleDeep, fontSize: 15, fontWeight: "700", fontStyle: "italic" },
  section: { marginTop: 24 },
  heading: { color: BRAND.gold, fontSize: 20, fontWeight: "900", marginBottom: 8 },
  paragraph: { fontSize: 15, lineHeight: 23 },
  bullet: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 10 },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 21 },
  formCard: { marginTop: 28 },
  formTitle: { color: BRAND.gold, fontSize: 20, fontWeight: "900", marginBottom: 14 },
  optionsBlock: { marginBottom: 14 },
  optionsLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  note: { fontSize: 12, lineHeight: 18, marginBottom: 14 },
  center: { alignSelf: "center" },
  centerText: { textAlign: "center", marginTop: 8 },
});
