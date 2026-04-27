// FR-08: Wizard đăng ký xe mới — 4 bước
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vehicleService } from '../../services/vehicle.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { formatPrice } from '../../utils/format';
import SuggestionInput from '../../components/SuggestionInput';
import MapPickerModal from '../../components/MapPickerModal';

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

export default function AddVehicleScreen() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  const [showImageSource, setShowImageSource] = useState(false);

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [seats, setSeats] = useState(4);
  const [transmission, setTransmission] = useState('automatic');
  const [fuelType, setFuelType] = useState('gasoline');
  const [pricePerDay, setPricePerDay] = useState('');
  const [description, setDescription] = useState('');
  const [fuelConsumption, setFuelConsumption] = useState('');
  const [kmLimitPerDay, setKmLimitPerDay] = useState('');
  const [overageFeePerKm, setOverageFeePerKm] = useState('');
  const [allFeatures, setAllFeatures] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);

  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [detail, setDetail] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const STEPS = ['Thông tin', 'Địa chỉ', 'Hình ảnh', 'Xem lại'];

  useEffect(() => {
    vehicleService.getFeatures().then(r => {
      if (r.success) setAllFeatures(r.data);
    }).catch(() => {});
  }, []);

  function toggleFeature(id) {
    setSelectedFeatures(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  }
  const [errors, setErrors] = useState({});

  function validateField(field, value) {
    const e = { ...errors };
    switch (field) {
      case 'brand': if (!value) e.brand = 'Vui lòng nhập hãng xe'; else delete e.brand; break;
      case 'model': if (!value) e.model = 'Vui lòng nhập dòng xe'; else delete e.model; break;
      case 'year':
        if (!value) e.year = 'Vui lòng nhập năm sản xuất';
        else if (isNaN(value) || value < 1990 || value > 2030) e.year = 'Năm từ 1990 đến 2030';
        else delete e.year; break;
      case 'licensePlate': if (!value) e.licensePlate = 'Vui lòng nhập biển số xe'; else delete e.licensePlate; break;
      case 'pricePerDay':
        if (!value) e.pricePerDay = 'Vui lòng nhập giá thuê';
        else if (isNaN(value) || Number(value) < 100000) e.pricePerDay = 'Giá thuê tối thiểu 100.000đ';
        else delete e.pricePerDay; break;
      case 'province': if (!value) e.province = 'Vui lòng nhập tỉnh/thành phố'; else delete e.province; break;
      case 'district': if (!value) e.district = 'Vui lòng nhập quận/huyện'; else delete e.district; break;
      case 'ward': if (!value) e.ward = 'Vui lòng nhập phường/xã'; else delete e.ward; break;
    }
    setErrors(e);
  }

  function validateStep() {
    if (step === 0) {
      validateField('brand', brand);
      validateField('model', model);
      validateField('year', year);
      validateField('licensePlate', licensePlate);
      validateField('pricePerDay', pricePerDay);
      return brand && model && year && !isNaN(year) && year >= 1990 && year <= 2030
        && licensePlate && pricePerDay && !isNaN(pricePerDay) && Number(pricePerDay) >= 100000;
    }
    if (step === 1) {
      validateField('province', province);
      validateField('district', district);
      // Ward bắt buộc chỉ khi không có tọa độ GPS
      if (!latitude) validateField('ward', ward);
      return province && district && (ward || !!latitude);
    }
    if (step === 2) {
      if (images.length === 0) { showError('Cần chọn ít nhất 1 ảnh'); return false; }
      return true;
    }
    return true;
  }

  function handleNext() {
    if (validateStep()) setStep(s => s + 1);
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1);
  }

  async function pickFromGallery() {
    setShowImageSource(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - images.length,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets].slice(0, 10));
    }
  }

  async function pickFromCamera() {
    setShowImageSource(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showError('Cần cấp quyền truy cập camera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets].slice(0, 10));
    }
  }

  function removeImage(index) {
    setImages(prev => prev.filter((_, i) => i !== index));
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

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const vehicleData = {
        brand, model,
        year: parseInt(year),
        licensePlate: licensePlate.toUpperCase(),
        seats, transmission, fuelType,
        pricePerDay: Number(pricePerDay),
        description: description || undefined,
        fuelConsumption: fuelConsumption ? Number(fuelConsumption) : undefined,
        kmLimitPerDay: kmLimitPerDay ? parseInt(kmLimitPerDay) : undefined,
        overageFeePerKm: overageFeePerKm ? Number(overageFeePerKm) : undefined,
        featureIds: selectedFeatures.length > 0 ? selectedFeatures : undefined,
        province, district, ward: ward || undefined, detail: detail || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
      };

      const createResult = await vehicleService.create(vehicleData);
      if (!createResult.success) {
        return showError('Tạo xe thất bại');
      }

      const vehicleId = createResult.data.id;

      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((img, i) => {
          formData.append('images', {
            uri: img.uri,
            type: img.mimeType || 'image/jpeg',
            name: `vehicle_${i}.jpg`,
          });
        });
        await vehicleService.uploadImages(vehicleId, formData);
      }

      await vehicleService.submitForReview(vehicleId);

      showSuccess('Đã đăng ký xe và gửi duyệt!');
      router.replace('/host/vehicles');
    } catch (err) {
      showError(err.response?.data?.message || 'Đăng ký xe thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  function renderStepContent() {
    switch (step) {
      case 0: return renderBasicInfo();
      case 1: return renderAddress();
      case 2: return renderImages();
      case 3: return renderReview();
    }
  }

  function renderBasicInfo() {
    return (
      <>
        <Text style={styles.sectionTitle}>Thông tin xe</Text>

        <Text style={styles.label}>Hãng xe *</Text>
        <SuggestionInput
          fieldKey="vehicle_brand"
          style={[styles.input, errors.brand && styles.inputError]}
          placeholder="VD: Toyota"
          value={brand}
          onChangeText={v => { setBrand(v); if (errors.brand) validateField('brand', v); }}
          onBlur={() => validateField('brand', brand)}
        />
        {errors.brand && <Text style={styles.errorText}>{errors.brand}</Text>}

        <Text style={styles.label}>Dòng xe *</Text>
        <SuggestionInput
          fieldKey="vehicle_model"
          style={[styles.input, errors.model && styles.inputError]}
          placeholder="VD: Vios"
          value={model}
          onChangeText={v => { setModel(v); if (errors.model) validateField('model', v); }}
          onBlur={() => validateField('model', model)}
        />
        {errors.model && <Text style={styles.errorText}>{errors.model}</Text>}

        <Text style={styles.label}>Năm sản xuất *</Text>
        <TextInput style={[styles.input, errors.year && styles.inputError]} placeholder="VD: 2022" value={year}
          onChangeText={v => { setYear(v); if (errors.year) validateField('year', v); }}
          onBlur={() => validateField('year', year)}
          keyboardType="number-pad" maxLength={4} />
        {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}

        <Text style={styles.label}>Biển số xe *</Text>
        <TextInput style={[styles.input, errors.licensePlate && styles.inputError]} placeholder="VD: 51A-12345" value={licensePlate}
          onChangeText={v => { setLicensePlate(v.toUpperCase()); if (errors.licensePlate) validateField('licensePlate', v); }}
          onBlur={() => validateField('licensePlate', licensePlate)} autoCapitalize="characters" />
        {errors.licensePlate && <Text style={styles.errorText}>{errors.licensePlate}</Text>}

        <Text style={styles.label}>Số chỗ ngồi</Text>
        <View style={styles.chipGrid}>
          {SEATS_OPTIONS.map(s => (
            <TouchableOpacity key={s} style={[styles.filterChip, seats === s && styles.filterChipActive]}
              onPress={() => setSeats(s)}>
              <Text style={[styles.filterChipText, seats === s && styles.filterChipTextActive]}>{s} chỗ</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Hộp số</Text>
        <View style={styles.chipGrid}>
          {TRANSMISSION_OPTIONS.map(t => (
            <TouchableOpacity key={t.value} style={[styles.filterChip, transmission === t.value && styles.filterChipActive]}
              onPress={() => setTransmission(t.value)}>
              <Text style={[styles.filterChipText, transmission === t.value && styles.filterChipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nhiên liệu</Text>
        <View style={styles.chipGrid}>
          {FUEL_OPTIONS.map(f => (
            <TouchableOpacity key={f.value} style={[styles.filterChip, fuelType === f.value && styles.filterChipActive]}
              onPress={() => setFuelType(f.value)}>
              <Text style={[styles.filterChipText, fuelType === f.value && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Mức tiêu thụ nhiên liệu (L/100km)</Text>
        <TextInput style={styles.input} placeholder="VD: 7.5" value={fuelConsumption}
          onChangeText={setFuelConsumption} keyboardType="decimal-pad" />

        <Text style={styles.label}>Giới hạn km/ngày (0 = không giới hạn)</Text>
        <TextInput style={styles.input} placeholder="VD: 350" value={kmLimitPerDay}
          onChangeText={setKmLimitPerDay} keyboardType="number-pad" />

        <Text style={styles.label}>Phí vượt km (VND/km)</Text>
        <TextInput style={styles.input} placeholder="VD: 3000" value={overageFeePerKm}
          onChangeText={setOverageFeePerKm} keyboardType="number-pad" />

        {allFeatures.length > 0 && (
          <>
            <Text style={styles.label}>Tính năng xe</Text>
            <View style={styles.featureGrid}>
              {allFeatures.map(f => {
                const checked = selectedFeatures.includes(f.id);
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.featureChip, checked && styles.featureChipActive]}
                    onPress={() => toggleFeature(f.id)}
                  >
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={checked ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[styles.featureChipText, checked && styles.featureChipTextActive]}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.label}>Giá thuê / ngày (VND) *</Text>
        <TextInput style={[styles.input, errors.pricePerDay && styles.inputError]} placeholder="VD: 800000" value={pricePerDay}
          onChangeText={v => { setPricePerDay(v); if (errors.pricePerDay) validateField('pricePerDay', v); }}
          onBlur={() => validateField('pricePerDay', pricePerDay)}
          keyboardType="number-pad" />
        {errors.pricePerDay && <Text style={styles.errorText}>{errors.pricePerDay}</Text>}
        {pricePerDay && !isNaN(pricePerDay) && Number(pricePerDay) >= 100000 && (
          <Text style={styles.pricePreview}>{formatPrice(Number(pricePerDay))}/ngày</Text>
        )}

        <Text style={styles.label}>Mô tả (tùy chọn)</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Mô tả thêm về xe..." value={description} onChangeText={setDescription}
          multiline numberOfLines={3} />
      </>
    );
  }

  function renderAddress() {
    return (
      <>
        <Text style={styles.sectionTitle}>Địa chỉ nhận/trả xe</Text>

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
        {latitude ? (
          <Text style={styles.coordText}>
            GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Text>
        ) : null}

        <Text style={styles.label}>Tỉnh / Thành phố *</Text>
        <SuggestionInput
          fieldKey="vehicle_province"
          style={[styles.input, errors.province && styles.inputError]}
          placeholder="VD: TP. Hồ Chí Minh"
          value={province}
          onChangeText={v => { setProvince(v); if (errors.province) validateField('province', v); }}
          onBlur={() => validateField('province', province)}
        />
        {errors.province && <Text style={styles.errorText}>{errors.province}</Text>}

        <Text style={styles.label}>Quận / Huyện *</Text>
        <SuggestionInput
          fieldKey="vehicle_district"
          style={[styles.input, errors.district && styles.inputError]}
          placeholder="VD: Quận 1"
          value={district}
          onChangeText={v => { setDistrict(v); if (errors.district) validateField('district', v); }}
          onBlur={() => validateField('district', district)}
        />
        {errors.district && <Text style={styles.errorText}>{errors.district}</Text>}

        <Text style={styles.label}>Phường / Xã *</Text>
        <SuggestionInput
          fieldKey="vehicle_ward"
          style={[styles.input, errors.ward && styles.inputError]}
          placeholder="VD: Phường Bến Nghé"
          value={ward}
          onChangeText={v => { setWard(v); if (errors.ward) validateField('ward', v); }}
          onBlur={() => validateField('ward', ward)}
        />
        {errors.ward && <Text style={styles.errorText}>{errors.ward}</Text>}

        <Text style={styles.label}>Địa chỉ chi tiết</Text>
        <SuggestionInput
          fieldKey="vehicle_detail"
          style={styles.input}
          placeholder="VD: 123 Nguyễn Huệ"
          value={detail}
          onChangeText={setDetail}
        />
      </>
    );
  }

  function renderImages() {
    return (
      <>
        <Text style={styles.sectionTitle}>Hình ảnh xe ({images.length}/10)</Text>
        <Text style={styles.hint}>Ảnh đầu tiên sẽ là ảnh bìa. Tối đa 10 ảnh.</Text>

        <View style={styles.imageGrid}>
          {images.map((img, i) => (
            <View key={i} style={styles.imageWrapper}>
              <Image source={img.uri} style={styles.imageThumb} contentFit="cover" />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(i)}>
                <Ionicons name="close-circle" size={22} color={COLORS.error} />
              </TouchableOpacity>
              {i === 0 && <Text style={styles.coverLabel}>Bìa</Text>}
            </View>
          ))}
          {images.length < 10 && (
            <TouchableOpacity style={styles.addImageBtn} onPress={() => setShowImageSource(true)}>
              <Ionicons name="add" size={32} color={COLORS.textSecondary} />
              <Text style={styles.addImageText}>Thêm ảnh</Text>
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  }

  function renderReview() {
    return (
      <>
        <Text style={styles.sectionTitle}>Xem lại thông tin</Text>

        <View style={styles.reviewGroup}>
          <Text style={styles.reviewLabel}>Xe</Text>
          <Text style={styles.reviewValue}>{brand} {model} {year}</Text>
        </View>
        <View style={styles.reviewGroup}>
          <Text style={styles.reviewLabel}>Biển số</Text>
          <Text style={styles.reviewValue}>{licensePlate}</Text>
        </View>
        <View style={styles.reviewGroup}>
          <Text style={styles.reviewLabel}>Thông số</Text>
          <Text style={styles.reviewValue}>
            {seats} chỗ | {TRANSMISSION_OPTIONS.find(t => t.value === transmission)?.label} | {FUEL_OPTIONS.find(f => f.value === fuelType)?.label}
          </Text>
        </View>
        <View style={styles.reviewGroup}>
          <Text style={styles.reviewLabel}>Giá thuê</Text>
          <Text style={[styles.reviewValue, { color: COLORS.primary, fontWeight: 'bold' }]}>
            {formatPrice(Number(pricePerDay))}/ngày
          </Text>
        </View>
        <View style={styles.reviewGroup}>
          <Text style={styles.reviewLabel}>Địa chỉ</Text>
          <Text style={styles.reviewValue}>
            {[detail, ward, district, province].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={styles.reviewGroup}>
          <Text style={styles.reviewLabel}>Hình ảnh</Text>
          <Text style={styles.reviewValue}>{images.length} ảnh</Text>
        </View>
        {description ? (
          <View style={styles.reviewGroup}>
            <Text style={styles.reviewLabel}>Mô tả</Text>
            <Text style={styles.reviewValue}>{description}</Text>
          </View>
        ) : null}

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACING.sm }}>
            {images.map((img, i) => (
              <Image key={i} source={img.uri} style={styles.reviewThumb} contentFit="cover" />
            ))}
          </ScrollView>
        )}
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Thanh tiến trình */}
        <View style={styles.stepper}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.stepItem}>
              <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
                {i < step ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text style={[styles.stepNumber, i <= step && styles.stepNumberActive]}>{i + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>{s}</Text>
            </View>
          ))}
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
          {renderStepContent()}
        </ScrollView>

        {/* Nút điều hướng */}
        <View style={styles.bottomNav}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
              <Text style={styles.backBtnText}>Quay lại</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {step < 3 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>Tiếp theo</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.nextBtnText}>Gửi duyệt</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* Modal map picker */}
      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleMapConfirm}
        initialLat={latitude}
        initialLon={longitude}
        title="Chọn vị trí xe"
      />

      {/* Modal chọn nguồn ảnh */}
      <Modal visible={showImageSource} transparent animationType="slide" onRequestClose={() => setShowImageSource(false)}>
        <TouchableOpacity style={styles.sourceOverlay} activeOpacity={1} onPress={() => setShowImageSource(false)}>
          <View style={styles.sourceSheet}>
            <Text style={styles.sourceTitle}>Chọn ảnh từ</Text>
            <TouchableOpacity style={styles.sourceOption} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={24} color={COLORS.primary} />
              <Text style={styles.sourceOptionText}>Thư viện ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sourceOption} onPress={pickFromCamera}>
              <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
              <Text style={styles.sourceOptionText}>Chụp ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sourceCancel} onPress={() => setShowImageSource(false)}>
              <Text style={styles.sourceCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  stepper: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: COLORS.primary },
  stepNumber: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: '600' },
  stepNumberActive: { color: '#FFF' },
  stepLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 4 },
  stepLabelActive: { color: COLORS.primary, fontWeight: '600' },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING.md },
  inputError: { borderColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.xs, marginTop: 2, marginBottom: 2 },
  pricePreview: { fontSize: FONT_SIZE.xs, color: COLORS.primary, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONT_SIZE.md, backgroundColor: COLORS.surface,
  },
  // Chip selector — đồng bộ với bộ lọc search
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs, marginBottom: SPACING.sm },
  filterChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },
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
  // Ảnh
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  imageWrapper: { width: 100, height: 100, borderRadius: RADIUS.sm, overflow: 'hidden' },
  imageThumb: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 2, right: 2 },
  coverLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFF',
    fontSize: FONT_SIZE.xs, textAlign: 'center', paddingVertical: 2,
  },
  addImageBtn: {
    width: 100, height: 100, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface,
  },
  addImageText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 4 },
  // Xem lại
  reviewGroup: { marginBottom: SPACING.md },
  reviewLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 2 },
  reviewValue: { fontSize: FONT_SIZE.md, color: COLORS.text },
  reviewThumb: { width: 80, height: 60, borderRadius: RADIUS.sm, marginRight: SPACING.sm },
  // Điều hướng bottom
  bottomNav: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  backBtnText: { fontSize: FONT_SIZE.md, color: COLORS.text },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  nextBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '600' },
  // Modal chọn nguồn ảnh
  sourceOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sourceSheet: {
    backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg, paddingBottom: SPACING.xl,
  },
  sourceTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.md },
  sourceOption: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sourceOptionText: { fontSize: FONT_SIZE.md, color: COLORS.text },
  sourceCancel: { marginTop: SPACING.md, alignItems: 'center', paddingVertical: SPACING.sm },
  sourceCancelText: { fontSize: FONT_SIZE.md, color: COLORS.error, fontWeight: '600' },
  mapPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight + '30', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.primary,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  mapPickerBtnText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
  coordText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING.md, marginLeft: 4 },
});
