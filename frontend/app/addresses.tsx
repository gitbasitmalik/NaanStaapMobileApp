import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, BRAND } from "../theme/ThemeContext";
import { ScreenHeader, BrandButton, BrandInput, Chip } from "../components/ui";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { useAuthStore } from "../store/authStore";
import {
  useAddressStore,
  SavedAddress,
  AddressInput,
  isValidUkPostcode,
  normalisePostcode,
} from "../store/addressStore";
import { lightHaptic, successHaptic, errorHaptic } from "../utils/haptics";

type LabelKind = "Home" | "Work" | "Other";
type IconName = keyof typeof Ionicons.glyphMap;

const LABEL_ICONS: Record<LabelKind, IconName> = {
  Home: "home",
  Work: "briefcase",
  Other: "location",
};

const kindFor = (label: string): LabelKind =>
  label === "Home" || label === "Work" ? label : "Other";

interface FormState {
  kind: LabelKind;
  customLabel: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  instructions: string;
  isDefault: boolean;
}

type FormErrors = Partial<Record<"line1" | "city" | "postcode" | "customLabel", string>>;

const emptyForm = (isDefault: boolean): FormState => ({
  kind: "Home",
  customLabel: "",
  line1: "",
  line2: "",
  city: "",
  postcode: "",
  instructions: "",
  isDefault,
});

const formFromAddress = (a: SavedAddress): FormState => {
  const kind = kindFor(a.label);
  return {
    kind,
    customLabel: kind === "Other" && a.label !== "Other" ? a.label : "",
    line1: a.address_line1 || "",
    line2: a.address_line2 || "",
    city: a.city || "",
    postcode: a.postcode || "",
    instructions: a.delivery_instructions || "",
    isDefault: a.is_default,
  };
};

const validate = (f: FormState): FormErrors => {
  const errors: FormErrors = {};
  if (!f.line1.trim()) errors.line1 = "Enter the first line of your address";
  if (!f.city.trim()) errors.city = "Enter your town or city";
  if (!f.postcode.trim()) errors.postcode = "Enter your postcode";
  else if (!isValidUkPostcode(f.postcode)) errors.postcode = "Enter a valid UK postcode, e.g. BD1 1AA";
  if (f.kind === "Other" && f.customLabel.trim().length > 30) errors.customLabel = "Keep the name under 30 characters";
  return errors;
};

