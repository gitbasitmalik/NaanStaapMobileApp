import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND, FONTS } from "../theme/ThemeContext";
import { BrandButton, BrandInput, Card, Chip, ScreenHeader } from "../components/ui";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { bookingsAPI, storesAPI, apiErrorMessage, Store } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useCheckoutStore } from "../store/checkoutStore";
import { errorHaptic, lightHaptic, successHaptic } from "../utils/haptics";

const DAYS_AHEAD = 14;
const SLOT_MINUTES = 30;
const LAST_SEATING_BEFORE_CLOSE = 60;

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Half-hourly slots inside the store's hours, skipping times already passed today.
const slotsFor = (store: Store, date: Date) => {
  const dayName = date.toLocaleDateString("en-GB", { weekday: "long" });
  const hours = store.hours.find((h) => h.day === dayName);
  if (!hours || hours.is_closed) return [];
  const open = toMinutes(hours.open_time);
  let close = toMinutes(hours.close_time);
  if (close <= open) close += 24 * 60;
  const now = new Date();
  const isToday = isoDate(date) === isoDate(now);
  const earliest = isToday ? now.getHours() * 60 + now.getMinutes() + 30 : 0;
  const slots: string[] = [];
  for (let t = open; t <= close - LAST_SEATING_BEFORE_CLOSE && t < 24 * 60; t += SLOT_MINUTES) {
    if (t >= earliest) slots.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  }
  return slots;
};

