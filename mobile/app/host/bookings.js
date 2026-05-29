import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { bookingService } from '../../services/booking.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { formatPrice } from '../../utils/format';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending_payment', label: 'Chờ duyệt' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'in_progress', label: 'Đang thuê' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const STATUS_COLORS = {
  pending_payment: '#F59E0B',
  confirmed: '#3B82F6',
  in_progress: '#10B981',
  completed: '#6B7280',
  cancelled: '#EF4444',
};

const STATUS_LABELS = {
  pending_payment: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang thuê',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

export default function HostBookingsScreen() {
  const [activeTab, setActiveTab] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null); // { bookingId }
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useFocusEffect(useCallback(() => {
    loadBookings(activeTab);
  }, [activeTab]));

  async function loadBookings(status) {
    setLoading(true);
    try {
      const res = await bookingService.getHostBookings(status === 'all' ? null : status);
      setBookings(res.data || []);
    } catch {
      showError('Không thể tải danh sách đơn thuê');
    } finally {
      setLoading(false);
    }
  }

  function changeTab(key) {
    setActiveTab(key);
  }

  async function handleConfirm(bookingId) {
    Alert.alert(
      'Xác nhận đơn thuê',
      'Bạn có chắc muốn xác nhận đơn thuê này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setProcessing(true);
            try {
              await bookingService.hostConfirm(bookingId);
              showSuccess('Đã xác nhận đơn thuê');
              loadBookings(activeTab);
            } catch {
              showError('Không thể xác nhận đơn, vui lòng thử lại');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  }

  async function handleReject() {
    if (!rejectModal) return;
    setProcessing(true);
    try {
      await bookingService.hostReject(rejectModal.bookingId, rejectReason);
      showSuccess('Đã từ chối đơn thuê');
      setRejectModal(null);
      setRejectReason('');
      loadBookings(activeTab);
    } catch {
      showError('Không thể từ chối đơn, vui lòng thử lại');
    } finally {
      setProcessing(false);
    }
  }

  function renderBookingItem({ item }) {
    const isPending = item.status === 'pending_payment';
    const coverImage = item.vehicle?.images?.[0]?.imageUrl;

    return (
      <View style={styles.card}>
        {/* Thông tin xe */}
        <View style={styles.vehicleRow}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.vehicleImg} contentFit="cover" />
          ) : (
            <View style={[styles.vehicleImg, styles.vehicleImgPlaceholder]}>
              <Ionicons name="car-outline" size={24} color={COLORS.textTertiary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName}>{item.vehicle?.brand} {item.vehicle?.model}</Text>
            <Text style={styles.vehicleLoc} numberOfLines={1}>
              {item.vehicle?.address?.district}, {item.vehicle?.address?.province}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        {/* Khách thuê */}
        <View style={styles.renterRow}>
          {item.renter?.avatarUrl ? (
            <Image source={{ uri: item.renter.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={14} color={COLORS.primary} />
            </View>
          )}
          <Text style={styles.renterName}>{item.renter?.fullName}</Text>
          <Text style={styles.renterPhone}>{item.renter?.phone}</Text>
        </View>

        {/* Thời gian & giá */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{formatDate(item.startDate)} — {formatDate(item.endDate)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{item.rentalDays} ngày</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Tổng tiền</Text>
          <Text style={styles.priceValue}>{formatPrice(Number(item.totalAmount))}</Text>
        </View>

        {item.note ? (
          <Text style={styles.note}>Ghi chú: {item.note}</Text>
        ) : null}

        {/* Nút xác nhận/từ chối cho đơn chờ */}
        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => { setRejectModal({ bookingId: item.id }); setRejectReason(''); }}
            >
              <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
              <Text style={styles.rejectBtnText}>Từ chối</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => handleConfirm(item.id)}
              disabled={processing}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
              <Text style={styles.confirmBtnText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bấm vào card để xem chi tiết */}
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => router.push({ pathname: '/host/booking-detail', params: { bookingId: item.id } })}
        >
          <Text style={styles.detailBtnText}>Xem chi tiết</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn thuê xe của tôi</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs trạng thái */}
      <View>
        <FlatList
          data={STATUS_TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={t => t.key}
          contentContainerStyle={styles.tabList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === item.key && styles.tabActive]}
              onPress={() => changeTab(item.key)}
            >
              <Text style={[styles.tabText, activeTab === item.key && styles.tabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Danh sách */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}
          renderItem={renderBookingItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>Chưa có đơn thuê nào</Text>
            </View>
          }
        />
      )}

      {/* Modal từ chối */}
      <Modal visible={!!rejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Lý do từ chối</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Nhập lý do từ chối (không bắt buộc)..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setRejectModal(null); setRejectReason(''); }}
              >
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
  tabList: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
  tab: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  tabTextActive: { color: '#FFF', fontWeight: '600' },
  card: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  vehicleImg: { width: 60, height: 45, borderRadius: RADIUS.sm },
  vehicleImgPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  vehicleLoc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  renterRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarPlaceholder: { backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  renterName: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  renterPhone: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  infoRow: {
    flexDirection: 'row', gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.xs,
  },
  priceLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  priceValue: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.primary },
  note: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: SPACING.xs, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.error,
  },
  rejectBtnText: { color: COLORS.error, fontWeight: '600', fontSize: FONT_SIZE.sm },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  confirmBtnText: { color: '#FFF', fontWeight: '600', fontSize: FONT_SIZE.sm },
  detailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 4, marginTop: SPACING.sm, paddingTop: SPACING.xs,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  detailBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: SPACING.xxl, gap: SPACING.sm },
  emptyText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
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
