import React, { createContext, useContext, ReactNode } from "react";

// Brand palette taken from naanstaap.co.uk (Elementor global colours + logo).
export const BRAND = {
  purple: "#4C2D55", // site background / headers
  purpleDeep: "#3A2640", // site footer
  purpleLight: "#5E3D69",
  gold: "#FFD74F", // headings, highlights
  orange: "#F05A22", // call-to-action
  lime: "#BED630", // fresh / veg accents
  white: "#FFFFFF",
} as const;

// Script face used on the website for accent copy ("Grand Hotel").
export const FONTS = {
  script: "GrandHotel_400Regular",
} as const;

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  success: string;
  error: string;
  warning: string;
  card: string;
  overlay: string;
  onPrimary: string;
}

// The website is a single purple theme, so the app uses one brand palette.
export const brandTheme: ThemeColors = {
  primary: BRAND.orange,
  secondary: BRAND.gold,
  accent: BRAND.lime,
  background: BRAND.purpleDeep,
  surface: BRAND.purple,
  surfaceLight: BRAND.purpleLight,
  text: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.85)",
  textMuted: "rgba(255, 255, 255, 0.6)",
  border: "rgba(255, 255, 255, 0.14)",
  success: BRAND.lime,
  error: "#FF6B6B",
  warning: BRAND.gold,
  card: BRAND.purple,
  overlay: "rgba(20, 10, 24, 0.75)",
  onPrimary: "#FFFFFF",
};

// Kept for backwards compatibility with older imports.
export const lightTheme = brandTheme;
export const darkTheme = brandTheme;

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ isDark: true, colors: brandTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