export default function BookTableScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuthStore();
  const preferredStoreId = useCheckoutStore((s) => s.storeId);

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(preferredStoreId);
  const [dateIndex, setDateIndex] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [requests, setRequests] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ store: string; when: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storesAPI.getAll();
      setStores(res.data);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!storeId && stores.length) setStoreId(stores[0].id);
  }, [stores, storeId]);

  const dates = useMemo(
    () =>
      Array.from({ length: DAYS_AHEAD }, (_, i) => {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() + i);
        return d;
      }),
    []
  );

  const store = stores.find((s) => s.id === storeId) || null;
  const slots = useMemo(
    () => (store ? slotsFor(store, dates[dateIndex]) : []),
    [store, dates, dateIndex]
  );

  useEffect(() => {
    if (time && !slots.includes(time)) setTime(null);
  }, [slots, time]);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!store) next.store = "Choose a store";
    if (!time) next.time = "Choose a time";
    if (!name.trim()) next.name = "Please enter your name";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Please enter a valid phone number";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Please enter a valid email";
    setErrors(next);
    if (Object.keys(next).length) {
      errorHaptic();
      showToast({ message: next.time || next.store || "Please check your details", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      await bookingsAPI.create({
        store_id: store!.id,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim() || undefined,
        date: isoDate(dates[dateIndex]),
        time: time!,
        party_size: partySize,
        special_requests: requests.trim(),
      });
      successHaptic();
      setConfirmed({
        store: store!.name,
        when: `${dates[dateIndex].toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })} at ${time}`,
      });
    } catch (error) {
      errorHaptic();
      showToast({ message: apiErrorMessage(error, "We couldn't book your table."), type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Book a table" />
        <View style={styles.done}>
          <Ionicons name="checkmark-circle" size={72} color={BRAND.lime} />
          <Text style={styles.doneScript}>See you soon!</Text>
          <Text style={[styles.doneTitle, { color: colors.text }]}>Table for {partySize}</Text>
          <Text style={[styles.doneText, { color: colors.textSecondary }]}>
            {confirmed.store}
            {"\n"}
            {confirmed.when}
          </Text>
          <Text style={[styles.doneHint, { color: colors.textMuted }]}>
            The store will call you if anything needs to change.
          </Text>
          {isAuthenticated && (
            <BrandButton title="View my bookings" variant="outline" onPress={() => router.replace("/bookings")} />
          )}
          <BrandButton title="Back to home" variant="ghost" onPress={() => router.replace("/")} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title="Book a table" />
      {loading ? (
        <ActivityIndicator color={BRAND.gold} style={styles.loader} />
      ) : failed ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load stores"
          message="Check your connection and try again."
          actionLabel="Try again"
          onAction={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.script}>Pull up a chair</Text>

          <Text style={styles.sectionTitle}>Store</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {stores.map((s) => (
              <Chip key={s.id} label={s.name} active={s.id === storeId} onPress={() => setStoreId(s.id)} />
            ))}
          </ScrollView>
          {store && (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {store.address} · {store.hours_summary}
            </Text>
          )}

          <Text style={styles.sectionTitle}>Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {dates.map((d, i) => {
              const active = i === dateIndex;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    lightHaptic();
                    setDateIndex(i);
                  }}
                  style={[
                    styles.date,
                    { backgroundColor: active ? BRAND.gold : colors.surface, borderColor: active ? BRAND.gold : colors.border },
                  ]}
                >
                  <Text style={[styles.dateDay, { color: active ? BRAND.purpleDeep : colors.textMuted }]}>
                    {i === 0 ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short" })}
                  </Text>
                  <Text style={[styles.dateNum, { color: active ? BRAND.purpleDeep : colors.text }]}>{d.getDate()}</Text>
                  <Text style={[styles.dateDay, { color: active ? BRAND.purpleDeep : colors.textMuted }]}>
                    {d.toLocaleDateString("en-GB", { month: "short" })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionTitle}>Time</Text>
          {slots.length === 0 ? (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              No times left on this day — try another date.
            </Text>
          ) : (
            <View style={styles.slots}>
              {slots.map((slot) => (
                <Chip key={slot} label={slot} active={slot === time} onPress={() => setTime(slot)} />
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Guests</Text>
          <Card style={styles.party}>
            <TouchableOpacity
              onPress={() => setPartySize((n) => Math.max(1, n - 1))}
              style={[styles.stepBtn, { backgroundColor: colors.surfaceLight }]}
              accessibilityLabel="Fewer guests"
            >
              <Ionicons name="remove" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.partyMid}>
              <Text style={[styles.partyNum, { color: colors.text }]}>{partySize}</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>{partySize === 1 ? "guest" : "guests"}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setPartySize((n) => Math.min(20, n + 1))}
              style={[styles.stepBtn, { backgroundColor: colors.surfaceLight }]}
              accessibilityLabel="More guests"
            >
              <Ionicons name="add" size={22} color={colors.text} />
            </TouchableOpacity>
          </Card>
          {partySize >= 12 && (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              For big groups we may call to confirm seating. Planning an event? Try our catering.
            </Text>
          )}

          <Text style={styles.sectionTitle}>Your details</Text>
          <BrandInput label="Name *" icon="person-outline" value={name} onChangeText={setName} error={errors.name} />
          <BrandInput
            label="Phone *"
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            error={errors.phone}
          />
          <BrandInput
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <BrandInput
            label="Special requests"
            value={requests}
            onChangeText={setRequests}
            placeholder="High chair, birthday, accessibility…"
            multiline
            maxLength={300}
          />

          <BrandButton title="Request booking" icon="calendar" loading={submitting} onPress={submit} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 60 },
  content: { padding: 16 },
  script: { fontFamily: FONTS.script, fontSize: 28, color: BRAND.orange },
  sectionTitle: { color: BRAND.gold, fontSize: 17, fontWeight: "900", marginTop: 20, marginBottom: 10 },
  chips: { gap: 8 },
  hint: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  date: { width: 64, alignItems: "center", paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  dateDay: { fontSize: 11, fontWeight: "700" },
  dateNum: { fontSize: 22, fontWeight: "900", marginVertical: 2 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  party: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  partyMid: { alignItems: "center" },
  partyNum: { fontSize: 30, fontWeight: "900" },
  done: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 10 },
  doneScript: { fontFamily: FONTS.script, fontSize: 30, color: BRAND.orange },
  doneTitle: { fontSize: 26, fontWeight: "900" },
  doneText: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  doneHint: { fontSize: 13, textAlign: "center", marginBottom: 10 },
});
