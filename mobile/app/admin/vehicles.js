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
import { formatPrice } from '../../utils/format';

const { width } = Dimensions.get('window');

const TRANSMISSION_LABEL = { automatic: 'Số tự động', manual: 'Số sàn' };
const FUEL_LABEL = { gasoline: 'Xăng', diesel: 'Dầu diesel', electric: 'Điện', hybrid: 'Hybrid' };

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()}`;
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={COLORS.textSecondary} style={{ width: 22 }} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoVal}>{value ?? '—'}</Text>
    </View>
  );
}

export default function AdminVehiclesScreen() {
  const [list, setList]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject]     = useState(false);
  const [processing, setProcessing]     = useState(false);
  const [zoomImg, setZoomImg]     = useState(null);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setLoading(true);
    try {
      const res = await adminService.getPendingVehicles();
      setList(res.data?.data || []);
    } catch { setList([]); }
    finally { setLoading(false); }
  }

  async function handleApprove(id) {
    setProcessing(true);
    try {
      await adminService.reviewVehicle(id, 'approved');
      showSuccess('Đã duyệt xe');
      setSelected(null);
      load();
    } catch { showError('Duyệt thất bại'); }
    finally { setProcessing(false); }
  }

  async function handleReject(id) {
    setProcessing(true);
    try {
      await adminService.reviewVehicle(id, 'rejected', rejectReason);
      showSuccess('Đã từ chối xe');
      setShowReject(false);
      setRejectReason('');
      setSelected(null);
      load();
    } catch { showError('Từ chối thất bại'); }
    finally { setProcessing(false); }
  }

  function openDetail(item) {
    setSelected(item);
    setActiveImg(0);
  }

  function renderCard({ item }) {
    const cover = item.images?.find(i => i.isCover)?.imageUrl || item.images?.[0]?.imageUrl;
    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetail(item)} activeOpacity={0.82}>
        <View style={styles.cardTop}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.cardThumb} contentFit="cover" />
          ) : (
            <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
              <Ionicons name="car-outline" size={24} color={COLORS.textTertiary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.brand} {item.model} {item.year}</Text>
            <Text style={styles.cardPlate}>{item.licensePlate}</Text>
            <Text style={styles.cardOwner}>Chủ xe: {item.owner?.fullName}</Text>
          </View>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Chờ duyệt</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <Ionicons name="cash-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.cardMetaText}>{formatPrice(Number(item.pricePerDay))}/ngày</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Ionicons name="people-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.cardMetaText}>{item.seats} chỗ</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMetaText}>{TRANSMISSION_LABEL[item.transmission] || item.transmission}</Text>
        </View>
        <View style={styles.cardHint}>
          <Text style={styles.cardHintText}>Bấm để xem chi tiết & duyệt</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  }

  const images = selected?.images || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duyệt xe ({list.length})</Text>
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
              <Text style={styles.emptyText}>Không có xe chờ duyệt</Text>
            </View>
          }
        />
      )}

      {/* Modal chi tiết xe */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selected?.brand} {selected?.model} {selected?.year}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
            {/* Ảnh xe */}
            {images.length > 0 ? (
              <View>
                <TouchableOpacity onPress={() => setZoomImg(images[activeImg]?.imageUrl)}>
                  <Image
                    source={{ uri: images[activeImg]?.imageUrl }}
                    style={styles.mainImg}
                    contentFit="cover"
                  />
                  <View style={styles.imgCountBadge}>
                    <Ionicons name="images-outline" size={12} color="#FFF" />
                    <Text style={styles.imgCountText}>{activeImg + 1}/{images.length}</Text>
                  </View>
                </TouchableOpacity>
                {images.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.thumbScroll}>
                    {images.map((img, idx) => (
                      <TouchableOpacity key={img.id} onPress={() => setActiveImg(idx)}>
                        <Image
                          source={{ uri: img.imageUrl }}
                          style={[styles.thumbImg, activeImg === idx && styles.thumbImgActive]}
                          contentFit="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : (
              <View style={styles.noImgBox}>
                <Ionicons name="image-outline" size={40} color={COLORS.textTertiary} />
                <Text style={styles.noImgText}>Chưa có ảnh</Text>
              </View>
            )}

            <View style={{ padding: SPACING.md }}>
              {/* Thông tin chủ xe */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chủ xe</Text>
                <InfoRow icon="person-outline"   label="Họ tên"        value={selected?.owner?.fullName} />
                <InfoRow icon="call-outline"     label="Số điện thoại" value={selected?.owner?.phone} />
                <InfoRow icon="mail-outline"     label="Email"         value={selected?.owner?.email} />
              </View>

              {/* Thông tin xe */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin xe</Text>
                <InfoRow icon="car-outline"       label="Hãng / Dòng xe"  value={`${selected?.brand} ${selected?.model}`} />
                <InfoRow icon="calendar-outline"  label="Năm sản xuất"    value={selected?.year} />
                <InfoRow icon="card-outline"      label="Biển số"         value={selected?.licensePlate} />
                <InfoRow icon="people-outline"    label="Số chỗ"          value={`${selected?.seats} chỗ`} />
                <InfoRow icon="settings-outline"  label="Truyền động"     value={TRANSMISSION_LABEL[selected?.transmission]} />
                <InfoRow icon="flame-outline"     label="Nhiên liệu"      value={FUEL_LABEL[selected?.fuelType]} />
                {selected?.fuelConsumption && (
                  <InfoRow icon="speedometer-outline" label="Tiêu thụ nhiên liệu" value={`${selected.fuelConsumption} L/100km`} />
                )}
                {selected?.kmLimitPerDay && (
                  <InfoRow icon="navigate-outline" label="Giới hạn km/ngày" value={`${selected.kmLimitPerDay} km`} />
                )}
              </View>

              {/* Giá */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Giá cho thuê</Text>
                <InfoRow icon="cash-outline" label="Giá/ngày" value={formatPrice(Number(selected?.pricePerDay))} />
                {selected?.overageFeePerKm && (
                  <InfoRow icon="alert-circle-outline" label="Phí vượt km" value={`${formatPrice(Number(selected.overageFeePerKm))}/km`} />
                )}
              </View>

              {/* Địa chỉ */}
              {selected?.address && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Địa chỉ xe</Text>
                  <InfoRow icon="location-outline" label="Tỉnh/Thành"  value={selected.address.province} />
                  <InfoRow icon="map-outline"      label="Quận/Huyện"  value={selected.address.district} />
                  {selected.address.ward   && <InfoRow icon="pin-outline" label="Phường/Xã"   value={selected.address.ward} />}
                  {selected.address.detail && <InfoRow icon="home-outline" label="Địa chỉ"    value={selected.address.detail} />}
                </View>
              )}

              {/* Tính năng */}
              {selected?.features?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tính năng</Text>
                  <View style={styles.featureWrap}>
                    {selected.features.map(f => (
                      <View key={f.featureId} style={styles.featureChip}>
                        <Text style={styles.featureChipText}>{f.feature?.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Mô tả */}
              {selected?.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Mô tả của chủ xe</Text>
                  <Text style={styles.descText}>{selected.description}</Text>
                </View>
              )}

              {/* Ngày nộp */}
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.textTertiary} />
                <Text style={styles.metaText}>Nộp duyệt: {formatDate(selected?.createdAt)}</Text>
              </View>
            </View>
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
              <Text style={styles.approveBtnText}>{processing ? 'Đang xử lý...' : 'Duyệt xe'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal từ chối */}
      <Modal visible={showReject} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.rejectBox}>
            <Text style={styles.rejectBoxTitle}>Lý do từ chối xe</Text>
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
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  cardThumb: { width: 72, height: 54, borderRadius: RADIUS.sm },
  cardThumbPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  cardPlate: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  cardOwner: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  pendingBadge: {
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pendingText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.xs },
  cardMetaText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  cardMetaDot: { color: COLORS.textTertiary, fontSize: FONT_SIZE.xs },
  cardHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  cardHintText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  empty: { alignItems: 'center', marginTop: 60, gap: SPACING.md },
  emptyText: { color: COLORS.textSecondary },
  mainImg: { width: '100%', height: 240, backgroundColor: COLORS.surface },
  imgCountBadge: {
    position: 'absolute', bottom: 10, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  imgCountText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  thumbScroll: { padding: SPACING.sm, gap: SPACING.sm },
  thumbImg: {
    width: 64, height: 48, borderRadius: RADIUS.sm,
    borderWidth: 2, borderColor: 'transparent',
  },
  thumbImgActive: { borderColor: COLORS.primary },
  noImgBox: {
    height: 140, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, gap: SPACING.sm,
  },
  noImgText: { color: COLORS.textTertiary, fontSize: FONT_SIZE.sm },
  section: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: 5 },
  infoLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, width: 140 },
  infoVal: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: '500' },
  featureWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  featureChip: {
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full,
  },
  featureChipText: { fontSize: FONT_SIZE.xs, color: COLORS.primaryDark, fontWeight: '600' },
  descText: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 22 },
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
  zoomImg: { width, height: width * 0.75 },
  zoomClose: { position: 'absolute', top: 48, right: 16 },
});
