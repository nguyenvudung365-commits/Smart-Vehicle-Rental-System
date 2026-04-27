import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showError } from '../../utils/toast';
import SuggestionInput from '../../components/SuggestionInput';

export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validateField(field, value) {
    const newErrors = { ...errors };
    switch (field) {
      case 'phone':
        if (!value) newErrors.phone = 'Vui lòng nhập số điện thoại';
        else if (!/^0\d{9}$/.test(value)) newErrors.phone = 'Số điện thoại phải có 10 số, bắt đầu bằng 0';
        else delete newErrors.phone;
        break;
      case 'password':
        if (!value) newErrors.password = 'Vui lòng nhập mật khẩu';
        else if (value.length < 6) newErrors.password = 'Mật khẩu tối thiểu 6 ký tự';
        else delete newErrors.password;
        break;
    }
    setErrors(newErrors);
  }

  async function handleLogin() {
    validateField('phone', phone);
    validateField('password', password);
    if (!/^0\d{9}$/.test(phone) || password.length < 6) return;

    setLoading(true);
    try {
      const result = await login({ phone, password });
      if (result.success) {
        router.replace('/(tabs)');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
        {/* Logo */}
        <View style={styles.logoBox}>
          <View style={styles.logo}>
            <Ionicons name="car-sport" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.brandName}>Mioto Clone</Text>
          <Text style={styles.tagline}>Thuê xe tự lái dễ dàng</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Đăng nhập</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <SuggestionInput
              fieldKey="login_phone"
              containerStyle={[styles.inputWrapper, errors.phone && styles.inputError]}
              leftElement={<Ionicons name="call-outline" size={20} color={errors.phone ? COLORS.error : COLORS.textSecondary} />}
              style={styles.input}
              placeholder="0xxx xxx xxx"
              value={phone}
              onChangeText={v => { setPhone(v); if (errors.phone) validateField('phone', v); }}
              onBlur={() => validateField('phone', phone)}
              keyboardType="phone-pad"
              maxLength={10}
              autoCapitalize="none"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.password ? COLORS.error : COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                value={password}
                onChangeText={v => { setPassword(v); if (errors.password) validateField('password', v); }}
                onBlur={() => validateField('password', password)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },
  logoBox: { alignItems: 'center', marginBottom: SPACING.xl },
  logo: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  brandName: { fontSize: FONT_SIZE.xxxl, fontWeight: 'bold', color: COLORS.text },
  tagline: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  form: { backgroundColor: COLORS.background },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.lg },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 4,
    backgroundColor: COLORS.surface,
  },
  inputError: { borderColor: COLORS.error },
  input: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text, marginLeft: SPACING.sm, paddingVertical: SPACING.sm },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.xs, marginTop: 4 },
  btnPrimary: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.md,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
  footerText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  linkText: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
});
