import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import axios from "axios";
import { useFavoritesStore } from "../../store/favoritesStore";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";
import {
  AnimatedButton,
  FadeInView,
  SlideInView,
} from "../../components/AnimatedComponents";
import { lightHaptic } from "../../utils/haptics";

const BRAND_PURPLE = "#6B2C5F";
const BRAND_GOLD = "#D4A84B";
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

interface Store {
  id: string;
  name: string;
  city: string;
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const { favorites } = useFavoritesStore();

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    store_id: "1",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    date: "",
    time: "",
    party_size: "2",
    special_requests: "",
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stores`);
      setStores(response.data);
    } catch {
      console.error("Error fetching stores");
    }
  };

  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    setSubscribing(true);
    try {
      await axios.post(`${API_URL}/api/newsletter/subscribe`, { email });
      Alert.alert("Success!", "You have been subscribed to our newsletter");
      setEmail("");
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        "Failed to subscribe. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setSubscribing(false);
    }
  };

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      Alert.alert("Missing Fields", "Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/contact`, contactForm);
      Alert.alert(
        "Success!",
        "Your message has been sent. We will get back to you soon."
      );
      setContactForm({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      setShowContactForm(false);
    } catch {
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingSubmit = async () => {
    if (
      !bookingForm.customer_name ||
      !bookingForm.customer_phone ||
      !bookingForm.date ||
      !bookingForm.time
    ) {
      Alert.alert("Missing Fields", "Please fill in all required fields");
      return;
    }
    setBookingSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/api/bookings`, {
        ...bookingForm,
        party_size: parseInt(bookingForm.party_size),
      });
      Alert.alert(
        "Booking Confirmed!",
        `Your table for ${bookingForm.party_size} on ${bookingForm.date} at ${
          bookingForm.time
        } has been booked.\n\nBooking ID: ${response.data.id
          .slice(0, 8)
          .toUpperCase()}`
      );
      setBookingForm({
        store_id: "1",
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        date: "",
        time: "",
        party_size: "2",
        special_requests: "",
      });
      setShowBookingForm(false);
    } catch {
      Alert.alert("Error", "Failed to book table. Please try again.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const menuItems = [
    // Account section
    {
      icon: isAuthenticated ? "person" : "person-outline",
      title: isAuthenticated ? user?.name || "My Profile" : "Sign In",
      subtitle: isAuthenticated
        ? "View your profile"
        : "Sign in or create account",
      onPress: () => {
        lightHaptic();
        router.push(isAuthenticated ? "/profile" : "/auth/login");
      },
      color: BRAND_PURPLE,
    },
    {
      icon: "receipt-outline",
      title: "Order History",
      subtitle: "View your past orders",
      onPress: () => {
        lightHaptic();
        router.push("/orders");
      },
      color: "#FF6B35",
    },
    {
      icon: "gift-outline",
      title: "Loyalty Rewards",
      subtitle: isAuthenticated
        ? `${user?.loyalty_points || 0} points`
        : "Earn points with orders",
      onPress: () => {
        lightHaptic();
        router.push("/loyalty");
      },
      color: BRAND_GOLD,
    },
    {
      icon: "calendar-outline",
      title: "Book a Table",
      subtitle: "Reserve your spot",
      onPress: () => setShowBookingForm(true),
      color: "#28A745",
    },
    {
      icon: "location-outline",
      title: "My Addresses",
      subtitle: "Manage delivery addresses",
      onPress: () => {
        lightHaptic();
        router.push("/addresses");
      },
      color: "#3498DB",
    },
    {
      icon: "heart-outline",
      title: "My Favorites",
      subtitle: `${favorites.length} items saved`,
      onPress: () => {},
      color: "#E53935",
    },
    {
      icon: "pricetag-outline",
      title: "Deals & Offers",
      subtitle: "View current promotions",
      onPress: () => {
        lightHaptic();
        router.push("/deals");
      },
      color: "#FF6B35",
    },
    {
      icon: "business-outline",
      title: "Franchise Opportunities",
      subtitle: "Become our partner",
      onPress: () => Linking.openURL("https://naanstaap.co.uk/franchise/"),
      color: BRAND_PURPLE,
    },
    {
      icon: "globe-outline",
      title: "Visit Website",
      subtitle: "naanstaap.co.uk",
      onPress: () => Linking.openURL("https://naanstaap.co.uk"),
      color: "#4267B2",
    },
    {
      icon: "cart-outline",
      title: "Order Online",
      subtitle: "Order through our app",
      onPress: () => Linking.openURL("https://naanstaap.app4food.co.uk/"),
      color: "#00CCBC",
    },
    {
      icon: "mail-outline",
      title: "Contact Us",
      subtitle: "Get in touch with us",
      onPress: () => setShowContactForm(true),
      color: BRAND_GOLD,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.scrollView, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>More</Text>
        </View>

        {/* Dark Mode Toggle */}
        <FadeInView
          style={[styles.themeToggle, { backgroundColor: colors.surface }]}
        >
          <View style={styles.themeToggleContent}>
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: isDark ? "#333" : "#FFF3D4" },
              ]}
            >
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={22}
                color={isDark ? "#D4A84B" : "#FF9500"}
              />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>
                Dark Mode
              </Text>
              <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                {isDark ? "On" : "Off"}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={() => {
              lightHaptic();
              toggleTheme();
            }}
            trackColor={{ false: "#767577", true: BRAND_GOLD }}
            thumbColor={isDark ? "#FFF" : "#f4f3f4"}
          />
        </FadeInView>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <SlideInView key={index} direction="right" delay={index * 50}>
              <AnimatedButton
                style={[styles.menuItem, { backgroundColor: colors.surface }]}
                onPress={() => {
                  lightHaptic();
                  item.onPress();
                }}
              >
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: item.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={item.color}
                  />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.menuSubtitle, { color: colors.textMuted }]}
                  >
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textMuted}
                />
              </AnimatedButton>
            </SlideInView>
          ))}
        </View>

        {/* Newsletter */}
        <View
          style={[
            styles.newsletterSection,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.newsletterTitle, { color: colors.text }]}>
            Join Our Newsletter
          </Text>
          <Text
            style={[styles.newsletterSubtitle, { color: colors.textMuted }]}
          >
            Stay updated with our latest offers and news
          </Text>
          <View style={styles.newsletterInput}>
            <TextInput
              style={[
                styles.emailInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Enter your email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.socialSection}>
          <Text style={[styles.socialTitle, { color: colors.text }]}>
            Follow Us
          </Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: colors.surface }]}
              onPress={() => {
                lightHaptic();
                Linking.openURL("https://www.facebook.com/NaanStaap");
              }}
            >
              <Ionicons name="logo-facebook" size={28} color="#4267B2" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: colors.surface }]}
              onPress={() => {
                lightHaptic();
                Linking.openURL("https://www.instagram.com/naanstaap/");
              }}
            >
              <Ionicons name="logo-instagram" size={28} color="#E1306C" />
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <View
            style={[styles.aboutContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.aboutLogo, { color: colors.text }]}>
              NAAN STAAP
            </Text>
            <Text style={[styles.aboutText, { color: colors.textMuted }]}>
              Pull up to your nearest Naan Staap and vibe with the flavours of
              South Asia. Thanks for choosing us — cannot wait to have you back
              for more!
            </Text>
            <View style={styles.halalBadge}>
              <Ionicons name="checkmark-circle" size={16} color={BRAND_GOLD} />
              <Text style={[styles.halalText, { color: colors.text }]}>
                100% Halal Certified
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Partners */}
        <View style={styles.deliverySection}>
          <Text style={[styles.deliveryTitle, { color: colors.text }]}>
            Delivery Partners
          </Text>
          <View style={styles.deliveryPartners}>
            <TouchableOpacity
              style={[
                styles.deliveryButton,
                { backgroundColor: isDark ? colors.surface : "#FFF" },
              ]}
              onPress={() => {
                lightHaptic();
                Linking.openURL("https://deliveroo.co.uk/");
              }}
            >
              <Ionicons name="bicycle" size={24} color="#00CCBC" />
              <Text
                style={[
                  styles.deliveryName,
                  { color: isDark ? colors.text : "#333" },
                ]}
              >
                Deliveroo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deliveryButton,
                { backgroundColor: isDark ? colors.surface : "#FFF" },
              ]}
              onPress={() => {
                lightHaptic();
                Linking.openURL("https://www.ubereats.com/");
              }}
            >
              <Ionicons
                name="car"
                size={24}
                color={isDark ? "#FFF" : "#142328"}
              />
              <Text
                style={[
                  styles.deliveryName,
                  { color: isDark ? colors.text : "#333" },
                ]}
              >
                Uber Eats
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            © 2018-2025 Naan Staap Ltd.
          </Text>
          <Text style={[styles.footerSubtext, { color: colors.textMuted }]}>
            All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* Contact Form Modal */}
      <Modal visible={showContactForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Contact Us
              </Text>
              <TouchableOpacity onPress={() => setShowContactForm(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Your Name *"
                placeholderTextColor={colors.textMuted}
                value={contactForm.name}
                onChangeText={(text) =>
                  setContactForm({ ...contactForm, name: text })
                }
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Email Address *"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={contactForm.email}
                onChangeText={(text) =>
                  setContactForm({ ...contactForm, email: text })
                }
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Phone Number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={contactForm.phone}
                onChangeText={(text) =>
                  setContactForm({ ...contactForm, phone: text })
                }
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Subject"
                placeholderTextColor={colors.textMuted}
                value={contactForm.subject}
                onChangeText={(text) =>
                  setContactForm({ ...contactForm, subject: text })
                }
              />
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Your Message *"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={contactForm.message}
                onChangeText={(text) =>
                  setContactForm({ ...contactForm, message: text })
                }
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleContactSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Send Message</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Booking Form Modal */}
      <Modal visible={showBookingForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Book a Table
              </Text>
              <TouchableOpacity onPress={() => setShowBookingForm(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                Select Store
              </Text>
              <View style={styles.storeSelector}>
                {stores.slice(0, 5).map((store) => (
                  <TouchableOpacity
                    key={store.id}
                    style={[
                      styles.storeOption,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                      bookingForm.store_id === store.id &&
                        styles.storeOptionActive,
                    ]}
                    onPress={() => {
                      lightHaptic();
                      setBookingForm({ ...bookingForm, store_id: store.id });
                    }}
                  >
                    <Text
                      style={[
                        styles.storeOptionText,
                        { color: colors.textMuted },
                        bookingForm.store_id === store.id &&
                          styles.storeOptionTextActive,
                      ]}
                    >
                      {store.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Full Name *"
                placeholderTextColor={colors.textMuted}
                value={bookingForm.customer_name}
                onChangeText={(text) =>
                  setBookingForm({ ...bookingForm, customer_name: text })
                }
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Phone Number *"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={bookingForm.customer_phone}
                onChangeText={(text) =>
                  setBookingForm({ ...bookingForm, customer_phone: text })
                }
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={bookingForm.customer_email}
                onChangeText={(text) =>
                  setBookingForm({ ...bookingForm, customer_email: text })
                }
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Date (e.g., 2025-02-15) *"
                placeholderTextColor={colors.textMuted}
                value={bookingForm.date}
                onChangeText={(text) =>
                  setBookingForm({ ...bookingForm, date: text })
                }
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Time (e.g., 19:00) *"
                placeholderTextColor={colors.textMuted}
                value={bookingForm.time}
                onChangeText={(text) =>
                  setBookingForm({ ...bookingForm, time: text })
                }
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                Party Size
              </Text>
              <View style={styles.partySizeContainer}>
                {["1", "2", "3", "4", "5", "6", "7", "8+"].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.partySizeBtn,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                      bookingForm.party_size === size &&
                        styles.partySizeBtnActive,
                    ]}
                    onPress={() => {
                      lightHaptic();
                      setBookingForm({ ...bookingForm, party_size: size });
                    }}
                  >
                    <Text
                      style={[
                        styles.partySizeText,
                        { color: colors.textMuted },
                        bookingForm.party_size === size &&
                          styles.partySizeTextActive,
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Special Requests (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={bookingForm.special_requests}
                onChangeText={(text) =>
                  setBookingForm({ ...bookingForm, special_requests: text })
                }
              />

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: "#28A745" }]}
                onPress={handleBookingSubmit}
                disabled={bookingSubmitting}
              >
                {bookingSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#FFF" />
                    <Text style={styles.submitButtonText}>Confirm Booking</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "bold" },
  themeToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    paddingRight: 12,
  },
  themeToggleContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  menuSection: { paddingHorizontal: 16, marginBottom: 24 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: "600" },
  menuSubtitle: { fontSize: 12, marginTop: 2 },
  newsletterSection: {
    backgroundColor: "#1A1A1A",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  newsletterTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  newsletterSubtitle: { fontSize: 13, color: "#888", marginBottom: 16 },
  newsletterInput: { flexDirection: "row", gap: 12 },
  emailInput: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: "#FFF",
    borderWidth: 1,
    borderColor: "#333",
  },
  subscribeButton: {
    backgroundColor: BRAND_PURPLE,
    borderRadius: 10,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  socialSection: { alignItems: "center", marginBottom: 24 },
  socialTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    marginBottom: 12,
  },
  socialLinks: { flexDirection: "row", gap: 20 },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
  },
  aboutSection: { marginHorizontal: 16, marginBottom: 24 },
  aboutContent: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  aboutLogo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    letterSpacing: 3,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  halalBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  halalText: { color: "#FFF", fontSize: 12, fontWeight: "500" },
  deliverySection: { marginHorizontal: 16, marginBottom: 24 },
  deliveryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 16,
  },
  deliveryPartners: { flexDirection: "row", justifyContent: "center", gap: 20 },
  deliveryButton: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deliveryName: { fontSize: 14, fontWeight: "600", color: "#333" },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  footerText: { color: "#666", fontSize: 12 },
  footerSubtext: { color: "#555", fontSize: 11, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { color: "#FFF", fontSize: 24, fontWeight: "bold" },
  input: {
    backgroundColor: "#0A0A0A",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: "#FFF",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  textArea: { height: 100, paddingTop: 14 },
  inputLabel: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 8,
  },
  storeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  storeOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#333",
  },
  storeOptionActive: {
    backgroundColor: BRAND_PURPLE,
    borderColor: BRAND_PURPLE,
  },
  storeOptionText: { color: "#888", fontSize: 13 },
  storeOptionTextActive: { color: "#FFF" },
  partySizeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  partySizeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  partySizeBtnActive: {
    backgroundColor: BRAND_PURPLE,
    borderColor: BRAND_PURPLE,
  },
  partySizeText: { color: "#888", fontSize: 14, fontWeight: "600" },
  partySizeTextActive: { color: "#FFF" },
  submitButton: {
    backgroundColor: BRAND_PURPLE,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
