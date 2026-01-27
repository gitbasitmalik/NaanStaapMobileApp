import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ThemeColors {
  primary: string;
  secondary: string;
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
}

export const lightTheme: ThemeColors = {
  primary: "#6B2C5F",
  secondary: "#D4A84B",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  surfaceLight: "#F0F0F0",
  text: "#1A1A1A",
  textSecondary: "#666666",
  textMuted: "#999999",
  border: "#E0E0E0",
  success: "#28A745",
  error: "#E53935",
  warning: "#FFC107",
  card: "#FFFFFF",
  overlay: "rgba(0, 0, 0, 0.5)",
};

export const darkTheme: ThemeColors = {
  primary: "#6B2C5F",
  secondary: "#D4A84B",
  background: "#0A0A0A",
  surface: "#1A1A1A",
  surfaceLight: "#2A2A2A",
  text: "#FFFFFF",
  textSecondary: "#CCCCCC",
  textMuted: "#888888",
  border: "#333333",
  success: "#28A745",
  error: "#E53935",
  warning: "#FFC107",
  card: "#1A1A1A",
  overlay: "rgba(0, 0, 0, 0.7)",
};

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@naanstaap_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        setIsDark(savedTheme === "dark");
      } else {
        setIsDark(systemColorScheme === "dark");
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    try {
      await AsyncStorage.setItem(
        THEME_STORAGE_KEY,
        newTheme ? "dark" : "light"
      );
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const setTheme = async (dark: boolean) => {
    setIsDark(dark);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setTheme }}>
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
