import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TextInputProps,
  ActivityIndicator,
  Image,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BRAND, FONTS, useTheme } from "../theme/ThemeContext";
import { AnimatedButton } from "./AnimatedComponents";

type IconName = keyof typeof Ionicons.glyphMap;

// =====================
// Logo
// =====================

export function Logo({ width = 160 }: { width?: number }) {
  return (
    <Image
      source={require("../assets/images/logo.png")}
      style={{ width, height: width * 0.715 }}
      resizeMode="contain"
      accessibilityLabel="Naan Staap"
    />
  );
}

// =====================
// Buttons
// =====================

interface BrandButtonProps {
  title: string;
  onPress?: () => void;
  icon?: IconName;
  variant?: "primary" | "gold" | "outline" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: "md" | "sm";
}

export function BrandButton({
  title,
  onPress,
  icon,
  variant = "primary",
  loading,
  disabled,
  style,
  size = "md",
}: BrandButtonProps) {
  const bg =
    variant === "primary"
      ? BRAND.orange
      : variant === "gold"
      ? BRAND.gold
      : "transparent";
  const fg =
    variant === "gold"
      ? BRAND.purpleDeep
      : variant === "outline" || variant === "ghost"
      ? BRAND.gold
      : "#FFFFFF";
  const inactive = disabled || loading;

  return (
    <AnimatedButton
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      style={[
        styles.button,
        size === "sm" && styles.buttonSm,
        { backgroundColor: bg },
        variant === "outline" && { borderWidth: 1.5, borderColor: BRAND.gold },
        inactive ? { opacity: 0.6 } : null,
        style as ViewStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === "sm" ? 16 : 20} color={fg} />}
          <Text
            style={[styles.buttonText, size === "sm" && styles.buttonTextSm, { color: fg, flexShrink: 1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedButton>
  );
}

// =====================
// Inputs
// =====================

interface BrandInputProps extends TextInputProps {
  label?: string;
  icon?: IconName;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}

export function BrandInput({
  label,
  icon,
  error,
  containerStyle,
  multiline,
  style,
  ...props
}: BrandInputProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.inputGroup, containerStyle]}>
      {label && <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
          },
          multiline && { alignItems: "flex-start" },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={colors.textMuted}
            style={[styles.inputIcon, multiline && { marginTop: 14 }]}
          />
        )}
        <TextInput
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          style={[
            styles.input,
            { color: colors.text },
            multiline && { minHeight: 90, paddingTop: 14 },
            style,
          ]}
          {...props}
        />
      </View>
      {error ? <Text style={[styles.inputError, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

// =====================
// Headings
// =====================

export function SectionHeading({
  title,
  script,
  action,
  onAction,
  style,
}: {
  title: string;
  script?: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionHeading, style]}>
      <View style={{ flex: 1 }}>
        {script && <Text style={styles.script}>{script}</Text>}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{title}</Text>
      </View>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={10}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function ScriptText({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[styles.script, style]}>{children}</Text>;
}

// =====================
// Screen header (for stack screens)
// =====================

export function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      <TouchableOpacity onPress={goBack} style={styles.headerBack} hitSlop={10} accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTitles}>
        <Text style={[styles.headerTitle, { color: colors.secondary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

// =====================
// Card / Chip / Row
// =====================

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? BRAND.gold : colors.surface,
          borderColor: active ? BRAND.gold : colors.border,
        },
      ]}
    >
      {icon && <Ionicons name={icon} size={14} color={active ? BRAND.purpleDeep : colors.textSecondary} />}
      <Text style={[styles.chipText, { color: active ? BRAND.purpleDeep : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function ListRow({
  icon,
  label,
  subtitle,
  onPress,
  right,
  iconColor = BRAND.gold,
  destructive,
}: {
  icon: IconName;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  iconColor?: string;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: "rgba(255,215,79,0.12)" }]}>
        <Ionicons name={icon} size={20} color={destructive ? colors.error : iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: destructive ? colors.error : colors.text }]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null)}
    </TouchableOpacity>
  );
}

export const formatPrice = (value: number | null | undefined) =>
  value == null ? "" : `£${value.toFixed(2)}`;

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  buttonSm: { paddingVertical: 9, paddingHorizontal: 16 },
  buttonText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  buttonTextSm: { fontSize: 13 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15 },
  inputError: { fontSize: 12, marginTop: 4 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 22, fontWeight: "800", letterSpacing: 0.2 },
  sectionAction: { color: BRAND.orange, fontSize: 14, fontWeight: "700" },
  script: { fontFamily: FONTS.script, fontSize: 24, color: BRAND.orange, marginBottom: -2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBack: { padding: 6, marginRight: 6 },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  headerRight: { minWidth: 36, alignItems: "flex-end" },
  card: { borderRadius: 18, padding: 16, borderWidth: 1 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowSubtitle: { fontSize: 12, marginTop: 2 },
});
