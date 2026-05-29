import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Modal, TextInput, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { bookingService } from '../../services/booking.service';
import { hostService } from '../../services/host.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { formatPrice } from '../../utils/format';

const STATUS_COLORS = {
  pending_payment: '#F59E0B',
  confirmed:       '#3B82F6',
  host_handover:   '#8B5CF6',
  in_progress:     '#10B981',
  renter_return:   '#F59E0B',
  completed:       '#6B7280',
  cancelled:       '#EF4444',
};
const STATUS_LABELS = {
  pending_payment: 'Chờ xác nhận',
  confirmed:       'Đã xác nhận',
  host_handover:   'Chờ khách nhận xe',
  in_progress:     'Đang thuê',
  renter_return:   'Khách đã trả xe',
  completed:       'Hoàn thành',
  cancelled:       'Đã hủy',
};

function formatDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}`;
}

function InfoRow({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.6 : 1}>
      <Ionicons name={icon} size={18} color={COLORS.textSecondary} style={{ width: 22 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && styles.infoLink]} numberOfLines={2}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

export default function HostBookingDetailScreen() {
  const { bookingId } = useLocalSearchParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadDetail(); }, [bookingId]);

  async function loadDetail() {
    try {
      const res = await bookingService.getById(bookingId);
      setBooking(res.data);
    } catch {
      showError('Không thể tải chi tiết đơn');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    Alert.alert('Xác nhận', 'Xác nhận đơn thuê này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận', onPress: async () => {
          setProcessing(true);
          try {
            await bookingService.hostConfirm(bookingId);
            showSuccess('Đã xác nhận đơn thuê');
            loadDetail();
          } catch { showError('Không thể xác nhận'); }
          finally { setProcessing(false); }
        },
      },
    ]);
  }

  async function pickImageAndAction(actionFn, successMsg) {
    Alert.alert(
      'Chụp ảnh xác nhận',
      'Bạn có muốn chụp ảnh tình trạng xe để làm bằng chứng không?',
      [
        {
          text: 'Không cần',
          onPress: async () => {
            setProcessing(true);
            try { await actionFn(null); showSuccess(successMsg); loadDetail(); }
            catch { showError('Thao tác thất bại'); }
            finally { setProcessing(false); }
          },
        },
        {
          text: 'Chụp ảnh',
          onPress: async () => {
            const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
            const imageUri = res.canceled ? null : res.assets[0].uri;
            setProcessing(true);
            try { await actionFn(imageUri); showSuccess(successMsg); loadDetail(); }
            catch { showError('Thao tác thất bại'); }
            finally { setProcessing(false); }
          },
        },
      ]
    );
  }

  async function handleReject() {
    setProcessing(true);
    try {
      await bookingService.hostReject(bookingId, rejectReason);
      showSuccess('Đã từ chối đơn thuê');
      setRejectModal(false);
      setRejectReason('');
      loadDetail();
    } catch { showError('Không thể từ chối'); }
    finally { setProcessing(false); }
  }

  async function handleUpdateStatus(newStatus) {
    const labels = { in_progress: 'bắt đầu chuyến', completed: 'kết thúc chuyến' };
    Alert.alert('Xác nhận', `Bạn chắc chắn muốn ${labels[newStatus]}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý', onPress: async () => {
          setProcessing(true);
          try {
            await bookingService.updateStatus(bookingId, newStatus);
            showSuccess(newStatus === 'in_progress' ? 'Đã bắt đầu chuyến' : 'Chuyến đã hoàn thành');
            loadDetail();
          } catch { showError('Cập nhật thất bại'); }
          finally { setProcessing(false); }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />;
  if (!booking) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textSecondary }}>Không tìm thấy đơn</Text>
      </View>
    </SafeAreaView>
  );

  const status = booking.status;
  const renter = booking.renter;
  const vehicle = booking.vehicle;
  const coverImage = vehicle?.images?.find(i => i.isCover)?.imageUrl || vehicle?.images?.[0]?.imageUrl;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn thuê</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}>

        {/* Trạng thái */}
        <View style={[styles.statusBar, { backgroundColor: (STATUS_COLORS[status] || '#999') + '15', borderColor: STATUS_COLORS[status] || '#999' }]}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] || '#999' }]} />
          <Text style={[styles.statusLabel, { color: STATUS_COLORS[status] || '#999' }]}>
            {STATUS_LABELS[status] || status}
          </Text>
          <Text style={styles.bookingCode}>#{booking.id.slice(0, 8).toUpperCase()}</Text>
        </View>

        {/* Thông tin xe */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin xe</Text>
          <View style={styles.vehicleRow}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.vehicleImg} contentFit="cover" />
            ) : (
              <View style={[styles.vehicleImg, styles.vehicleImgPlaceholder]}>
                <Ionicons name="car-outline" size={28} color={COLORS.textTertiary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>{vehicle?.brand} {vehicle?.model} {vehicle?.year}</Text>
              {vehicle?.licensePlate ? (
                <Text style={styles.vehiclePlate}>{vehicle.licensePlate}</Text>
              ) : null}
              {vehicle?.address && (
                <Text style={styles.vehicleAddr} numberOfLines={2}>
                  {[vehicle.address.detail, vehicle.address.ward, vehicle.address.district, vehicle.address.province].filter(Boolean).join(', ')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Thông tin khách thuê */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Khách thuê xe</Text>
          <View style={styles.renterRow}>
            {renter?.avatarUrl ? (
              <Image source={{ uri: renter.avatarUrl }} style={styles.renterAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.renterAvatar, styles.renterAvatarPlaceholder]}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.renterName}>{renter?.fullName}</Text>
              {renter?.email ? <Text style={styles.renterEmail}>{renter.email}</Text> : null}
            </View>
            {renter?.phone && (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${renter.phone}`)}
              >
                <Ionicons name="call-outline" size={18} color="#FFF" />
                <Text style={styles.callBtnText}>Gọi</Text>
              </TouchableOpacity>
            )}
          </View>
          {renter?.phone && (
            <InfoRow icon="call-outline" label="Số điện thoại" value={renter.phone}
              onPress={() => Linking.openURL(`tel:${renter.phone}`)} />
          )}
        </View>

        {/* Thời gian thuê */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thời gian thuê</Text>
          <InfoRow icon="log-in-outline"  label="Nhận xe"   value={formatDateTime(booking.startDate)} />
          <InfoRow icon="log-out-outline" label="Trả xe"    value={formatDateTime(booking.endDate)} />
          <InfoRow icon="time-outline"    label="Số ngày"   value={`${booking.rentalDays} ngày`} />
        </View>

        {/* Chi tiết giá */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chi tiết giá</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Giá thuê/ngày</Text>
            <Text style={styles.priceVal}>{formatPrice(Number(booking.pricePerDay))}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tạm tính ({booking.rentalDays} ngày)</Text>
            <Text style={styles.priceVal}>{formatPrice(Number(booking.subtotal))}</Text>
          </View>
          {Number(booking.discountAmount) > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Giảm giá (điểm)</Text>
              <Text style={[styles.priceVal, { color: '#10B981' }]}>−{formatPrice(Number(booking.discountAmount))}</Text>
            </View>
          )}
          {Number(booking.voucherDiscount) > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Giảm giá (voucher{booking.voucher?.code ? ` ${booking.voucher.code}` : ''})</Text>
              <Text style={[styles.priceVal, { color: '#10B981' }]}>−{formatPrice(Number(booking.voucherDiscount))}</Text>
            </View>
          )}
          <View style={[styles.priceRow, styles.priceRowTotal]}>
            <Text style={styles.priceLabelTotal}>Tổng thanh toán</Text>
            <Text style={styles.priceValTotal}>{formatPrice(Number(booking.totalAmount))}</Text>
          </View>
          {booking.cardLast4 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Thẻ thanh toán</Text>
              <Text style={styles.priceVal}>**** {booking.cardLast4}</Text>
            </View>
          )}
        </View>

        {/* Ghi chú */}
        {booking.note ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ghi chú của khách</Text>
            <Text style={styles.noteText}>{booking.note}</Text>
          </View>
        ) : null}

        {/* Lý do hủy */}
        {status === 'cancelled' && booking.cancelReason ? (
          <View style={[styles.card, styles.cancelCard]}>
            <Text style={[styles.cardTitle, { color: COLORS.error }]}>Lý do hủy</Text>
            <Text style={styles.noteText}>{booking.cancelReason}</Text>
          </View>
        ) : null}

        {/* Thời gian tạo */}
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.metaText}>Đặt lúc: {formatDateTime(booking.createdAt)}</Text>
        </View>

      </ScrollView>

      {/* Sticky action bar */}
      {status === 'pending_payment' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => { setRejectModal(true); setRejectReason(''); }}
            disabled={processing}
          >
            <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
            <Text style={styles.rejectBtnText}>Từ chối</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={processing}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
            <Text style={styles.confirmBtnText}>{processing ? 'Đang xử lý...' : 'Xác nhận đơn'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'confirmed' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => pickImageAndAction(
              (img) => bookingService.hostHandover(bookingId, img),
              'Đã bàn giao xe cho khách!'
            )}
            disabled={processing}
          >
            <Ionicons name="car-outline" size={18} color="#FFF" />
            <Text style={styles.confirmBtnText}>{processing ? 'Đang xử lý...' : 'Bàn giao xe'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'host_handover' && (
        <View style={styles.actionBar}>
          <View style={styles.waitingBar}>
            <Ionicons name="time-outline" size={16} color="#F59E0B" />
            <Text style={styles.waitingBarText}>Chờ khách xác nhận đã nhận xe...</Text>
          </View>
        </View>
      )}

      {status === 'renter_return' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => pickImageAndAction(
              (img) => bookingService.hostReceived(bookingId, img),
              'Chuyến đi đã hoàn thành!'
            )}
            disabled={processing}
          >
            <Ionicons name="checkmark-done-outline" size={18} color="#FFF" />
            <Text style={styles.confirmBtnText}>{processing ? 'Đang xử lý...' : 'Đã nhận được xe'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'completed' && (
        <View style={styles.actionBar}>
          {/* Nếu chưa có hostReview thì hiện nút đánh giá */}
          {!booking?.hostReview && (
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => router.push({
                pathname: '/host/review-renter',
                params: {
                  bookingId,
                  renterName: renter?.fullName,
                  renterAvatar: renter?.avatarUrl,
                },
              })}
            >
              <Ionicons name="star-outline" size={18} color="#FFF" />
              <Text style={styles.confirmBtnText}>Đánh giá khách</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.blockBtn}
            onPress={() => {
              Alert.alert(
                'Chặn khách thuê',
                `Chặn ${renter?.fullName}? Họ sẽ không thể đặt xe của bạn nữa.`,
                [
                  { text: 'Huỷ', style: 'cancel' },
                  { text: 'Chặn', style: 'destructive', onPress: async () => {
                    try {
                      await hostService.blockRenter(renter.id);
                      showSuccess(`Đã chặn ${renter.fullName}`);
                    } catch (e) { showError(e?.response?.data?.message || 'Thất bại'); }
                  }},
                ],
              );
            }}
          >
            <Ionicons name="ban-outline" size={16} color={COLORS.error} />
            <Text style={styles.blockBtnText}>Chặn khách</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal từ chối */}
      <Modal visible={rejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Lý do từ chối</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Nhập lý do (không bắt buộc)..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectModal(false)}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, processing && { opacity: 0.6 }]}
                onPress={handleReject}
                disabled={processing}
              >
                <Text style={styles.modalConfirmText}>{processing ? 'Đang xử lý...' : 'Từ chối'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '700' },
  bookingCode: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontFamily: 'monospace' },
  card: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cancelCard: { borderWidth: 1, borderColor: COLORS.error + '40' },
  cardTitle: {
    fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm,
  },
  vehicleRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  vehicleImg: { width: 80, height: 60, borderRadius: RADIUS.md },
  vehicleImgPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  vehiclePlate: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  vehicleAddr: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  renterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  renterAvatar: { width: 48, height: 48, borderRadius: 24 },
  renterAvatarPlaceholder: { backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  renterName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  renterEmail: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#10B981', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  callBtnText: { color: '#FFF', fontSize: FONT_SIZE.sm, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  infoLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: '500' },
  infoLink: { color: COLORS.primary },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  priceRowTotal: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    marginTop: SPACING.xs, paddingTop: SPACING.sm,
  },
  priceLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  priceVal: { fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: '500' },
  priceLabelTotal: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  priceValTotal: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.primary },
  noteText: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 22 },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    justifyContent: 'center', paddingVertical: SPACING.sm,
  },
  metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  actionBar: {
    flexDirection: 'row', gap: SPACING.sm,
    padding: SPACING.md, backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.error,
  },
  rejectBtnText: { color: COLORS.error, fontWeight: '700', fontSize: FONT_SIZE.sm },
  confirmBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  startBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: '#3B82F6',
  },
  doneBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: '#10B981',
  },
  waitingBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: SPACING.md,
  },
  waitingBarText: { color: '#F59E0B', fontWeight: '600', fontSize: FONT_SIZE.sm },
  confirmBtnText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.sm },
  reviewBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: '#F59E0B',
  },
  blockBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.error + '60',
  },
  blockBtnText: { color: COLORS.error, fontWeight: '700', fontSize: FONT_SIZE.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.xl, width: '85%',
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  reasonInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONT_SIZE.md, color: COLORS.text,
    minHeight: 80, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md, marginTop: SPACING.lg },
  modalCancel: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  modalCancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  modalConfirm: {
    backgroundColor: COLORS.error, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  modalConfirmText: { color: '#FFF', fontWeight: '600' },
});
