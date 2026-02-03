import { useEffect, useCallback } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../theme/ThemeContext";
import { useAuthStore } from "../store/authStore";

function RootLayoutContent() {
  const { colors, isDark } = useTheme();
  const { loadUser } = useAuthStore();

  const initializeAuth = useCallback(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="profile" options={{ presentation: "card" }} />
        <Stack.Screen name="orders" options={{ presentation: "card" }} />
        <Stack.Screen name="loyalty" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}
