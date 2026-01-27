import React, {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

type ToastType = "success" | "error" | "warning" | "info";

interface ToastConfig {
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (config: ToastConfig) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const showToast = (config: ToastConfig) => {
    setToast(config);
    setVisible(true);
  };

  useEffect(() => {
    if (visible && toast) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setVisible(false);
          setToast(null);
        });
      }, toast.duration || 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, toast, translateY, opacity]);

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          backgroundColor: "#28A745",
          icon: "checkmark-circle" as const,
        };
      case "error":
        return { backgroundColor: "#E53935", icon: "close-circle" as const };
      case "warning":
        return { backgroundColor: "#FFC107", icon: "warning" as const };
      case "info":
        return {
          backgroundColor: "#2196F3",
          icon: "information-circle" as const,
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: insets.top + 10,
              backgroundColor: getToastStyle(toast.type).backgroundColor,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <Ionicons
            name={getToastStyle(toast.type).icon}
            size={24}
            color="#FFF"
            style={styles.icon}
          />
          <Text style={styles.message}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
