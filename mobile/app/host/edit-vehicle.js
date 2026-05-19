import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vehicleService } from '../../services/vehicle.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { formatPrice } from '../../utils/format';
import MapPickerModal from '../../components/MapPickerModal';
import { SafeAreaView } from 'react-native-safe-area-context';


const FUEL_OPTIONS = [
  { value: 'gasoline', label: 'Xăng' },
  { value: 'diesel', label: 'Dầu' },
  { value: 'electric', label: 'Điện' },
  { value: 'hybrid', label: 'Hybrid' },
];
const TRANSMISSION_OPTIONS = [
  { value: 'automatic', label: 'Số tự động' },
  { value: 'manual', label: 'Số sàn' },
];
const SEATS_OPTIONS = [4, 5, 7, 9, 16];

export default function EditVehicleScreen() {
  const { vehicleId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pricePerDay, setPricePerDay] = useState('');
  const [description, setDescription] = useState('');
  const [seats, setSeats] = useState(4);
  const [transmission, setTransmission] = useState('automatic');
  const [fuelType, setFuelType] = useState('gasoline');
  const [fuelConsumption, setFuelConsumption] = useState('');
  const [kmLimitPerDay, setKmLimitPerDay] = useState('');
  const [overageFeePerKm, setOverageFeePerKm] = useState('');
  const [allFeatures, setAllFeatures] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  // Địa chỉ
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [detail, setDetail] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    Promise.all([
      vehicleService.getById(vehicleId),
      vehicleService.getFeatures(),
    ]).then(([vRes, fRes]) => {
      if (vRes.success) {
        const v = vRes.data;
        setPricePerDay(String(v.pricePerDay || ''));
        setDescription(v.description || '');
        setSeats(v.seats || 4);
        setTransmission(v.transmission || 'automatic');
        setFuelType(v.fuelType || 'gasoline');
        setFuelConsumption(v.fuelConsumption ? String(v.fuelConsumption) : '');
        setKmLimitPerDay(v.kmLimitPerDay ? String(v.kmLimitPerDay) : '');
        setOverageFeePerKm(v.overageFeePerKm ? String(v.overageFeePerKm) : '');
        // featureId là ID thực của Feature, không phải ID của join table
        setSelectedFeatures(v.features?.map(f => f.featureId).filter(Boolean) || []);
        // Địa chỉ
        setProvince(v.address?.province || '');
        setDistrict(v.address?.district || '');
        setWard(v.address?.ward || '');
        setDetail(v.address?.detail || '');
        setLatitude(v.address?.latitude ? parseFloat(v.address.latitude) : null);
        setLongitude(v.address?.longitude ? parseFloat(v.address.longitude) : null);
      }
      if (fRes.success) setAllFeatures(fRes.data);
    }).catch(() => showError('Không tải được thông tin xe'))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  function toggleFeature(id) {
    setSelectedFeatures(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  }

  function handleMapConfirm(lat, lon, parts) {
    setLatitude(lat);
    setLongitude(lon);
    if (parts) {
      if (parts.province) setProvince(parts.province);
      if (parts.district) setDistrict(parts.district);
      if (parts.ward) setWard(parts.ward);
      if (parts.detail) setDetail(parts.detail);
    }
    setShowMapPicker(false);
  }

  async function handleSave() {
    if (!pricePerDay || isNaN(pricePerDay) || Number(pricePerDay) < 100000) {
      return showError('Giá thuê tối thiểu 100.000đ');
    }
    setSaving(true);
    try {
      await vehicleService.update(vehicleId, {
        seats,
        transmission,
        fuelType,
        pricePerDay: Number(pricePerDay),
        description: description || undefined,
        fuelConsumption: fuelConsumption ? Number(fuelConsumption) : undefined,
        kmLimitPerDay: kmLimitPerDay ? parseInt(kmLimitPerDay) : undefined,
        overageFeePerKm: overageFeePerKm ? Number(overageFeePerKm) : undefined,
        featureIds: selectedFeatures,
        // Địa chỉ
        province: province || undefined,
        district: district || undefined,
        ward: ward || undefined,
        detail: detail || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      });
      showSuccess('Đã cập nhật xe!');
      router.back();
    } catch (err) {
      showError(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={{flex:1}}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cập nhật xe</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={styles.saveBtnText}>Lưu</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Thông số</Text>

        <Text style={styles.label}>Số chỗ ngồi</Text>
        <View style={styles.chipGrid}>
          {SEATS_OPTIONS.map(s => (
            <TouchableOpacity key={s} style={[styles.chip, seats === s && styles.chipActive]} onPress={() => setSeats(s)}>
              <Text style={[styles.chipText, seats === s && styles.chipTextActive]}>{s} chỗ</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Hộp số</Text>
        <View style={styles.chipGrid}>
          {TRANSMISSION_OPTIONS.map(t => (
            <TouchableOpacity key={t.value} style={[styles.chip, transmission === t.value && styles.chipActive]} onPress={() => setTransmission(t.value)}>
              <Text style={[styles.chipText, transmission === t.value && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nhiên liệu</Text>
        <View style={styles.chipGrid}>
          {FUEL_OPTIONS.map(f => (
            <TouchableOpacity key={f.value} style={[styles.chip, fuelType === f.value && styles.chipActive]} onPress={() => setFuelType(f.value)}>
              <Text style={[styles.chipText, fuelType === f.value && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Mức tiêu thụ nhiên liệu (L/100km)</Text>
        <TextInput style={styles.input} value={fuelConsumption} onChangeText={setFuelConsumption}
          placeholder="VD: 7.5" keyboardType="decimal-pad" />

        <Text style={styles.label}>Giới hạn km/ngày (0 = không giới hạn)</Text>
        <TextInput style={styles.input} value={kmLimitPerDay} onChangeText={setKmLimitPerDay}
          placeholder="VD: 350" keyboardType="number-pad" />

        <Text style={styles.label}>Phí vượt km (VND/km)</Text>
        <TextInput style={styles.input} value={overageFeePerKm} onChangeText={setOverageFeePerKm}
          placeholder="VD: 3000" keyboardType="number-pad" />

        <Text style={styles.label}>Giá thuê / ngày (VND) *</Text>
        <TextInput style={styles.input} value={pricePerDay} onChangeText={setPricePerDay}
          keyboardType="number-pad" />
        {pricePerDay && !isNaN(pricePerDay) && Number(pricePerDay) >= 100000 && (
          <Text style={styles.pricePreview}>{formatPrice(Number(pricePerDay))}/ngày</Text>
        )}

        <Text style={styles.label}>Mô tả</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          value={description} onChangeText={setDescription}
          placeholder="Mô tả thêm về xe..." multiline numberOfLines={3} />

        {allFeatures.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Tính năng xe</Text>
            <View style={styles.featureGrid}>
              {allFeatures.map(f => {
                const checked = selectedFeatures.includes(f.id);
                return (
                  <TouchableOpacity key={f.id} style={[styles.featureChip, checked && styles.featureChipActive]}
                    onPress={() => toggleFeature(f.id)}>
                    <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={18}
                      color={checked ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.featureChipText, checked && styles.featureChipTextActive]}>{f.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Địa chỉ xe */}
        <Text style={styles.sectionTitle}>Địa chỉ xe</Text>
        <TouchableOpacity style={styles.mapPickerBtn} onPress={() => setShowMapPicker(true)}>
          <Ionicons name="map-outline" size={18} color={COLORS.primary} />
          <Text style={styles.mapPickerBtnText}>
            {latitude ? 'Đổi vị trí trên bản đồ' : 'Chọn vị trí trên bản đồ'}
          </Text>
          {latitude
            ? <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
            : <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          }
        </TouchableOpacity>
        {[
          { label: 'Tỉnh / Thành phố', value: province, setter: setProvince },
          { label: 'Quận / Huyện', value: district, setter: setDistrict },
          { label: 'Phường / Xã', value: ward, setter: setWard },
          { label: 'Địa chỉ chi tiết', value: detail, setter: setDetail },
        ].map(f => (
          <View key={f.label}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              value={f.value}
              onChangeText={f.setter}
              placeholder={f.label}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
        ))}
      </ScrollView>

      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleMapConfirm}
        initialLat={latitude}
        initialLon={longitude}
        title="Chọn vị trí xe"
      />
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.md,
    backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  saveBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  saveBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.md },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: SPACING.sm },
  input: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZE.md, color: COLORS.text,
  },
  pricePreview: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  featureChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight + '30' },
  featureChipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  featureChipTextActive: { color: COLORS.primary, fontWeight: '600' },
  mapPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight + '30', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.primary,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  mapPickerBtnText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
});
