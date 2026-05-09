import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Alert
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { bookingService } from '../../services/booking.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { formatPrice, formatDate } from '../../utils/format';
import { SafeAreaView } from 'react-native-safe-area-context';


const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending_payment', label: 'Chờ duyệt' },
  { key: 'confirmed', label: 'Sắp tới' },
  { key: 'in_progress', label: 'Đang thuê' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const STATUS_MAP = {
  pending_payment: { label: 'Chờ xác nhận',      color: COLORS.warning },
  confirmed:       { label: 'Đã xác nhận',        color: COLORS.info },
  host_handover:   { label: 'Chờ bạn nhận xe',   color: '#8B5CF6' },
  in_progress:     { label: 'Đang thuê',          color: COLORS.primary },
  renter_return:   { label: 'Chờ chủ xe xác nhận', color: COLORS.warning },
  completed:       { label: 'Hoàn thành',         color: COLORS.success },
  cancelled:       { label: 'Đã hủy',             color: COLORS.error },
};

export default function TripsTab() {
  const [activeTab, setActiveTab] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const router = useRouter();

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await bookingService.getMyBookings(activeTab);
      if (result.success) setBookings(result.data);
    } catch {
      showError('Không tải được danh sách chuyến đi');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  async function pickImageAndAction(actionFn, successMsg) {
    Alert.alert(
      'Chụp ảnh xác nhận',
      'Bạn có muốn chụp ảnh xe để làm bằng chứng không?',
      [
        {
          text: 'Không cần',
          onPress: async () => {
            try { await actionFn(null); showSuccess(successMsg); loadBookings(); }
            catch (err) { showError(err.response?.data?.message || 'Thao tác thất bại'); }
          },
        },
        {
          text: 'Chụp ảnh',
          onPress: async () => {
            const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
            const imageUri = res.canceled ? null : res.assets[0].uri;
            try { await actionFn(imageUri); showSuccess(successMsg); loadBookings(); }
            catch (err) { showError(err.response?.data?.message || 'Thao tác thất bại'); }
          },
        },
      ]
    );
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    try {
      await bookingService.cancel(cancelTarget, 'Khách hủy');
      showSuccess('Đã hủy đơn');
      loadBookings();
    } catch (err) {
      showError(err.response?.data?.message || 'Hủy thất bại');
    } finally {
      setCancelTarget(null);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.tab, activeTab === item.key && styles.tabActive]}
            onPress={() => setActiveTab(item.key)}
          >
            <Text style={[styles.tabText, activeTab === item.key && styles.tabTextActive]}
              numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={bookings}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SPACING.lg }}
          ListEmptyComponent={<Text style={styles.empty}>Không có chuyến đi nào</Text>}
          renderItem={({ item }) => {
            const st = STATUS_MAP[item.status] || STATUS_MAP.confirmed;
            const coverImage = item.vehicle?.images?.[0]?.imageUrl;
            return (
              <View style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  {coverImage && (
                    <Image source={coverImage} style={styles.bookingImage} contentFit="cover" cachePolicy="memory-disk" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleName}>
                      {item.vehicle?.brand} {item.vehicle?.model}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.bookingInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>
                      {formatDate(item.startDate)} - {formatDate(item.endDate)} ({item.rentalDays} ngày)
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>{formatPrice(item.totalAmount)}</Text>
                  </View>
                </View>

                {item.status === 'pending_payment' && (
                  <View style={styles.waitingRow}>
                    <Ionicons name="time-outline" size={14} color="#F59E0B" />
                    <Text style={styles.waitingText}>Đang chờ chủ xe xác nhận...</Text>
                  </View>
                )}
                {item.status === 'confirmed' && (
                  <View style={styles.waitingRow}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#3B82F6" />
                    <Text style={[styles.waitingText, { color: '#3B82F6' }]}>Chờ chủ xe bàn giao xe</Text>
                  </View>
                )}
                {item.status === 'host_handover' && (
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => pickImageAndAction(
                      (img) => bookingService.renterReceived(item.id, img),
                      'Đã xác nhận nhận xe!'
                    )}
                  >
                    <Ionicons name="car-outline" size={16} color="#fff" />
                    <Text style={styles.startBtnText}>Đã nhận được xe</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'in_progress' && (
                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={() => pickImageAndAction(
                      (img) => bookingService.renterReturn(item.id, img),
                      'Đã trả xe, chờ chủ xe xác nhận!'
                    )}
                  >
                    <Ionicons name="flag-outline" size={16} color="#fff" />
                    <Text style={styles.startBtnText}>Hoàn thành chuyến đi</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'renter_return' && (
                  <View style={styles.waitingRow}>
                    <Ionicons name="time-outline" size={14} color="#F59E0B" />
                    <Text style={styles.waitingText}>Đã trả xe, chờ chủ xe xác nhận...</Text>
                  </View>
                )}
                {item.status === 'completed' && !item.review && !reviewedIds.has(item.id) && (
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => router.push({ pathname: '/review/create', params: { bookingId: item.id } })}
                  >
                    <Ionicons name="star-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.reviewBtnText}>Đánh giá chuyến đi</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'completed' && (item.review || reviewedIds.has(item.id)) && (
                  <TouchableOpacity
                    style={styles.viewReviewBtn}
                    onPress={() => router.push({ pathname: '/review/create', params: { bookingId: item.id, viewOnly: '1', rating: item.review?.rating, comment: item.review?.comment } })}
                  >
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.viewReviewText}>Xem đánh giá</Text>
                  </TouchableOpacity>
                )}
                {['pending_payment', 'confirmed'].includes(item.status) && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setCancelTarget(item.id)}>
                    <Text style={styles.cancelBtnText}>Hủy đơn</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      <Modal visible={!!cancelTarget} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Hủy đơn</Text>
            <Text style={styles.confirmMsg}>Bạn có chắc muốn hủy đơn này?</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setCancelTarget(null)}>
                <Text style={styles.confirmCancelText}>Không</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOk} onPress={confirmCancel}>
                <Text style={styles.confirmOkText}>Hủy đơn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm, paddingVertical: 5, gap: 4,
    marginTop: 44,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1, height: 28,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: COLORS.surface,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.textSecondary },
  tabTextActive: { color: '#FFF', fontWeight: '600' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.xl },
  bookingCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  bookingHeader: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  bookingImage: { width: 80, height: 60, borderRadius: RADIUS.sm },
  vehicleName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm, marginTop: 4 },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  bookingInfo: { marginTop: SPACING.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  infoText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.sm, justifyContent: 'center', marginTop: SPACING.sm,
  },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#8B5CF6', borderRadius: RADIUS.md,
    padding: SPACING.sm, justifyContent: 'center', marginTop: SPACING.sm,
  },
  startBtnText: { color: '#fff', fontWeight: '600', fontSize: FONT_SIZE.sm },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.sm, justifyContent: 'center', marginTop: SPACING.sm,
  },
  reviewBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT_SIZE.sm },
  viewReviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.md,
    padding: SPACING.sm, justifyContent: 'center', marginTop: SPACING.sm,
  },
  viewReviewText: { color: '#D97706', fontWeight: '600', fontSize: FONT_SIZE.sm },
  waitingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: SPACING.sm, paddingVertical: 4,
  },
  waitingText: { fontSize: FONT_SIZE.xs, color: '#F59E0B', fontWeight: '600' },
  cancelBtn: {
    borderWidth: 1, borderColor: COLORS.error, borderRadius: RADIUS.md,
    padding: SPACING.sm, alignItems: 'center', marginTop: SPACING.sm,
  },
  cancelBtnText: { color: COLORS.error, fontWeight: '600', fontSize: FONT_SIZE.sm },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '80%' },
  confirmTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  confirmMsg: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md },
  confirmCancel: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  confirmCancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmOk: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.error },
  confirmOkText: { color: '#FFF', fontWeight: '600' },
});
