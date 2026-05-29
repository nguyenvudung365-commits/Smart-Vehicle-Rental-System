import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!currentPassword) e.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (!newPassword) e.newPassword = 'Vui lòng nhập mật khẩu mới';
    else if (newPassword.length < 6) e.newPassword = 'Mật khẩu mới tối thiểu 6 ký tự';
    else if (newPassword === currentPassword) e.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    if (!confirmPassword) e.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    else if (confirmPassword !== newPassword) e.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      showSuccess('Đổi mật khẩu thành công');
      router.back();
    } catch (err) {
      showError(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{flex:1}}>
      <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PasswordField
          label="Mật khẩu hiện tại"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          show={showCurrent}
          onToggle={() => setShowCurrent(v => !v)}
          error={errors.currentPassword}
          placeholder="Nhập mật khẩu hiện tại"
        />

        <PasswordField
          label="Mật khẩu mới"
          value={newPassword}
          onChangeText={setNewPassword}
          show={showNew}
          onToggle={() => setShowNew(v => !v)}
          error={errors.newPassword}
          placeholder="Tối thiểu 6 ký tự"
          hint="Dùng chữ hoa, số và ký tự đặc biệt để tăng bảo mật"
        />

        <PasswordField
          label="Xác nhận mật khẩu mới"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          show={showConfirm}
          onToggle={() => setShowConfirm(v => !v)}
          error={errors.confirmPassword}
          placeholder="Nhập lại mật khẩu mới"
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.submitText}>Cập nhật mật khẩu</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({ label, value, onChangeText, show, onToggle, error, placeholder, hint }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error && styles.inputError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
      {error
        ? <Text style={styles.errorText}>{error}</Text>
        : hint ? <Text style={styles.hintText}>{hint}</Text> : null
      }
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    paddingBottom: SPACING.md, backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  fieldGroup: { marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md,
  },
  inputError: { borderColor: COLORS.error },
  input: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text, paddingVertical: SPACING.md },
  eyeBtn: { padding: SPACING.sm },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.xs, marginTop: 4 },
  hintText: { color: COLORS.textTertiary, fontSize: FONT_SIZE.xs, marginTop: 4 },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.lg,
  },
  submitText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '700' },
});
