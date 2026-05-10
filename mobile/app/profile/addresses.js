import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Modal, TextInput, ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { addressService } from '../../services/address.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import MapPickerModal from '../../components/MapPickerModal';
import { SafeAreaView } from 'react-native-safe-area-context';


const EMPTY_FORM = { label: '', province: '', district: '', ward: '', detail: '', latitude: null, longitude: null };

export default function AddressesScreen() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setLoading(true);
    try {
      const res = await addressService.list();
      setList(res.data || []);
    } catch { }
    finally { setLoading(false); }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function handleMapConfirm(lat, lon, parts) {
    setShowMap(false);
    setForm(f => ({
      ...f,
      latitude: lat,
      longitude: lon,
      province: parts?.province || f.province,
      district: parts?.district || f.district,
      ward: parts?.ward || f.ward,
      detail: parts?.detail || f.detail,
    }));
  }

  async function handleSave() {
    if (!form.province.trim() || !form.district.trim() || !form.ward.trim()) {
      return showError('Vui lòng nhập Tỉnh/Thành, Quận/Huyện, Phường/Xã');
    }
    setSaving(true);
    try {
      await addressService.create({
        label: form.label.trim() || null,
        province: form.province.trim(),
        district: form.district.trim(),
        ward: form.ward.trim(),
        detail: form.detail.trim() || null,
        latitude: form.latitude,
        longitude: form.longitude,
      });
      showSuccess('Đã thêm địa chỉ');
      setShowModal(false);
      load();
    } catch {
      showError('Thêm địa chỉ thất bại');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id) {
    Alert.alert('Xác nhận', 'Xóa địa chỉ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await addressService.remove(id);
            showSuccess('Đã xóa');
            load();
          } catch { showError('Xóa thất bại'); }
        },
      },
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Địa chỉ của tôi</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                {item.label ? <Text style={styles.label}>{item.label}</Text> : null}
                <Text style={styles.addr}>
                  {[item.detail, item.ward, item.district, item.province].filter(Boolean).join(', ')}
                </Text>
                {item.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Mặc định</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.delBtn}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={52} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>Chưa có địa chỉ nào</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
              <Text style={styles.emptyAddText}>Thêm địa chỉ ngay</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Map picker GPS */}
      <MapPickerModal
        visible={showMap}
        onClose={() => setShowMap(false)}
        onConfirm={handleMapConfirm}
        title="Lấy vị trí GPS"
      />

      {/* Modal thêm địa chỉ */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Thêm địa chỉ mới</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">

            {/* Lấy vị trí GPS / bản đồ */}
            <TouchableOpacity style={styles.mapPickerBtn} onPress={() => setShowMap(true)}>
              <Ionicons name="navigate" size={18} color="#FFF" />
              <Text style={styles.mapPickerText}>Lấy vị trí GPS & tự điền địa chỉ</Text>
            </TouchableOpacity>

            {form.latitude != null && (
              <View style={styles.coordBadge}>
                <Ionicons name="location" size={14} color={COLORS.primary} />
                <Text style={styles.coordText}>
                  {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                </Text>
                <TouchableOpacity onPress={() => setForm(f => ({ ...f, latitude: null, longitude: null }))}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textTertiary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc nhập thủ công</Text>
              <View style={styles.dividerLine} />
            </View>

            <Field label="Nhãn (tùy chọn)" placeholder="VD: Nhà tôi, Cơ quan..." value={form.label} onChangeText={v => setForm(f => ({ ...f, label: v }))} />
            <Field label="Tỉnh / Thành phố *" placeholder="VD: Hà Nội" value={form.province} onChangeText={v => setForm(f => ({ ...f, province: v }))} />
            <Field label="Quận / Huyện *" placeholder="VD: Cầu Giấy" value={form.district} onChangeText={v => setForm(f => ({ ...f, district: v }))} />
            <Field label="Phường / Xã *" placeholder="VD: Dịch Vọng" value={form.ward} onChangeText={v => setForm(f => ({ ...f, ward: v }))} />
            <Field label="Số nhà, tên đường" placeholder="VD: 123 Xuân Thủy" value={form.detail} onChangeText={v => setForm(f => ({ ...f, detail: v }))} />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.saveBtnText}>Lưu địa chỉ</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, placeholder, value, onChangeText }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.sm },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, flex: 1 },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  addr: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  defaultBadge: {
    alignSelf: 'flex-start', backgroundColor: '#D1FAE5',
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 2, marginTop: 4,
  },
  defaultText: { fontSize: FONT_SIZE.xs, color: COLORS.success, fontWeight: '600' },
  delBtn: { padding: SPACING.sm },

  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  emptyAddBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
  },
  emptyAddText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.sm },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  modalBody: { padding: SPACING.lg, paddingBottom: 60 },

  fieldGroup: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  fieldInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, fontSize: FONT_SIZE.sm, color: COLORS.text,
  },

  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm,
  },
  saveBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '700' },

  mapPickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: '#10B981', borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  mapPickerText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.md },

  coordBadge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.primary + '40',
    paddingHorizontal: SPACING.sm, paddingVertical: 6, marginBottom: SPACING.sm,
  },
  coordText: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '600' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
});
