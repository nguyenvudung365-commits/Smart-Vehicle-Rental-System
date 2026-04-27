// Cổng thanh toán giả lập — OTP flow
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Animated, ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { bookingService } from '../../services/booking.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { formatPrice } from '../../utils/format';

// OTP giả: luôn là "123456" để demo
const FAKE_OTP = '123456';

export default function PaymentScreen() {
  const { bookingPayload, totalAmount, vehicleName, cardLast4 } = useLocalSearchParams();
  const payload = JSON.parse(bookingPayload);

  const [step, setStep] = useState('confirm'); // confirm | otp | qr | processing | done
  const [payMethod, setPayMethod] = useState('card'); // 'card' | 'qr'
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Đếm ngược OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function sendOtp() {
    setOtpSent(true);
    setCountdown(60);
    setOtp('');
  }

  async function handleConfirmPayment() {
    if (otp !== FAKE_OTP) {
      return showError('Mã OTP không đúng. Thử lại với mã 123456');
    }
    setStep('processing');

    // Giả lập xử lý thanh toán
    setTimeout(async () => {
      try {
        const result = await bookingService.create(payload);
        if (result.success) {
          setStep('done');
          Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true }).start();
        }
      } catch (err) {
        showError(err.response?.data?.message || 'Đặt xe thất bại');
        setStep('otp');
      }
    }, 2000);
  }

  if (step === 'processing') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.processingText}>Đang xử lý thanh toán...</Text>
        <Text style={styles.processingSubText}>Vui lòng không tắt ứng dụng</Text>
      </View>
    );
  }

  if (step === 'done') {
    return (
      <View style={styles.center}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
        </View>
        <Text style={styles.successTitle}>Thanh toán thành công!</Text>
        <Text style={styles.successSub}>Đơn thuê xe đã được xác nhận</Text>
        <Text style={styles.successAmount}>{formatPrice(totalAmount)}</Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace('/(tabs)/trips')}
        >
          <Text style={styles.doneBtnText}>Xem chuyến đi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleQRConfirm() {
    setStep('processing');
    setTimeout(async () => {
      try {
        const result = await bookingService.create(payload);
        if (result.success) setStep('done');
      } catch (err) {
        showError(err.response?.data?.message || 'Đặt xe thất bại');
        setStep('qr');
      }
    }, 1500);
  }

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Thông tin thanh toán */}
        <View style={styles.summaryCard}>
          <View style={styles.bankRow}>
            <View style={styles.bankIcon}>
              <Ionicons name="card" size={28} color="#FFF" />
            </View>
            <View>
              <Text style={styles.bankName}>Mioto Pay</Text>
              <Text style={styles.bankSub}>Thanh toán an toàn & bảo mật</Text>
            </View>
            <View style={styles.sslBadge}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
              <Text style={styles.sslText}>SSL</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.summaryLabel}>Nội dung thanh toán</Text>
          <Text style={styles.summaryValue}>{vehicleName}</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Số tiền</Text>
            <Text style={[styles.summaryVal, { color: COLORS.primary, fontWeight: '700' }]}>
              {formatPrice(totalAmount)}
            </Text>
          </View>
        </View>

        {/* Chọn phương thức thanh toán */}
        {step === 'confirm' && (
          <>
            <Text style={styles.methodTitle}>Phương thức thanh toán</Text>
            <TouchableOpacity style={[styles.methodRow, payMethod === 'card' && styles.methodRowActive]}
              onPress={() => setPayMethod('card')}>
              <View style={[styles.methodRadio, payMethod === 'card' && styles.methodRadioActive]}>
                {payMethod === 'card' && <View style={styles.methodRadioInner} />}
              </View>
              <Ionicons name="card-outline" size={22} color={payMethod === 'card' ? COLORS.primary : COLORS.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.methodLabel}>Thẻ thanh toán</Text>
                <Text style={styles.methodSub}>**** {cardLast4} — Xác thực OTP</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.methodRow, payMethod === 'qr' && styles.methodRowActive]}
              onPress={() => setPayMethod('qr')}>
              <View style={[styles.methodRadio, payMethod === 'qr' && styles.methodRadioActive]}>
                {payMethod === 'qr' && <View style={styles.methodRadioInner} />}
              </View>
              <Ionicons name="qr-code-outline" size={22} color={payMethod === 'qr' ? COLORS.primary : COLORS.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.methodLabel}>Quét mã QR</Text>
                <Text style={styles.methodSub}>VietQR — Chuyển khoản ngân hàng</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => {
              if (payMethod === 'card') { setStep('otp'); sendOtp(); }
              else setStep('qr');
            }}>
              <Text style={styles.primaryBtnText}>
                {payMethod === 'card' ? 'Xác nhận & Nhận mã OTP' : 'Xem mã QR thanh toán'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.otpLabel}>Nhập mã OTP</Text>
            <Text style={styles.otpHint}>
              Mã OTP đã được gửi đến số điện thoại của bạn{'\n'}
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                (Demo: dùng mã 123456)
              </Text>
            </Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor={COLORS.border}
              textAlign="center"
            />
            <TouchableOpacity
              style={[styles.primaryBtn, otp.length < 6 && { opacity: 0.5 }]}
              onPress={handleConfirmPayment}
              disabled={otp.length < 6 || submitting}
            >
              <Text style={styles.primaryBtnText}>Xác nhận thanh toán</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={countdown <= 0 ? sendOtp : undefined}
              disabled={countdown > 0}
            >
              <Text style={[styles.resendText, countdown > 0 && { color: COLORS.textTertiary }]}>
                {countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Gửi lại mã OTP'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'qr' && (
          <>
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Quét mã QR để thanh toán</Text>
              <Text style={styles.qrBank}>Ngân hàng: MB Bank · STK: 0123456789</Text>
              <Text style={styles.qrAccName}>CONG TY MIOTO VIET NAM</Text>

              {/* QR giả lập — dùng service tạo QR từ text */}
              <View style={styles.qrBox}>
                <View style={styles.qrMock}>
                  <Ionicons name="qr-code" size={120} color={COLORS.text} />
                </View>
              </View>

              <View style={styles.qrAmountRow}>
                <Text style={styles.qrAmountLabel}>Số tiền:</Text>
                <Text style={styles.qrAmountValue}>{formatPrice(totalAmount)}</Text>
              </View>
              <Text style={styles.qrNote}>Nội dung: MIOTO {vehicleName?.split(' ').slice(0,2).join('')}</Text>
              <Text style={styles.qrHint}>
                Sau khi chuyển khoản thành công, nhấn "Tôi đã thanh toán" để hoàn tất đặt xe.
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleQRConfirm}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Tôi đã thanh toán</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendBtn} onPress={() => setStep('confirm')}>
              <Text style={styles.resendText}>← Chọn lại phương thức</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.xl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },

  body: { padding: SPACING.lg, gap: SPACING.lg },

  summaryCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  bankIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  bankName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  bankSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  sslBadge: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E6F7F1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  sslText: { fontSize: FONT_SIZE.xs, color: COLORS.success, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  summaryLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  summaryKey: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  summaryVal: { fontSize: FONT_SIZE.sm, color: COLORS.text },

  infoBox: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight + '30', borderRadius: RADIUS.md, padding: SPACING.md,
  },
  infoText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 20 },

  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md + 2, alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: FONT_SIZE.lg, fontWeight: '700' },

  otpLabel: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  otpHint: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  otpInput: {
    fontSize: 36, fontWeight: '700', color: COLORS.text, letterSpacing: 12,
    borderBottomWidth: 2, borderBottomColor: COLORS.primary,
    paddingVertical: SPACING.md, marginVertical: SPACING.sm,
  },
  resendBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  resendText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },

  // Pay method selector
  methodTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: SPACING.sm,
  },
  methodRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight + '20' },
  methodRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  methodRadioActive: { borderColor: COLORS.primary },
  methodRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  methodLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  methodSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },

  // QR
  qrCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  qrTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  qrBank: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  qrAccName: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  qrBox: { padding: SPACING.md, borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.md, marginBottom: SPACING.md },
  qrMock: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center' },
  qrAmountRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', marginBottom: 4 },
  qrAmountLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  qrAmountValue: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.primary },
  qrNote: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  qrHint: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },

  processingText: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.text, marginTop: SPACING.lg },
  processingSubText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  successIcon: { marginBottom: SPACING.md },
  successTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  successSub: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  successAmount: { fontSize: 28, fontWeight: '700', color: COLORS.primary, marginVertical: SPACING.sm },
  doneBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.lg,
  },
  doneBtnText: { color: '#FFF', fontSize: FONT_SIZE.lg, fontWeight: '700' },
});
