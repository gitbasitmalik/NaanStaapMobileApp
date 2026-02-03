import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { AnimatedButton, FadeInView, SlideInView } from '../../components/AnimatedComponents';
import { lightHaptic, successHaptic, errorHaptic } from '../../utils/haptics';

const BRAND_PURPLE = '#6B2C5F';
const BRAND_GOLD = '#D4A84B';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const { colors } = useTheme();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: ref || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const updateFormData = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[\d\s+()-]{10,}$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must include uppercase, lowercase, and number';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!agreedToTerms) {
      errors.terms = 'You must agree to the terms and conditions';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    clearError();

    if (!validateForm()) {
      errorHaptic();
      return;
    }

    lightHaptic();
    const success = await register({
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      phone: formData.phone.trim(),
      referral_code: formData.referralCode.trim() || undefined,
    });

    if (success) {
      successHaptic();
      router.replace('/');
    } else {
      errorHaptic();
    }
  };

  const renderInput = (
    key: string,
    label: string,
    icon: string,
    options: {
      placeholder: string;
      keyboardType?: any;
      autoCapitalize?: any;
      secureTextEntry?: boolean;
      showToggle?: boolean;
      showValue?: boolean;
      onToggle?: () => void;
    }
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
          validationErrors[key] && styles.inputError,
        ]}
      >
        <Ionicons
          name={icon as any}
          size={20}
          color={colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={options.placeholder}
          placeholderTextColor={colors.textMuted}
          value={formData[key as keyof typeof formData]}
          onChangeText={(text) => updateFormData(key, text)}
          keyboardType={options.keyboardType || 'default'}
          autoCapitalize={options.autoCapitalize || 'none'}
          autoCorrect={false}
          secureTextEntry={options.secureTextEntry && !options.showValue}
        />
        {options.showToggle && (
          <TouchableOpacity
            onPress={options.onToggle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={options.showValue ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {validationErrors[key] && (
        <Text style={styles.errorText}>{validationErrors[key]}</Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <FadeInView style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              lightHaptic();
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </FadeInView>

        {/* Title */}
        <SlideInView direction="bottom" delay={100} style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Join Naan Staap and enjoy exclusive rewards
          </Text>
        </SlideInView>

        {/* Form */}
        <SlideInView direction="bottom" delay={200} style={styles.form}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#FFF" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {renderInput('name', 'Full Name', 'person-outline', {
            placeholder: 'Enter your full name',
            autoCapitalize: 'words',
          })}

          {renderInput('email', 'Email', 'mail-outline', {
            placeholder: 'Enter your email',
            keyboardType: 'email-address',
          })}

          {renderInput('phone', 'Phone Number', 'call-outline', {
            placeholder: 'Enter your phone number',
            keyboardType: 'phone-pad',
          })}

          {renderInput('password', 'Password', 'lock-closed-outline', {
            placeholder: 'Create a strong password',
            secureTextEntry: true,
            showToggle: true,
            showValue: showPassword,
            onToggle: () => setShowPassword(!showPassword),
          })}

          {renderInput('confirmPassword', 'Confirm Password', 'lock-closed-outline', {
            placeholder: 'Confirm your password',
            secureTextEntry: true,
            showToggle: true,
            showValue: showConfirmPassword,
            onToggle: () => setShowConfirmPassword(!showConfirmPassword),
          })}

          {renderInput('referralCode', 'Referral Code (Optional)', 'gift-outline', {
            placeholder: 'Enter referral code',
            autoCapitalize: 'characters',
          })}

          {/* Terms Checkbox */}
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => {
              lightHaptic();
              setAgreedToTerms(!agreedToTerms);
              if (validationErrors.terms) {
                setValidationErrors((prev) => ({ ...prev, terms: '' }));
              }
            }}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: validationErrors.terms ? '#E53935' : colors.border },
                agreedToTerms && styles.checkboxChecked,
              ]}
            >
              {agreedToTerms && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              I agree to the{' '}
              <Text style={{ color: BRAND_GOLD }}>Terms of Service</Text> and{' '}
              <Text style={{ color: BRAND_GOLD }}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          {validationErrors.terms && (
            <Text style={[styles.errorText, { marginTop: -8, marginBottom: 16 }]}>
              {validationErrors.terms}
            </Text>
          )}

          {/* Register Button */}
          <AnimatedButton
            style={[styles.registerButton, ...(isLoading ? [styles.buttonDisabled] : [])]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.registerButtonText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </>
            )}
          </AnimatedButton>
        </SlideInView>

        {/* Sign In Link */}
        <SlideInView direction="bottom" delay={300} style={styles.signinSection}>
          <Text style={[styles.signinText, { color: colors.textMuted }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity
            onPress={() => {
              lightHaptic();
              router.push('/auth/login');
            }}
          >
            <Text style={[styles.signinLink, { color: BRAND_GOLD }]}>Sign In</Text>
          </TouchableOpacity>
        </SlideInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53935',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#FFF',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: {
    borderColor: '#E53935',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  errorText: {
    color: '#E53935',
    fontSize: 12,
    marginTop: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: BRAND_PURPLE,
    borderColor: BRAND_PURPLE,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  registerButton: {
    backgroundColor: BRAND_PURPLE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signinSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  signinText: {
    fontSize: 14,
  },
  signinLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