export default function AddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const {
    addresses,
    isLoading,
    hasLoaded,
    error,
    fetchAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddressStore();

  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(false));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const ok = await fetchAddresses();
    if (!ok) {
      const message = useAddressStore.getState().error;
      if (message) showToast({ message, type: "error" });
    }
  }, [fetchAddresses, showToast]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openAdd = () => {
    lightHaptic();
    setEditing(null);
    setForm(emptyForm(addresses.length === 0));
    setErrors({});
    setFormVisible(true);
  };

  const openEdit = (address: SavedAddress) => {
    lightHaptic();
    setEditing(address);
    setForm(formFromAddress(address));
    setErrors({});
    setFormVisible(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormVisible(false);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      errorHaptic();
      return;
    }
    const label = form.kind === "Other" ? form.customLabel.trim() || "Other" : form.kind;
    const payload: AddressInput = {
      label,
      address_line1: form.line1.trim(),
      address_line2: form.line2.trim(),
      city: form.city.trim(),
      postcode: normalisePostcode(form.postcode),
      delivery_instructions: form.instructions.trim(),
      is_default: form.isDefault,
    };
    setSaving(true);
    const result = editing ? await updateAddress(editing.id, payload) : await addAddress(payload);
    setSaving(false);
    if (result.ok) {
      successHaptic();
      setFormVisible(false);
      showToast({ message: editing ? "Address updated" : "Address saved", type: "success" });
    } else {
      errorHaptic();
      showToast({ message: result.error || "We couldn't save that address.", type: "error" });
    }
  };

  const makeDefault = async (address: SavedAddress) => {
    lightHaptic();
    setBusyId(address.id);
    const result = await setDefaultAddress(address.id);
    setBusyId(null);
    if (result.ok) showToast({ message: `${address.label} is now your default address`, type: "success" });
    else showToast({ message: result.error || "We couldn't change your default address.", type: "error" });
  };

  const confirmDelete = (address: SavedAddress) => {
    Alert.alert(
      "Delete address?",
      `${address.label}: ${address.address_line1}, ${address.postcode} will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyId(address.id);
            const result = await deleteAddress(address.id);
            setBusyId(null);
            if (result.ok) showToast({ message: "Address deleted", type: "success" });
            else showToast({ message: result.error || "We couldn't delete that address.", type: "error" });
          },
        },
      ]
    );
  };

  // ----- Signed out -----
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Saved addresses" />
        {authLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={BRAND.gold} size="large" />
          </View>
        ) : (
          <EmptyState
            icon="location-outline"
            title="Sign in to save addresses"
            message="Save your home and work addresses for faster delivery checkout."
            actionLabel="Sign in"
            onAction={() => router.push("/auth/login")}
          />
        )}
      </View>
    );
  }

  const renderAddress = ({ item }: { item: SavedAddress }) => {
    const kind = kindFor(item.label);
    const busy = busyId === item.id;
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: item.is_default ? "rgba(255,215,79,0.5)" : colors.border,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.labelIcon, { backgroundColor: "rgba(255,215,79,0.12)" }]}>
            <Ionicons name={LABEL_ICONS[kind]} size={20} color={BRAND.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                {item.label}
              </Text>
              {item.is_default && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
            </View>
            <Text style={[styles.addressText, { color: colors.textSecondary }]}>
              {[item.address_line1, item.address_line2].filter(Boolean).join(", ")}
            </Text>
            <Text style={[styles.addressText, { color: colors.textSecondary }]}>
              {item.city} {item.postcode}
            </Text>
            {item.delivery_instructions ? (
              <View style={styles.noteRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.note, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.delivery_instructions}
                </Text>
              </View>
            ) : null}
          </View>
          {busy && <ActivityIndicator color={BRAND.gold} />}
        </View>

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.action}
            onPress={() => openEdit(item)}
            disabled={busy}
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={17} color={BRAND.gold} />
            <Text style={[styles.actionText, { color: BRAND.gold }]}>Edit</Text>
          </TouchableOpacity>
          {!item.is_default && (
            <TouchableOpacity
              style={styles.action}
              onPress={() => makeDefault(item)}
              disabled={busy}
              accessibilityRole="button"
            >
              <Ionicons name="star-outline" size={17} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>Set default</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.action}
            onPress={() => confirmDelete(item)}
            disabled={busy}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={17} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const listEmpty = () => {
    if (!hasLoaded || (isLoading && !refreshing)) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={BRAND.gold} size="large" />
        </View>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your addresses"
          message={error}
          actionLabel="Try again"
          onAction={load}
        />
      );
    }
    return (
      <EmptyState
        icon="location-outline"
        title="No saved addresses"
        message="Add an address to speed through delivery checkout."
        actionLabel="Add address"
        onAction={openAdd}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Saved addresses"
        subtitle={addresses.length > 0 ? `${addresses.length} of 10 saved` : undefined}
        right={
          addresses.length > 0 && addresses.length < 10 ? (
            <TouchableOpacity onPress={openAdd} hitSlop={10} accessibilityLabel="Add address">
              <Ionicons name="add-circle" size={28} color={BRAND.orange} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <FlatList
        data={addresses}
        keyExtractor={(a) => a.id}
        renderItem={renderAddress}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          addresses.length > 0 && addresses.length < 10 ? (
            <BrandButton
              title="Add new address"
              icon="add"
              variant="outline"
              onPress={openAdd}
              style={{ marginTop: 20 }}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
          addresses.length === 0 && { flexGrow: 1 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.gold} colors={[BRAND.orange]} />
        }
      />

      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
                paddingTop: Platform.OS === "ios" ? 16 : insets.top + 12,
              },
            ]}
          >
            <TouchableOpacity onPress={closeForm} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.secondary }]}>
              {editing ? "Edit address" : "New address"}
            </Text>
            <View style={{ width: 26 }} />
          </View>

          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Save as</Text>
            <View style={styles.chips}>
              {(["Home", "Work", "Other"] as LabelKind[]).map((k) => (
                <Chip
                  key={k}
                  label={k}
                  icon={LABEL_ICONS[k]}
                  active={form.kind === k}
                  onPress={() => update("kind", k)}
                />
              ))}
            </View>
            {form.kind === "Other" && (
              <BrandInput
                label="Name (optional)"
                icon="pricetag-outline"
                placeholder="e.g. Mum's house"
                value={form.customLabel}
                onChangeText={(t) => update("customLabel", t)}
                error={errors.customLabel}
                maxLength={30}
              />
            )}

            <BrandInput
              label="Address line 1"
              icon="home-outline"
              placeholder="House number and street"
              value={form.line1}
              onChangeText={(t) => update("line1", t)}
              error={errors.line1}
              autoComplete="street-address"
              textContentType="streetAddressLine1"
            />
            <BrandInput
              label="Address line 2 (optional)"
              icon="business-outline"
              placeholder="Flat, building, area"
              value={form.line2}
              onChangeText={(t) => update("line2", t)}
              textContentType="streetAddressLine2"
            />
            <View style={styles.row}>
              <BrandInput
                label="Town / city"
                placeholder="Bradford"
                value={form.city}
                onChangeText={(t) => update("city", t)}
                error={errors.city}
                containerStyle={{ flex: 1 }}
                textContentType="addressCity"
              />
              <BrandInput
                label="Postcode"
                placeholder="BD1 1AA"
                value={form.postcode}
                onChangeText={(t) => update("postcode", t.toUpperCase())}
                onBlur={() => {
                  if (form.postcode.trim() && isValidUkPostcode(form.postcode)) {
                    update("postcode", normalisePostcode(form.postcode));
                  }
                }}
                error={errors.postcode}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                containerStyle={{ flex: 1 }}
                textContentType="postalCode"
              />
            </View>
            <BrandInput
              label="Delivery instructions (optional)"
              icon="chatbubble-ellipses-outline"
              placeholder="e.g. Ring the bell, leave with neighbour at no. 12"
              value={form.instructions}
              onChangeText={(t) => update("instructions", t)}
              multiline
              maxLength={200}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => update("isDefault", !form.isDefault)}
              disabled={!!editing?.is_default}
              style={[styles.defaultRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.defaultRowTitle, { color: colors.text }]}>Default address</Text>
                <Text style={[styles.defaultRowSub, { color: colors.textMuted }]}>
                  {editing?.is_default
                    ? "This is your default. Make another address default to change it."
                    : "Use this address first at checkout"}
                </Text>
              </View>
              <Switch
                value={form.isDefault}
                onValueChange={(v) => update("isDefault", v)}
                disabled={!!editing?.is_default}
                trackColor={{ false: colors.surfaceLight, true: BRAND.orange }}
                thumbColor={BRAND.white}
              />
            </TouchableOpacity>
          </ScrollView>

          <View
            style={[
              styles.modalFooter,
              { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: colors.border },
            ]}
          >
            <BrandButton
              title={editing ? "Save changes" : "Save address"}
              icon="checkmark"
              onPress={save}
              loading={saving}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  listContent: { padding: 16 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  labelIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  label: { fontSize: 16, fontWeight: "800", flexShrink: 1 },
  defaultBadge: {
    backgroundColor: BRAND.gold,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultText: { color: BRAND.purpleDeep, fontSize: 11, fontWeight: "800" },
  addressText: { fontSize: 14, lineHeight: 20 },
  noteRow: { flexDirection: "row", gap: 6, alignItems: "flex-start", marginTop: 6 },
  note: { fontSize: 12, lineHeight: 17, flex: 1, fontStyle: "italic" },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 10,
    gap: 18,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4 },
  actionText: { fontSize: 14, fontWeight: "700" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  formContent: { padding: 20, paddingBottom: 32 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  chips: { flexDirection: "row", gap: 8, marginBottom: 16 },
  row: { flexDirection: "row", gap: 12 },
  defaultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  defaultRowTitle: { fontSize: 15, fontWeight: "700" },
  defaultRowSub: { fontSize: 12, marginTop: 2 },
  modalFooter: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
