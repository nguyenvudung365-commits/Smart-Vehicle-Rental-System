import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/admin.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';


function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  return `${days} ngày trước`;
}

export default function AdminUsersScreen() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null); // { id, fullName, action: 'confirm'|'reject' }
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getDeleteRequests();
      setList(res.data?.data || []);
    } catch {
      showError('Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  async function handleAction() {
    if (!target) return;
    setProcessing(true);
    try {
      if (target.action === 'confirm') {
        await adminService.confirmDelete(target.id);
        showSuccess(`Đã xóa tài khoản ${target.fullName}`);
      } else {
        await adminService.rejectDelete(target.id);
        showSuccess(`Đã từ chối yêu cầu của ${target.fullName}`);
      }
      setTarget(null);
      load();
    } catch {
      showError('Thao tác thất bại');
    } finally {
      setProcessing(false);
    }
  }

  const ROLE_LABEL = { renter: 'Khách thuê', host: 'Chủ xe', admin: 'Admin' };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Yêu cầu xóa tài khoản</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SPACING.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={56} color={COLORS.success} />
              <Text style={styles.emptyTitle}>Không có yêu cầu nào</Text>
              <Text style={styles.emptySub}>Tất cả yêu cầu xóa tài khoản đã được xử lý</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <Text style={styles.phone}>{item.phone}</Text>
                  {item.email ? <Text style={styles.email}>{item.email}</Text> : null}
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{ROLE_LABEL[item.role] || item.role}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>
                  Yêu cầu: {timeAgo(item.deleteRequestedAt)}
                  {' · '}Tham gia: {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => setTarget({ id: item.id, fullName: item.fullName, action: 'reject' })}
                >
                  <Ionicons name="close-circle-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.rejectText}>Từ chối</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => setTarget({ id: item.id, fullName: item.fullName, action: 'confirm' })}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFF" />
                  <Text style={styles.confirmText}>Xác nhận xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal xác nhận */}
      <Modal visible={!!target} transparent animationType="fade" onRequestClose={() => setTarget(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Ionicons
              name={target?.action === 'confirm' ? 'warning-outline' : 'close-circle-outline'}
              size={40}
              color={target?.action === 'confirm' ? COLORS.error : COLORS.textSecondary}
              style={{ alignSelf: 'center', marginBottom: SPACING.sm }}
            />
            <Text style={styles.modalTitle}>
              {target?.action === 'confirm' ? 'Xác nhận xóa tài khoản' : 'Từ chối yêu cầu'}
            </Text>
            <Text style={styles.modalMsg}>
              {target?.action === 'confirm'
                ? `Tài khoản của "${target?.fullName}" sẽ bị xóa hoàn toàn khỏi hệ thống. Hành động này không thể hoàn tác.`
                : `Yêu cầu xóa tài khoản của "${target?.fullName}" sẽ bị hủy. Tài khoản vẫn hoạt động bình thường.`
              }
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setTarget(null)}
                disabled={processing}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalOk,
                  target?.action === 'reject' && styles.modalOkGray,
                  processing && { opacity: 0.6 },
                ]}
                onPress={handleAction}
                disabled={processing}
              >
                {processing
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.modalOkText}>
                      {target?.action === 'confirm' ? 'Xóa tài khoản' : 'Từ chối'}
                    </Text>
                }
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
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },

  empty: { alignItems: 'center', marginTop: 60, gap: SPACING.sm },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.text },
  emptySub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center' },

  card: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  name: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  phone: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  email: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  roleBadge: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  roleText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: '600' },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: SPACING.md,
  },
  metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  rejectText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.error, borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  confirmText: { fontSize: FONT_SIZE.sm, color: '#FFF', fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: COLORS.background, borderRadius: RADIUS.xl, padding: SPACING.xl, width: '85%' },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.sm },
  modalMsg: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  modalCancel: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  modalOk: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.error, alignItems: 'center' },
  modalOkGray: { backgroundColor: COLORS.textSecondary },
  modalOkText: { color: '#FFF', fontWeight: '700' },
});
