import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { AnimatedButton } from "./AnimatedComponents";
import { lightHaptic, successHaptic, errorHaptic } from "../utils/haptics";

const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (review: {
    overall_rating: number;
    food_rating?: number;
    delivery_rating?: number;
    comment?: string;
    would_recommend?: boolean;
  }) => Promise<boolean>;
  orderType?: "delivery" | "pickup" | "dine-in";
}

export function ReviewModal({
  visible,
  onClose,
  onSubmit,
  orderType = "delivery",
}: ReviewModalProps) {
  const { colors } = useTheme();
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
      Alert.alert("Rating Required", "Please select an overall rating");
      return;
    }

    setSubmitting(true);
    const success = await onSubmit({
      overall_rating: overallRating,
      food_rating: foodRating > 0 ? foodRating : undefined,
      delivery_rating: deliveryRating > 0 ? deliveryRating : undefined,
      comment: comment.trim() || undefined,
      would_recommend: wouldRecommend ?? undefined,
    });
    setSubmitting(false);

    if (success) {
      successHaptic();
      resetForm();
      onClose();
      Alert.alert("Thank You!", "Your review has been submitted.");
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const StarRating = ({
    rating,
    setRating,
    label,
    size = 32,
  }: {
    rating: number;
    setRating: (r: number) => void;
    label: string;
    size?: number;
  }) => (
    <View style={styles.ratingSection}>
      <Text style={[styles.ratingLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => {
              lightHaptic();
              setRating(star);
            }}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={size}
              color={star <= rating ? BRAND_GOLD : colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={[styles.ratingText, { color: colors.textMuted }]}>
          {rating === 5
            ? "Excellent!"
            : rating === 4
            ? "Very Good"
            : rating === 3
            ? "Good"
            : rating === 2
            ? "Fair"
            : "Poor"}
        </Text>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={[styles.cancelButton, { color: colors.textMuted }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Rate Your Order
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Overall Rating */}
          <View style={[styles.mainRating, { backgroundColor: colors.card }]}>
            <Text style={[styles.mainRatingTitle, { color: colors.text }]}>
              How was your experience?
            </Text>
            <StarRating
              rating={overallRating}
              setRating={setOverallRating}
              label=""
              size={42}
            />
          </View>

          {/* Additional Ratings */}
          <View style={styles.additionalRatings}>
            <StarRating
              rating={foodRating}
              setRating={setFoodRating}
              label="Food Quality"
              size={28}
            />

            {orderType === "delivery" && (
              <StarRating
                rating={deliveryRating}
                setRating={setDeliveryRating}
                label="Delivery Experience"
                size={28}
              />
            )}
          </View>

          {/* Comment */}
          <View style={styles.commentSection}>
            <Text style={[styles.commentLabel, { color: colors.text }]}>
              Share your thoughts (optional)
            </Text>
            <TextInput
              style={[
                styles.commentInput,
                { backgroundColor: colors.card, color: colors.text },
              ]}
              placeholder="What did you like or what can we improve?"
              placeholderTextColor={colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Would Recommend */}
          <View style={styles.recommendSection}>
            <Text style={[styles.recommendLabel, { color: colors.text }]}>
              Would you recommend us to a friend?
            </Text>
            <View style={styles.recommendButtons}>
              <TouchableOpacity
                style={[
                  styles.recommendButton,
                  { borderColor: colors.border },
                  wouldRecommend === true && styles.recommendButtonYes,
                ]}
                onPress={() => {
                  lightHaptic();
                  setWouldRecommend(true);
                }}
              >
                <Ionicons
                  name="thumbs-up"
                  size={24}
                  color={wouldRecommend === true ? "#fff" : "#27AE60"}
                />
                <Text
                  style={[
                    styles.recommendButtonText,
                    {
                      color: wouldRecommend === true ? "#fff" : colors.text,
                    },
                  ]}
                >
                  Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.recommendButton,
                  { borderColor: colors.border },
                  wouldRecommend === false && styles.recommendButtonNo,
                ]}
                onPress={() => {
                  lightHaptic();
                  setWouldRecommend(false);
                }}
              >
                <Ionicons
                  name="thumbs-down"
                  size={24}
                  color={wouldRecommend === false ? "#fff" : "#E74C3C"}
                />
                <Text
                  style={[
                    styles.recommendButtonText,
                    {
                      color: wouldRecommend === false ? "#fff" : colors.text,
                    },
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <AnimatedButton
            style={
              [
                styles.submitButton,
                (submitting || overallRating === 0) &&
                  styles.submitButtonDisabled,
              ] as any
            }
            onPress={handleSubmit}
            disabled={submitting || overallRating === 0}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </>
            )}
          </AnimatedButton>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cancelButton: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  mainRating: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  mainRatingTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  additionalRatings: {
    marginBottom: 24,
  },
  ratingSection: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    marginTop: 4,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  commentInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  recommendSection: {
    marginBottom: 24,
  },
  recommendLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  recommendButtons: {
    flexDirection: "row",
    gap: 12,
  },
  recommendButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  recommendButtonYes: {
    backgroundColor: "#27AE60",
    borderColor: "#27AE60",
  },
  recommendButtonNo: {
    backgroundColor: "#E74C3C",
    borderColor: "#E74C3C",
  },
  recommendButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    backgroundColor: BRAND_PURPLE,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
