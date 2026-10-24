import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, GrandHotel_400Regular } from "@expo-google-fonts/grand-hotel";
import { ThemeProvider, useTheme } from "../theme/ThemeContext";
import { ToastProvider } from "../components/Toast";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { useFavoritesStore } from "../store/favoritesStore";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutContent() {
  const { colors } = useTheme();
  const loadUser = useAuthStore((s) => s.loadUser);
  const hydrateCart = useCartStore((s) => s.hydrate);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);

  useEffect(() => {
    loadUser();
    hydrateCart();
    loadFavorites();
  }, [loadUser, hydrateCart, loadFavorites]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ presentation: "modal" }} />
        <Stack.Screen name="checkout" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ GrandHotel_400Regular });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <ToastProvider>
        <RootLayoutContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
