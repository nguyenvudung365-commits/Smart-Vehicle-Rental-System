// Admin: Duyệt KYC pending
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

export default function AdminKycScreen() {
  const [kycs, setKycs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null); // userId
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [previewKyc, setPreviewKyc] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.getPendingKycs();
      if (result.success) setKycs(result.data);
    } catch {
      showError('Không tải được danh sách KYC');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(userId) {
    setProcessing(true);
    try {
      await adminService.approveKyc(userId);
      showSuccess('Đã duyệt KYC');
      setKycs(prev => prev.filter(k => k.userId !== userId));
      setPreviewKyc(null);
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
      await adminService.rejectKyc(rejectTarget, rejectReason);
      showSuccess('Đã từ chối KYC');
      setKycs(prev => prev.filter(k => k.userId !== rejectTarget));
      setRejectTarget(null);
      setRejectReason('');
      setPreviewKyc(null);
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
        <Text style={styles.headerTitle}>Duyệt KYC ({kycs.length})</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={kycs}
          keyExtractor={item => item.userId}
          contentContainerStyle={{ padding: SPACING.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color={COLORS.success} />
              <Text style={styles.emptyText}>Không có KYC nào chờ duyệt</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.userRow}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.user?.fullName}</Text>
                  <Text style={styles.userPhone}>{item.user?.phone}</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>Chờ duyệt</Text>
                </View>
              </View>

              <View style={styles.kycInfo}>
                <Text style={styles.kycLabel}>GPLX: <Text style={styles.kycValue}>{item.licenseNumber}</Text></Text>
                <Text style={styles.kycLabel}>Họ tên KYC: <Text style={styles.kycValue}>{item.fullName}</Text></Text>
              </View>

              {/* Xem ảnh GPLX */}
              <TouchableOpacity style={styles.previewBtn} onPress={() => setPreviewKyc(item)}>
                <Ionicons name="images-outline" size={16} color={COLORS.primary} />
                <Text style={styles.previewTxt}>Xem ảnh GPLX</Text>
              </TouchableOpacity>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(item.userId)}
                  disabled={processing}
                >
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.approveTxt}>Duyệt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => { setRejectTarget(item.userId); setRejectReason(''); }}
                  disabled={processing}
                >
                  <Ionicons name="close" size={18} color={COLORS.error} />
                  <Text style={styles.rejectTxt}>Từ chối</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal xem ảnh KYC */}
      <Modal visible={!!previewKyc} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ảnh GPLX — {previewKyc?.user?.fullName}</Text>
              <TouchableOpacity onPress={() => setPreviewKyc(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.imgLabel}>Mặt trước</Text>
            {previewKyc?.frontImageUrl && (
              <Image source={previewKyc.frontImageUrl} style={styles.kycImg} contentFit="contain" />
            )}
            <Text style={[styles.imgLabel, { marginTop: SPACING.md }]}>Mặt sau</Text>
            {previewKyc?.backImageUrl && (
              <Image source={previewKyc.backImageUrl} style={styles.kycImg} contentFit="contain" />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleApprove(previewKyc.userId)}
                disabled={processing}
              >
                <Text style={styles.approveTxt}>Duyệt KYC này</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => { setRejectTarget(previewKyc.userId); setRejectReason(''); setPreviewKyc(null); }}
                disabled={processing}
              >
                <Text style={styles.rejectTxt}>Từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal từ chối */}
      <Modal visible={!!rejectTarget} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Lý do từ chối KYC</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Ảnh không rõ, thông tin sai, GPLX hết hạn..."
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
                  : <Text style={styles.confirmTxt}>Xác nhận</Text>
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
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  userName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  userPhone: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  pendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  pendingText: { fontSize: FONT_SIZE.xs, color: '#92400E', fontWeight: '600' },

  kycInfo: { gap: 4, marginBottom: SPACING.sm },
  kycLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  kycValue: { color: COLORS.text, fontWeight: '600' },

  previewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: SPACING.sm, paddingVertical: SPACING.xs,
  },
  previewTxt: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: SPACING.sm },
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

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  imgLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  kycImg: { width: '100%', height: 180, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  reasonInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, minHeight: 80, fontSize: FONT_SIZE.sm, color: COLORS.text, marginBottom: SPACING.lg,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  cancelBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelTxt: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: COLORS.error },
  confirmTxt: { color: '#FFF', fontWeight: '700' },
});
