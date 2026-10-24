import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND, FONTS } from "../theme/ThemeContext";
import { BrandButton } from "./ui";
import { lightHaptic, successHaptic, errorHaptic } from "../utils/haptics";

export interface ReviewSubmission {
  overall_rating: number;
  food_rating?: number;
  delivery_rating?: number;
  comment?: string;
  would_recommend?: boolean;
}

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  /** Resolve true when the review was saved; the modal then resets and closes. */
  onSubmit: (review: ReviewSubmission) => Promise<boolean>;
  orderType?: "delivery" | "pickup" | "dine-in";
  /** e.g. "Order #1042 · Naan Staap Bradford" */
  subtitle?: string;
}

const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent!"];

function StarRating({
  rating,
  onChange,
  label,
  size = 32,
}: {
  rating: number;
  onChange: (r: number) => void;
  label?: string;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.ratingSection}>
      {label ? <Text style={[styles.ratingLabel, { color: colors.text }]}>{label}</Text> : null}
      <View style={[styles.starsRow, !label && { justifyContent: "center" }]}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => {
              lightHaptic();
              onChange(star);
            }}
            style={styles.starButton}
            accessibilityRole="button"
            accessibilityLabel={`${star} star${star > 1 ? "s" : ""}${label ? ` for ${label}` : ""}`}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={size}
              color={star <= rating ? BRAND.gold : colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text
          style={[
            styles.ratingWord,
            { color: colors.textMuted },
            !label && { textAlign: "center" },
          ]}
        >
          {RATING_WORDS[rating]}
        </Text>
      )}
    </View>
  );
}

export function ReviewModal({
  visible,
  onClose,
  onSubmit,
  orderType = "delivery",
  subtitle,
}: ReviewModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [overallRating, setOverallRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setOverallRating(0);
    setFoodRating(0);
    setDeliveryRating(0);
    setComment("");
    setWouldRecommend(null);
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      errorHaptic();
      return;
    }
    setSubmitting(true);
    const ok = await onSubmit({
      overall_rating: overallRating,
      food_rating: foodRating > 0 ? foodRating : undefined,
      delivery_rating: orderType === "delivery" && deliveryRating > 0 ? deliveryRating : undefined,
      comment: comment.trim() || undefined,
      would_recommend: wouldRecommend ?? undefined,
    });
    setSubmitting(false);
    if (ok) {
      successHaptic();
      resetForm();
      onClose();
    }
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const recommendOption = (value: boolean) => {
    const selected = wouldRecommend === value;
    const tint = value ? BRAND.lime : colors.error;
    return (
      <TouchableOpacity
        style={[
          styles.recommendButton,
          { borderColor: selected ? tint : colors.border, backgroundColor: colors.surface },
          selected && { backgroundColor: tint },
        ]}
        onPress={() => {
          lightHaptic();
          setWouldRecommend(value);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <Ionicons
          name={value ? "thumbs-up" : "thumbs-down"}
          size={20}
          color={selected ? BRAND.purpleDeep : tint}
        />
        <Text
          style={[
            styles.recommendText,
            { color: selected ? BRAND.purpleDeep : colors.text },
          ]}
        >
          {value ? "Yes" : "No"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
              paddingTop: Platform.OS === "ios" ? 16 : insets.top + 12,
            },
          ]}
        >
          <TouchableOpacity onPress={handleClose} hitSlop={10} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.title, { color: colors.secondary }]}>Rate your order</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[styles.mainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={styles.script}>Tell us</Text>
            <Text style={[styles.mainTitle, { color: colors.text }]}>How was your meal?</Text>
            <StarRating rating={overallRating} onChange={setOverallRating} size={40} />
            <View style={[styles.bonusPill, { backgroundColor: "rgba(255,215,79,0.12)" }]}>
              <Ionicons name="gift-outline" size={14} color={BRAND.gold} />
              <Text style={[styles.bonusText, { color: BRAND.gold }]}>
                Earn 25 bonus points for your review
              </Text>
            </View>
          </View>

          <View
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <StarRating rating={foodRating} onChange={setFoodRating} label="Food quality" size={28} />
            {orderType === "delivery" && (
              <StarRating
                rating={deliveryRating}
                onChange={setDeliveryRating}
                label="Delivery"
                size={28}
              />
            )}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Anything to add? <Text style={{ color: colors.textMuted }}>(optional)</Text>
          </Text>
          <TextInput
            style={[
              styles.commentInput,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="What did you love, or what could we do better?"
            placeholderTextColor={colors.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Would you recommend Naan Staap to a friend?
          </Text>
          <View style={styles.recommendRow}>
            {recommendOption(true)}
            {recommendOption(false)}
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <BrandButton
            title={overallRating === 0 ? "Choose a star rating" : "Submit review"}
            icon="send"
            onPress={handleSubmit}
            loading={submitting}
            disabled={overallRating === 0}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default ReviewModal;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 2 },
  content: { padding: 20, paddingBottom: 32 },
  mainCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  script: { fontFamily: FONTS.script, fontSize: 24, color: BRAND.orange, marginBottom: -2 },
  mainTitle: { fontSize: 20, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  bonusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  bonusText: { fontSize: 12, fontWeight: "700" },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 20 },
  ratingSection: { marginBottom: 8 },
  ratingLabel: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  starsRow: { flexDirection: "row", gap: 4 },
  starButton: { padding: 4 },
  ratingWord: { fontSize: 13, marginTop: 2, marginBottom: 4 },
  sectionLabel: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  commentInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 110,
    marginBottom: 20,
  },
  recommendRow: { flexDirection: "row", gap: 12 },
  recommendButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  recommendText: { fontSize: 15, fontWeight: "700" },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
