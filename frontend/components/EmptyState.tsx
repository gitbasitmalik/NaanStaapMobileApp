import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

const BRAND_PURPLE = "#6B2C5F";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Bounce animation
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    bounce.start();

    return () => bounce.stop();
  }, [bounceAnim, fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.surfaceLight,
            transform: [{ translateY: bounceAnim }],
          },
        ]}
      >
        <Ionicons name={icon} size={60} color={colors.textMuted} />
      </Animated.View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>
        {message}
      </Text>
      {action && <View style={styles.actionContainer}>{action}</View>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  text?: string;
}

export function LoadingSpinner({
  size = 40,
  color,
  text,
}: LoadingSpinnerProps) {
  const { colors } = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    );

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    spin.start();
    pulse.start();

    return () => {
      spin.stop();
      pulse.stop();
    };
  }, [spinAnim, pulseAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.loadingContainer}>
      <Animated.View
        style={{
          transform: [{ rotate: spin }, { scale: pulseAnim }],
        }}
      >
        <View
          style={[
            styles.spinner,
            {
              width: size,
              height: size,
              borderColor: colors.surfaceLight,
              borderTopColor: color || colors.secondary,
            },
          ]}
        />
      </Animated.View>
      {text && (
        <Animated.Text
          style={[
            styles.loadingText,
            { color: colors.textSecondary, opacity: pulseAnim },
          ]}
        >
          {text}
        </Animated.Text>
      )}
    </View>
  );
}

interface SuccessAnimationProps {
  onComplete?: () => void;
}

export function SuccessAnimation({ onComplete }: SuccessAnimationProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 6,
      }),
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => onComplete?.(), 500);
    });
  }, [scaleAnim, checkAnim, onComplete]);

  return (
    <Animated.View
      style={[
        styles.successContainer,
        {
          transform: [{ scale: scaleAnim }],
          backgroundColor: colors.success,
        },
      ]}
    >
      <Animated.View style={{ opacity: checkAnim }}>
        <Ionicons name="checkmark" size={50} color="#FFF" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  actionContainer: {
    marginTop: 24,
  },
  actionButton: {
    marginTop: 24,
    backgroundColor: BRAND_PURPLE,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  spinner: {
    borderWidth: 3,
    borderRadius: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  successContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
});
