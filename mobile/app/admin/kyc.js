import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, ScrollView, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { adminService } from '../../services/admin.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';

const { width } = Dimensions.get('window');

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()}`;
}

export default function AdminKycScreen() {
  const [list, setList]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null); // KYC đang xem chi tiết
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject]     = useState(false);
  const [processing, setProcessing]     = useState(false);
  const [zoomImg, setZoomImg]     = useState(null); // URL ảnh phóng to

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setLoading(true);
    try {
      const res = await adminService.getPendingKyc();
      setList(res.data?.data || []);
    } catch { setList([]); }
    finally { setLoading(false); }
  }

  async function handleApprove(id) {
    setProcessing(true);
    try {
      await adminService.reviewKyc(id, 'approved');
      showSuccess('Đã duyệt GPLX');
      setSelected(null);
      load();
    } catch { showError('Duyệt thất bại'); }
    finally { setProcessing(false); }
  }

  async function handleReject(id) {
    setProcessing(true);
    try {
      await adminService.reviewKyc(id, 'rejected', rejectReason);
      showSuccess('Đã từ chối GPLX');
      setShowReject(false);
      setRejectReason('');
      setSelected(null);
      load();
    } catch { showError('Từ chối thất bại'); }
    finally { setProcessing(false); }
  }

  function renderCard({ item }) {
    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.82}>
        <View style={styles.cardTop}>
          <View style={styles.cardAvatar}>
            <Ionicons name="person" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.user?.fullName}</Text>
            <Text style={styles.cardSub}>{item.user?.phone || item.user?.email}</Text>
          </View>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Chờ duyệt</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <Ionicons name="card-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.cardMetaText}>GPLX: {item.licenseNumber}</Text>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} style={{ marginLeft: SPACING.md }} />
          <Text style={styles.cardMetaText}>Nộp: {formatDate(item.submittedAt)}</Text>
        </View>
        <View style={styles.cardHint}>
          <Text style={styles.cardHintText}>Bấm để xem chi tiết & duyệt</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duyệt GPLX ({list.length})</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}
          renderItem={renderCard}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>Không có GPLX chờ duyệt</Text>
            </View>
          }
        />
      )}

      {/* Modal chi tiết KYC */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chi tiết GPLX</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 120 }}>
            {/* Thông tin người nộp */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Người nộp hồ sơ</Text>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.infoLabel}>Họ tên tài khoản:</Text>
                <Text style={styles.infoVal}>{selected?.user?.fullName}</Text>
              </View>
              {selected?.user?.phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.infoLabel}>Số điện thoại:</Text>
                  <Text style={styles.infoVal}>{selected.user.phone}</Text>
                </View>
              )}
              {selected?.user?.email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoVal}>{selected.user.email}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.infoLabel}>Ngày tạo tài khoản:</Text>
                <Text style={styles.infoVal}>{formatDate(selected?.user?.createdAt)}</Text>
              </View>
            </View>

            {/* Thông tin GPLX */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin GPLX</Text>
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.infoLabel}>Số GPLX:</Text>
                <Text style={[styles.infoVal, styles.highlight]}>{selected?.licenseNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.infoLabel}>Tên trên GPLX:</Text>
                <Text style={[styles.infoVal, styles.highlight]}>{selected?.fullName}</Text>
              </View>
              {selected?.dob && (
                <View style={styles.infoRow}>
                  <Ionicons name="gift-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.infoLabel}>Ngày sinh:</Text>
                  <Text style={styles.infoVal}>{formatDate(selected.dob)}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.infoLabel}>Ngày nộp:</Text>
                <Text style={styles.infoVal}>{formatDate(selected?.submittedAt)}</Text>
              </View>
            </View>

            {/* Ảnh GPLX */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ảnh GPLX (bấm để phóng to)</Text>
              <View style={styles.imgRow}>
                <TouchableOpacity style={styles.licenseImgWrap} onPress={() => setZoomImg(selected?.frontImageUrl)}>
                  <Image source={{ uri: selected?.frontImageUrl }} style={styles.licenseImg} contentFit="cover" />
                  <View style={styles.imgLabel}>
                    <Text style={styles.imgLabelText}>Mặt trước</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.licenseImgWrap} onPress={() => setZoomImg(selected?.backImageUrl)}>
                  <Image source={{ uri: selected?.backImageUrl }} style={styles.licenseImg} contentFit="cover" />
                  <View style={styles.imgLabel}>
                    <Text style={styles.imgLabelText}>Mặt sau</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* CCCD (nếu có) */}
            {selected?.cccdNumber && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin CCCD</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="card-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.infoLabel}>Số CCCD:</Text>
                  <Text style={[styles.infoVal, styles.highlight]}>{selected.cccdNumber}</Text>
                </View>
                {(selected.cccdFrontImageUrl || selected.cccdBackImageUrl) && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: SPACING.sm }]}>Ảnh CCCD (bấm để phóng to)</Text>
                    <View style={styles.imgRow}>
                      {selected.cccdFrontImageUrl && (
                        <TouchableOpacity style={styles.licenseImgWrap} onPress={() => setZoomImg(selected.cccdFrontImageUrl)}>
                          <Image source={{ uri: selected.cccdFrontImageUrl }} style={styles.licenseImg} contentFit="cover" />
                          <View style={styles.imgLabel}><Text style={styles.imgLabelText}>Mặt trước</Text></View>
                        </TouchableOpacity>
                      )}
                      {selected.cccdBackImageUrl && (
                        <TouchableOpacity style={styles.licenseImgWrap} onPress={() => setZoomImg(selected.cccdBackImageUrl)}>
                          <Image source={{ uri: selected.cccdBackImageUrl }} style={styles.licenseImg} contentFit="cover" />
                          <View style={styles.imgLabel}><Text style={styles.imgLabelText}>Mặt sau</Text></View>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => { setShowReject(true); setRejectReason(''); }}
              disabled={processing}
            >
              <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
              <Text style={styles.rejectBtnText}>Từ chối</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.approveBtn, processing && { opacity: 0.6 }]}
              onPress={() => handleApprove(selected?.id)}
              disabled={processing}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
              <Text style={styles.approveBtnText}>{processing ? 'Đang xử lý...' : 'Duyệt GPLX'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal từ chối */}
      <Modal visible={showReject} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.rejectBox}>
            <Text style={styles.rejectBoxTitle}>Lý do từ chối</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Nhập lý do từ chối (không bắt buộc)..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline numberOfLines={3}
            />
            <View style={styles.rejectBoxActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReject(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmRejectBtn, processing && { opacity: 0.6 }]}
                onPress={() => handleReject(selected?.id)}
                disabled={processing}
              >
                <Text style={styles.confirmRejectText}>{processing ? 'Đang xử lý...' : 'Xác nhận từ chối'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal phóng to ảnh */}
      <Modal visible={!!zoomImg} transparent animationType="fade" onRequestClose={() => setZoomImg(null)}>
        <TouchableOpacity style={styles.zoomOverlay} activeOpacity={1} onPress={() => setZoomImg(null)}>
          <Image source={{ uri: zoomImg }} style={styles.zoomImg} contentFit="contain" />
          <View style={styles.zoomClose}>
            <Ionicons name="close-circle" size={36} color="#FFF" />
          </View>
        </TouchableOpacity>
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
  card: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  cardAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  pendingBadge: {
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pendingText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.xs },
  cardMetaText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  cardHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: SPACING.xs },
  cardHintText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  empty: { alignItems: 'center', marginTop: 60, gap: SPACING.md },
  emptyText: { color: COLORS.textSecondary },
  section: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 },
  infoLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, width: 140 },
  infoVal: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: '500' },
  highlight: { fontWeight: '700', color: COLORS.primary },
  imgRow: { flexDirection: 'row', gap: SPACING.md },
  licenseImgWrap: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden', position: 'relative' },
  licenseImg: { width: '100%', height: 160, backgroundColor: COLORS.surface },
  imgLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 4, alignItems: 'center',
  },
  imgLabelText: { color: '#FFF', fontSize: FONT_SIZE.xs, fontWeight: '600' },
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
  approveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#10B981',
  },
  approveBtnText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.sm },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  rejectBox: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.xl, width: '88%',
  },
  rejectBoxTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  reasonInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONT_SIZE.md, color: COLORS.text,
    minHeight: 80, textAlignVertical: 'top',
  },
  rejectBoxActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md, marginTop: SPACING.lg },
  cancelBtn: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmRejectBtn: {
    backgroundColor: COLORS.error, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  confirmRejectText: { color: '#FFF', fontWeight: '600' },
  zoomOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  zoomImg: { width: width, height: width * 0.7 },
  zoomClose: { position: 'absolute', top: 48, right: 16 },
});
