// Màn hình cấu hình hệ thống: phí nền tảng, quản lý voucher
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Platform, FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/admin.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { formatPrice } from '../../utils/format';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function AdminConfigScreen() {
  const [tab, setTab] = useState('config'); // 'config' | 'vouchers'

  // === CONFIG ===
  const [feeRate, setFeeRate] = useState('20');
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // === VOUCHERS ===
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: '', discountType: 'percent', discountValue: '',
    maxDiscount: '', minOrderValue: '', usageLimit: '', expiresAt: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickedDate, setPickedDate] = useState(new Date());

  useFocusEffect(useCallback(() => {
    loadConfig();
    loadVouchers();
  }, []));

  async function loadConfig() {
    setLoadingConfig(true);
    try {
      const res = await adminService.getConfig();
      if (res.data?.success) {
        const rate = parseFloat(res.data.data?.platform_fee_rate || 0.20) * 100;
        setFeeRate(rate.toFixed(0));
      }
    } catch {}
    finally { setLoadingConfig(false); }
  }

  async function saveConfig() {
    const rate = parseFloat(feeRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return showError('Tỷ lệ phí phải từ 0-100%');
    setSavingConfig(true);
    try {
      const res = await adminService.updateConfig({ platform_fee_rate: (rate / 100).toFixed(2) });
      if (res.data?.success) showSuccess('Đã lưu cấu hình');
    } catch { showError('Lưu thất bại'); }
    finally { setSavingConfig(false); }
  }

  async function loadVouchers() {
    setLoadingVouchers(true);
    try {
      const res = await adminService.getVouchers();
      if (res.data?.success) setVouchers(res.data.data);
    } catch {}
    finally { setLoadingVouchers(false); }
  }

  async function createVoucher() {
    if (!form.code || !form.discountValue) return showError('Cần nhập mã và giá trị giảm');
    setCreating(true);
    try {
      const payload = {
        code: form.code.trim(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : 0,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        expiresAt: form.expiresAt || null,
      };
      const res = await adminService.createVoucher(payload);
      if (res.data?.success) {
        showSuccess('Đã tạo voucher');
        setShowCreateModal(false);
        setForm({ code: '', discountType: 'percent', discountValue: '', maxDiscount: '', minOrderValue: '', usageLimit: '', expiresAt: '' });
        loadVouchers();
      }
    } catch (e) { showError(e?.response?.data?.message || 'Tạo thất bại'); }
    finally { setCreating(false); }
  }

  async function toggleVoucher(v) {
    try {
      await adminService.toggleVoucher(v.id);
      setVouchers(list => list.map(x => x.id === v.id ? { ...x, isActive: !x.isActive } : x));
    } catch { showError('Thất bại'); }
  }

  function confirmDelete(v) {
    Alert.alert('Xóa voucher', `Xóa voucher "${v.code}"? Hành động không thể hoàn tác.`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await adminService.deleteVoucher(v.id);
          setVouchers(l => l.filter(x => x.id !== v.id));
          showSuccess('Đã xóa');
        } catch { showError('Thất bại'); }
      }},
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cấu hình hệ thống</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab */}
      <View style={styles.tabRow}>
        {['config', 'vouchers'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'config' ? 'Phí nền tảng' : `Voucher (${vouchers.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'config' ? (
        /* === CONFIG TAB === */
        loadingConfig ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.configContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Phí nền tảng (hoa hồng)</Text>
              <Text style={styles.sectionDesc}>
                Mioto thu % doanh thu của host mỗi chuyến hoàn thành. Mặc định: 20%.
              </Text>
              <View style={styles.feeRow}>
                <TextInput
                  style={styles.feeInput}
                  value={feeRate}
                  onChangeText={setFeeRate}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.feeUnit}>%</Text>
              </View>
              <Text style={styles.feeExample}>
                Ví dụ: chuyến 1.000.000đ → host nhận {formatPrice(1000000 * (1 - parseFloat(feeRate || 0) / 100))}đ
              </Text>
              <TouchableOpacity
                style={[styles.saveBtn, savingConfig && { opacity: 0.6 }]}
                onPress={saveConfig}
                disabled={savingConfig}
              >
                {savingConfig
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.saveBtnText}>Lưu cấu hình</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )
      ) : (
        /* === VOUCHERS TAB === */
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.createBtnText}>Tạo voucher mới</Text>
          </TouchableOpacity>

          {loadingVouchers ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={vouchers}
              keyExtractor={v => v.id}
              contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="ticket-outline" size={52} color={COLORS.textTertiary} />
                  <Text style={styles.emptyText}>Chưa có voucher nào</Text>
                </View>
              }
              renderItem={({ item: v }) => (
                <View style={[styles.vCard, !v.isActive && styles.vCardInactive]}>
                  <View style={styles.vCardTop}>
                    <View>
                      <Text style={styles.vCode}>{v.code}</Text>
                      <Text style={styles.vType}>
                        {v.discountType === 'percent'
                          ? `${Number(v.discountValue)}%${v.maxDiscount ? ` (tối đa ${formatPrice(Number(v.maxDiscount))})` : ''}`
                          : formatPrice(Number(v.discountValue))}
                        {v.minOrderValue > 0 ? ` · Đơn tối thiểu ${formatPrice(Number(v.minOrderValue))}` : ''}
                      </Text>
                      <Text style={styles.vMeta}>
                        Đã dùng: {v.usedCount}{v.usageLimit ? `/${v.usageLimit}` : ' lần'}
                        {v.expiresAt ? ` · HSD: ${new Date(v.expiresAt).toLocaleDateString('vi-VN')}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: v.isActive ? '#D1FAE5' : '#FEE2E2' }]}>
                      <Text style={[styles.statusText, { color: v.isActive ? '#10B981' : '#EF4444' }]}>
                        {v.isActive ? 'Hoạt động' : 'Tạm dừng'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.vActions}>
                    <TouchableOpacity style={styles.vBtn} onPress={() => toggleVoucher(v)}>
                      <Ionicons name={v.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={COLORS.primary} />
                      <Text style={styles.vBtnText}>{v.isActive ? 'Tạm dừng' : 'Kích hoạt'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.vBtn, { borderColor: COLORS.error + '60' }]} onPress={() => confirmDelete(v)}>
                      <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                      <Text style={[styles.vBtnText, { color: COLORS.error }]}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Modal tạo voucher */}
      <Modal visible={showCreateModal} animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tạo voucher mới</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <VoucherField label="Mã voucher *" placeholder="VD: SUMMER20" value={form.code} onChangeText={v => setForm(f => ({ ...f, code: v.toUpperCase() }))} />

            <Text style={styles.fieldLabel}>Loại giảm giá *</Text>
            <View style={styles.typeRow}>
              {['percent', 'fixed'].map(t => (
                <TouchableOpacity key={t} style={[styles.typeChip, form.discountType === t && styles.typeChipActive]} onPress={() => setForm(f => ({ ...f, discountType: t }))}>
                  <Text style={[styles.typeText, form.discountType === t && styles.typeTextActive]}>
                    {t === 'percent' ? '% Phần trăm' : 'Số tiền cố định'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <VoucherField
              label={`Giá trị ${form.discountType === 'percent' ? '(%)' : '(VNĐ)'} *`}
              placeholder={form.discountType === 'percent' ? 'VD: 20' : 'VD: 100000'}
              value={form.discountValue} onChangeText={v => setForm(f => ({ ...f, discountValue: v }))} keyboardType="numeric"
            />
            {form.discountType === 'percent' && (
              <VoucherField label="Giảm tối đa (VNĐ)" placeholder="VD: 200000 — bỏ trống = không giới hạn" value={form.maxDiscount} onChangeText={v => setForm(f => ({ ...f, maxDiscount: v }))} keyboardType="numeric" />
            )}
            <VoucherField label="Đơn hàng tối thiểu (VNĐ)" placeholder="VD: 500000 — bỏ trống = không giới hạn" value={form.minOrderValue} onChangeText={v => setForm(f => ({ ...f, minOrderValue: v }))} keyboardType="numeric" />
            <VoucherField label="Giới hạn lượt dùng" placeholder="VD: 100 — bỏ trống = không giới hạn" value={form.usageLimit} onChangeText={v => setForm(f => ({ ...f, usageLimit: v }))} keyboardType="numeric" />
            <Text style={styles.fieldLabel}>Hạn sử dụng</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.datePickerText, !form.expiresAt && { color: COLORS.textTertiary }]}>
                {form.expiresAt || 'Bỏ trống = không giới hạn'}
              </Text>
              {form.expiresAt ? (
                <TouchableOpacity onPress={() => setForm(f => ({ ...f, expiresAt: '' }))}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={pickedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(e, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) {
                    setPickedDate(date);
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    setForm(f => ({ ...f, expiresAt: `${y}-${m}-${d}` }));
                  }
                }}
              />
            )}

            <TouchableOpacity style={[styles.saveBtn, creating && { opacity: 0.6 }]} onPress={createVoucher} disabled={creating}>
              {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Tạo voucher</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function VoucherField({ label, placeholder, value, onChangeText, keyboardType }) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },

  configContent: { padding: SPACING.lg },
  section: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg,
  },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  sectionDesc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg, lineHeight: 20 },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  feeInput: {
    width: 80, backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.primary, padding: SPACING.md,
    fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, textAlign: 'center',
  },
  feeUnit: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.primary },
  feeExample: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '700' },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, margin: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md,
  },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.md },

  vCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  vCardInactive: { opacity: 0.6 },
  vCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  vCode: { fontSize: FONT_SIZE.md, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  vType: { fontSize: FONT_SIZE.sm, color: COLORS.text, marginTop: 2 },
  vMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  vActions: { flexDirection: 'row', gap: SPACING.sm },
  vBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.primary + '60', borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 5,
  },
  vBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '600' },

  empty: { alignItems: 'center', marginTop: 60, gap: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  modalContent: { padding: SPACING.lg, paddingBottom: 60 },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  fieldInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, fontSize: FONT_SIZE.sm, color: COLORS.text,
  },
  typeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  typeChip: {
    flex: 1, padding: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  typeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  typeText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  typeTextActive: { color: COLORS.primary, fontWeight: '700' },
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, backgroundColor: COLORS.surface, marginBottom: SPACING.md,
  },
  datePickerText: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
});
