// Quản lý địa chỉ cá nhân
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addressService } from '../../services/address.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import MapPickerModal from '../../components/MapPickerModal';

const EMPTY_FORM = { label: '', province: '', district: '', ward: '', detail: '', latitude: null, longitude: null, isDefault: false };

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await addressService.getMyAddresses();
      if (result.success) setAddresses(result.data);
    } catch { showError('Không tải được địa chỉ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(EMPTY_FORM); setEditTarget(null); setShowForm(true); }
  function openEdit(addr) {
    setForm({ label: addr.label || '', province: addr.province, district: addr.district, ward: addr.ward, detail: addr.detail || '', latitude: addr.latitude ? parseFloat(addr.latitude) : null, longitude: addr.longitude ? parseFloat(addr.longitude) : null, isDefault: addr.isDefault });
    setEditTarget(addr.id);
    setShowForm(true);
  }

  function handleMapConfirm(lat, lon, parts) {
    setForm(p => ({
      ...p,
      latitude: lat,
      longitude: lon,
      ...(parts ? {
        province: parts.province || p.province,
        district: parts.district || p.district,
        ward: parts.ward || p.ward,
        detail: parts.detail || p.detail,
      } : {}),
    }));
    setShowMapPicker(false);
  }

  async function handleSave() {
    if (!form.province.trim() || !form.district.trim() || !form.ward.trim()) {
      return showError('Vui lòng điền đầy đủ tỉnh/thành, quận/huyện, phường/xã');
    }
    setSaving(true);
    try {
      if (editTarget) {
        await addressService.update(editTarget, form);
        showSuccess('Đã cập nhật địa chỉ');
      } else {
        await addressService.create(form);
        showSuccess('Đã thêm địa chỉ');
      }
      setShowForm(false);
      load();
    } catch (err) {
      showError(err.response?.data?.message || 'Lưu thất bại');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    try {
      await addressService.remove(id);
      showSuccess('Đã xóa địa chỉ');
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại');
    }
  }

  async function handleSetDefault(id) {
    try {
      await addressService.setDefault(id);
      showSuccess('Đã đặt làm mặc định');
      load();
    } catch {}
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Địa chỉ của tôi</Text>
        <TouchableOpacity onPress={openAdd}>
          <Ionicons name="add" size={26} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SPACING.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="location-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>Chưa có địa chỉ nào</Text>
              <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                <Text style={styles.addBtnText}>+ Thêm địa chỉ</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.isDefault && styles.cardDefault]}>
              <View style={styles.cardIcon}>
                <Ionicons name="location" size={22} color={item.isDefault ? COLORS.primary : COLORS.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                {item.label ? <Text style={styles.cardLabel}>{item.label}</Text> : null}
                <Text style={styles.cardAddr} numberOfLines={2}>
                  {[item.detail, item.ward, item.district, item.province].filter(Boolean).join(', ')}
                </Text>
                {item.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Mặc định</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="pencil-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {!item.isDefault && (
                  <TouchableOpacity onPress={() => handleSetDefault(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="star-outline" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal map picker */}
      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleMapConfirm}
        initialLat={form.latitude}
        initialLon={form.longitude}
        title="Chọn vị trí địa chỉ"
      />

      {/* Modal thêm/sửa */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Nút chọn trên bản đồ */}
              <TouchableOpacity style={styles.mapPickerBtn} onPress={() => setShowMapPicker(true)}>
                <Ionicons name="map-outline" size={18} color={COLORS.primary} />
                <Text style={styles.mapPickerBtnText}>
                  {form.latitude ? 'Đổi vị trí trên bản đồ' : 'Chọn vị trí trên bản đồ'}
                </Text>
                {form.latitude ? (
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                )}
              </TouchableOpacity>
              {form.latitude ? (
                <Text style={styles.coordText}>
                  GPS: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                </Text>
              ) : null}

              {[
                { key: 'label', label: 'Tên địa chỉ (VD: Nhà riêng)', required: false },
                { key: 'province', label: 'Tỉnh / Thành phố *', required: true },
                { key: 'district', label: 'Quận / Huyện *', required: true },
                { key: 'ward', label: 'Phường / Xã *', required: true },
                { key: 'detail', label: 'Số nhà, tên đường', required: false },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={form[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.label}
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
              ))}
              <TouchableOpacity
                style={styles.defaultToggle}
                onPress={() => setForm(p => ({ ...p, isDefault: !p.isDefault }))}
              >
                <Ionicons name={form.isDefault ? 'checkbox' : 'square-outline'} size={22} color={COLORS.primary} />
                <Text style={styles.defaultToggleText}>Đặt làm địa chỉ mặc định</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.saveBtnText}>Lưu địa chỉ</Text>
              }
            </TouchableOpacity>
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
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm },
  addBtnText: { color: '#FFF', fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  cardDefault: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight + '20' },
  cardIcon: { marginTop: 2 },
  cardLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  cardAddr: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  defaultBadge: { backgroundColor: COLORS.primaryLight, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm, marginTop: 4 },
  defaultText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '600' },
  cardActions: { flexDirection: 'column', gap: SPACING.sm, alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  field: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  fieldInput: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: FONT_SIZE.sm, color: COLORS.text },
  defaultToggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  defaultToggleText: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.md },
  mapPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight + '30', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.primary,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  mapPickerBtnText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
  coordText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING.md, marginLeft: 4 },
});
