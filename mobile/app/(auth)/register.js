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

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({ phone: '', email: '', password: '', fullName: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) validateField(key, value);
  }

  function validateField(field, value) {
    const e = { ...errors };
    switch (field) {
      case 'fullName':
        if (!value || value.trim().length < 2) e.fullName = 'Họ tên tối thiểu 2 ký tự';
        else delete e.fullName;
        break;
      case 'phone':
        if (!value) e.phone = 'Vui lòng nhập số điện thoại';
        else if (!/^0\d{9}$/.test(value)) e.phone = 'Số điện thoại phải có 10 số, bắt đầu bằng 0';
        else delete e.phone;
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) e.email = 'Email không hợp lệ';
        else delete e.email;
        break;
      case 'password':
        if (!value) e.password = 'Vui lòng nhập mật khẩu';
        else if (value.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự';
        else delete e.password;
        break;
      case 'confirmPassword':
        if (value !== form.password) e.confirmPassword = 'Mật khẩu xác nhận không khớp';
        else delete e.confirmPassword;
        break;
    }
    setErrors(e);
  }

  function validateAll() {
    validateField('fullName', form.fullName);
    validateField('phone', form.phone);
    validateField('email', form.email);
    validateField('password', form.password);
    validateField('confirmPassword', confirmPassword);
    return form.fullName.trim().length >= 2
      && /^0\d{9}$/.test(form.phone)
      && (!form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      && form.password.length >= 6
      && form.password === confirmPassword;
  }

  async function handleRegister() {
    if (!validateAll()) return;
    if (!agreed) return showError('Vui lòng đồng ý với điều khoản dịch vụ');

    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.email) delete payload.email;
      const result = await register(payload);
      if (result.success) {
        router.replace('/(tabs)');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Đăng ký thất bại');
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Tạo tài khoản</Text>
        <Text style={styles.subtitle}>Đăng ký để bắt đầu thuê xe</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Họ và tên *</Text>
          <SuggestionInput
            fieldKey="register_fullName"
            containerStyle={[styles.inputWrapper, errors.fullName && styles.inputError]}
            leftElement={<Ionicons name="person-outline" size={20} color={errors.fullName ? COLORS.error : COLORS.textSecondary} />}
            style={styles.input}
            placeholder="Nguyễn Văn A"
            value={form.fullName}
            onChangeText={v => setField('fullName', v)}
            onBlur={() => validateField('fullName', form.fullName)}
          />
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Số điện thoại *</Text>
          <SuggestionInput
            fieldKey="register_phone"
            containerStyle={[styles.inputWrapper, errors.phone && styles.inputError]}
            leftElement={<Ionicons name="call-outline" size={20} color={errors.phone ? COLORS.error : COLORS.textSecondary} />}
            style={styles.input}
            placeholder="0xxx xxx xxx"
            value={form.phone}
            onChangeText={v => setField('phone', v)}
            onBlur={() => validateField('phone', form.phone)}
            keyboardType="phone-pad"
            maxLength={10}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email (tùy chọn)</Text>
          <SuggestionInput
            fieldKey="register_email"
            containerStyle={[styles.inputWrapper, errors.email && styles.inputError]}
            leftElement={<Ionicons name="mail-outline" size={20} color={errors.email ? COLORS.error : COLORS.textSecondary} />}
            style={styles.input}
            placeholder="email@example.com"
            value={form.email}
            onChangeText={v => setField('email', v)}
            onBlur={() => validateField('email', form.email)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mật khẩu *</Text>
          <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={20} color={errors.password ? COLORS.error : COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Tối thiểu 6 ký tự"
              value={form.password}
              onChangeText={v => setField('password', v)}
              onBlur={() => validateField('password', form.password)}
              secureTextEntry
            />
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Xác nhận mật khẩu *</Text>
          <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={20} color={errors.confirmPassword ? COLORS.error : COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChangeText={v => { setConfirmPassword(v); if (errors.confirmPassword) validateField('confirmPassword', v); }}
              onBlur={() => validateField('confirmPassword', confirmPassword)}
              secureTextEntry
            />
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>

        <TouchableOpacity style={styles.checkbox} onPress={() => setAgreed(!agreed)}>
          <Ionicons
            name={agreed ? 'checkbox' : 'square-outline'}
            size={22}
            color={agreed ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={styles.checkboxText}>
            Tôi đồng ý với <Text style={styles.linkText}>Điều khoản dịch vụ</Text> và{' '}
            <Text style={styles.linkText}>Chính sách bảo mật</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Đăng ký</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Đã có tài khoản? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Đăng nhập</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, paddingTop: SPACING.xxl },
  backBtn: { marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZE.xxxl, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.lg },
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
  checkbox: { flexDirection: 'row', alignItems: 'flex-start', marginTop: SPACING.md, gap: SPACING.sm },
  checkboxText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  btnPrimary: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.lg,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
  footerText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  linkText: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
});
