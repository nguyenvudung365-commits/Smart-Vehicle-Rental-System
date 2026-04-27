// FR-07: Man hinh danh sach xe cua host (sua/xoa/toggle)
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vehicleService } from '../../services/vehicle.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { formatPrice } from '../../utils/format';

const STATUS_MAP = {
  draft: { label: 'Nhap', color: COLORS.textSecondary },
  pending_review: { label: 'Cho duyet', color: COLORS.warning },
  active: { label: 'Dang hoat dong', color: COLORS.success },
  inactive: { label: 'Tam ngung', color: COLORS.textTertiary },
  rejected: { label: 'Tu choi', color: COLORS.error },
};

export default function HostVehiclesScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await vehicleService.getMyVehicles();
      if (result.success) setVehicles(result.data);
    } catch (err) {
      showError('Khong tai duoc danh sach xe');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await vehicleService.remove(deleteTarget.id);
      showSuccess('Da xoa xe');
      load();
    } catch (err) {
      showError(err.response?.data?.message || 'Xoa that bai');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleToggle(id) {
    try {
      await vehicleService.toggleAvailability(id);
      showSuccess('Da cap nhat trang thai');
      load();
    } catch (err) {
      showError(err.response?.data?.message || 'Cap nhat that bai');
    }
  }

  async function handleSubmitReview(id) {
    try {
      await vehicleService.submitForReview(id);
      showSuccess('Da gui duyet xe');
      load();
    } catch (err) {
      showError(err.response?.data?.message || 'Gui duyet that bai');
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: SPACING.lg }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="car-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>Chua co xe nao</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/host/add-vehicle')}>
              <Text style={styles.emptyBtnText}>Dang ky xe moi</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const st = STATUS_MAP[item.status] || STATUS_MAP.draft;
          const coverImage = item.images?.[0]?.imageUrl;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                {coverImage ? (
                  <Image source={coverImage} style={styles.cardImage} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <View style={[styles.cardImage, styles.noImage]}>
                    <Ionicons name="image-outline" size={24} color={COLORS.textTertiary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleName}>{item.brand} {item.model} {item.year}</Text>
                  <Text style={styles.plate}>{item.licensePlate}</Text>
                  <View style={[styles.badge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Gia thue:</Text>
                <Text style={styles.priceValue}>{formatPrice(item.pricePerDay)}/ngay</Text>
              </View>

              {/* Cac nut hanh dong tuy theo trang thai */}
              <View style={styles.actions}>
                {item.status === 'draft' && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleSubmitReview(item.id)}>
                    <Ionicons name="send-outline" size={16} color={COLORS.info} />
                    <Text style={[styles.actionText, { color: COLORS.info }]}>Gui duyet</Text>
                  </TouchableOpacity>
                )}
                {['active', 'inactive'].includes(item.status) && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggle(item.id)}>
                    <Ionicons
                      name={item.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'}
                      size={16}
                      color={item.status === 'active' ? COLORS.warning : COLORS.success}
                    />
                    <Text style={[styles.actionText, { color: item.status === 'active' ? COLORS.warning : COLORS.success }]}>
                      {item.status === 'active' ? 'Tam ngung' : 'Mo lai'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push({ pathname: '/host/edit-vehicle', params: { vehicleId: item.id } })}
                >
                  <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.actionText, { color: COLORS.primary }]}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setDeleteTarget({ id: item.id, name: `${item.brand} ${item.model}` })}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  <Text style={[styles.actionText, { color: COLORS.error }]}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Nut them xe */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/host/add-vehicle')}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Modal xac nhan xoa — thay Alert.alert */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Xoa xe</Text>
            <Text style={styles.confirmMsg}>Ban co chac muon xoa {deleteTarget?.name}?</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.confirmCancelText}>Huy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOk} onPress={confirmDelete}>
                <Text style={styles.confirmOkText}>Xoa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: SPACING.xxl },
  emptyText: { color: COLORS.textSecondary, marginTop: SPACING.md, fontSize: FONT_SIZE.md },
  emptyBtn: {
    marginTop: SPACING.md, backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
  },
  emptyBtnText: { color: '#FFF', fontWeight: '600' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  cardImage: { width: 90, height: 65, borderRadius: RADIUS.sm },
  noImage: { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  vehicleName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  plate: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm, marginTop: 4 },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  priceLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  priceValue: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.primary },
  actions: {
    flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: SPACING.lg, right: SPACING.lg,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
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
