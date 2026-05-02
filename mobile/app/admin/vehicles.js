// Admin: Duyệt xe pending
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/admin.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { formatPrice } from '../../utils/format';

export default function AdminVehiclesScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.getPendingVehicles();
      if (result.success) setVehicles(result.data);
    } catch {
      showError('Không tải được danh sách xe chờ duyệt');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id) {
    setProcessing(true);
    try {
      await adminService.approveVehicle(id);
      showSuccess('Đã duyệt xe');
      setVehicles(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      showError(err.response?.data?.message || 'Duyệt thất bại');
    } finally {
      setProcessing(false);
    }
  }

  async function handleRejectConfirm() {
    if (!rejectTarget) return;
    setProcessing(true);
    try {
      await adminService.rejectVehicle(rejectTarget, rejectReason);
      showSuccess('Đã từ chối xe');
      setVehicles(prev => prev.filter(v => v.id !== rejectTarget));
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      showError(err.response?.data?.message || 'Từ chối thất bại');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duyệt xe ({vehicles.length})</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SPACING.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color={COLORS.success} />
              <Text style={styles.emptyText}>Không có xe nào chờ duyệt</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cover = item.images?.[0]?.imageUrl;
            return (
              <View style={styles.card}>
                {cover && (
                  <Image source={cover} style={styles.carImg} contentFit="cover" cachePolicy="memory-disk" />
                )}
                <View style={styles.info}>
                  <Text style={styles.carName}>{item.brand} {item.model} {item.year}</Text>
                  <Text style={styles.carPlate}>{item.licensePlate}</Text>
                  <Text style={styles.carPrice}>{formatPrice(item.pricePerDay)}/ngày</Text>
                  <Text style={styles.carOwner}>
                    <Ionicons name="person-outline" size={13} /> {item.owner?.fullName} · {item.owner?.phone}
                  </Text>
                  {item.address && (
                    <Text style={styles.carAddr} numberOfLines={1}>
                      {[item.address.district, item.address.province].filter(Boolean).join(', ')}
                    </Text>
                  )}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(item.id)}
                    disabled={processing}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={styles.approveTxt}>Duyệt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => { setRejectTarget(item.id); setRejectReason(''); }}
                    disabled={processing}
                  >
                    <Ionicons name="close" size={18} color={COLORS.error} />
                    <Text style={styles.rejectTxt}>Từ chối</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modal từ chối */}
      <Modal visible={!!rejectTarget} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Lý do từ chối</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Nhập lý do từ chối xe..."
              placeholderTextColor={COLORS.textTertiary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejectTarget(null)}>
                <Text style={styles.cancelTxt}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleRejectConfirm} disabled={processing}>
                {processing
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.confirmTxt}>Xác nhận từ chối</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  empty: { alignItems: 'center', gap: SPACING.md, paddingTop: 80 },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, overflow: 'hidden',
  },
  carImg: { width: '100%', height: 160 },
  info: { padding: SPACING.md },
  carName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  carPlate: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  carPrice: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.primary, marginTop: 4 },
  carOwner: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },
  carAddr: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md, paddingTop: 0 },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.success, borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  approveTxt: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.sm },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderColor: COLORS.error, borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  rejectTxt: { color: COLORS.error, fontWeight: '700', fontSize: FONT_SIZE.sm },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  reasonInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, minHeight: 80, fontSize: FONT_SIZE.sm, color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelTxt: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: COLORS.error },
  confirmTxt: { color: '#FFF', fontWeight: '700' },
});
