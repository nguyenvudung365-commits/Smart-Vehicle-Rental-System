import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { bookingService } from '../../services/booking.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { formatPrice } from '../../utils/format';
import { showError } from '../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentScreen() {
  const { bookingPayload, totalAmount, vehicleName, cardLast4 } = useLocalSearchParams();
  const router = useRouter();

  const [otp, setOtp] = useState('');
  const [confirming, setConfirming] = useState(false);

  const amount = Number(totalAmount || 0);
  const payload = (() => {
    try { return JSON.parse(bookingPayload); } catch { return null; }
  })();

  // Chỉ tạo booking khi user nhập đúng OTP và bấm xác nhận
  const handleConfirm = async () => {
    if (otp !== '000000') {
      showError('Mã OTP không đúng');
      return;
    }
    if (!payload) {
      showError('Thông tin đặt xe không hợp lệ');
      return;
    }
    setConfirming(true);
    try {
      const result = await bookingService.create(payload);
      if (result.success) {
        Alert.alert('Thành công', 'Đặt xe thành công! Chờ chủ xe xác nhận.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/trips') },
        ]);
      } else {
        showError(result.message || 'Đặt xe thất bại, vui lòng thử lại');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Đặt xe thất bại, vui lòng thử lại');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Ionicons name="shield-checkmark" size={28} color={COLORS.primary} />
          <Text style={styles.title}>Xác nhận thanh toán</Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Xe thuê</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>{vehicleName}</Text>
          <View style={styles.divider} />
          <Text style={styles.summaryLabel}>Thẻ thanh toán</Text>
          <Text style={styles.summaryValue}>•••• {cardLast4 || '****'}</Text>
          <View style={styles.divider} />
          <Text style={styles.summaryLabel}>Số tiền giữ chỗ (40%)</Text>
          <Text style={styles.amountValue}>{formatPrice(amount)}</Text>
        </View>

        <View style={styles.otpSection}>
          <Text style={styles.sectionTitle}>Xác thực OTP</Text>
          <Text style={styles.otpLabel}>Nhập mã OTP</Text>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="• • • • • •"
            placeholderTextColor="#ccc"
          />
        </View>

        <TouchableOpacity
          style={[styles.payBtn, (confirming || otp.length !== 6) && styles.payBtnDisabled]}
          onPress={handleConfirm}
          disabled={confirming || otp.length !== 6}
        >
          {confirming
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.payText}>Xác nhận thanh toán</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={styles.secureNote}>
          <Ionicons name="lock-closed-outline" size={12} /> Giao dịch được mã hóa và bảo mật bởi Mioto
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.background, gap: SPACING.md,
  },
  creatingText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.lg, marginTop: SPACING.sm,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  summaryBox: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.lg, marginBottom: SPACING.lg,
  },
  summaryLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 2 },
  summaryValue: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  amountValue: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  otpSection: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  otpCode: { fontSize: 28, fontWeight: '800', color: COLORS.primary, letterSpacing: 6, marginVertical: SPACING.xs },
  otpHintBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight + '30',
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primary + '40',
    padding: SPACING.md, marginBottom: SPACING.lg,
  },
  otpHintTitle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  otpHintSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: 4 },
  otpHintNote: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  otpLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  otpInput: {
    borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: 28, letterSpacing: 12,
    textAlign: 'center', color: COLORS.text, backgroundColor: COLORS.background,
  },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, padding: SPACING.lg,
    borderRadius: RADIUS.lg, marginBottom: SPACING.md,
  },
  payBtnDisabled: { backgroundColor: COLORS.textTertiary },
  payText: { color: '#fff', fontSize: FONT_SIZE.lg, fontWeight: '700' },
  secureNote: {
    textAlign: 'center', fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary, lineHeight: 18,
  },
});
