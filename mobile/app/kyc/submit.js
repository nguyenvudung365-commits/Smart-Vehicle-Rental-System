// FR-03: Màn hình xác thực giấy phép lái xe — upload 2 ảnh mặt trước + mặt sau
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, TextInput, Modal
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { kycService } from '../../services/kyc.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { Ionicons } from '@expo/vector-icons';
import SuggestionInput from '../../components/SuggestionInput';

export default function KycSubmitScreen() {
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState({});

  // Modal chọn nguồn ảnh
  const [showImageSource, setShowImageSource] = useState(false);
  const [currentSetter, setCurrentSetter] = useState(null);

  useEffect(() => { loadKyc(); }, []);

  async function loadKyc() {
    try {
      const result = await kycService.getMyKyc();
      if (result.data) setKyc(result.data);
    } catch {
      // Chưa có KYC — bình thường
    } finally {
      setLoading(false);
    }
  }

  function openImageSource(setter) {
    setCurrentSetter(() => setter);
    setShowImageSource(true);
  }

  async function pickFromGallery() {
    setShowImageSource(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled) currentSetter(result.assets[0]);
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
      allowsEditing: true,
    });
    if (!result.canceled) currentSetter(result.assets[0]);
  }

  function validateField(field, value) {
    const e = { ...errors };
    switch (field) {
      case 'licenseNumber':
        if (!value || value.length < 5) e.licenseNumber = 'Số GPLX phải có ít nhất 5 ký tự';
        else delete e.licenseNumber; break;
      case 'fullName':
        if (!value || value.length < 2) e.fullName = 'Họ tên phải có ít nhất 2 ký tự';
        else delete e.fullName; break;
    }
    setErrors(e);
  }

  async function handleSubmit() {
    validateField('licenseNumber', licenseNumber);
    validateField('fullName', fullName);
    if (!frontImage || !backImage) {
      return showError('Cần chọn cả 2 ảnh GPLX');
    }
    if (!licenseNumber || licenseNumber.length < 5 || !fullName || fullName.length < 2) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('licenseNumber', licenseNumber);
      formData.append('fullName', fullName);
      formData.append('frontImage', {
        uri: frontImage.uri,
        type: frontImage.mimeType || 'image/jpeg',
        name: 'front.jpg',
      });
      formData.append('backImage', {
        uri: backImage.uri,
        type: backImage.mimeType || 'image/jpeg',
        name: 'back.jpg',
      });

      const result = await kycService.submit(formData);
      if (result.success) {
        showSuccess('Đã gửi hồ sơ xác thực');
        setKyc(result.data);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Gửi xác thực thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  // Đã có KYC — hiển thị trạng thái
  if (kyc) {
    const statusMap = {
      pending:  { label: 'Đang chờ duyệt', color: COLORS.warning, icon: 'time-outline' },
      approved: { label: 'Đã xác thực',    color: COLORS.success, icon: 'checkmark-circle' },
      rejected: { label: 'Bị từ chối',     color: COLORS.error,   icon: 'close-circle' },
    };
    const st = statusMap[kyc.status] || statusMap.pending;

    return (
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={{ padding: SPACING.lg }}>
        <View style={[styles.statusCard, { borderColor: st.color }]}>
          <Ionicons name={st.icon} size={48} color={st.color} />
          <Text style={[styles.statusLabel, { color: st.color }]}>{st.label}</Text>
          <Text style={styles.statusInfo}>Số GPLX: {kyc.licenseNumber}</Text>
          <Text style={styles.statusInfo}>Họ tên: {kyc.fullName}</Text>
          {kyc.rejectReason && (
            <Text style={styles.rejectReason}>Lý do: {kyc.rejectReason}</Text>
          )}
        </View>
        {kyc.status === 'rejected' && (
          <TouchableOpacity style={styles.retryBtn} onPress={() => setKyc(null)}>
            <Text style={styles.retryBtnText}>Gửi lại hồ sơ</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // Form gửi KYC mới
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={{ padding: SPACING.lg }}>
      <Text style={styles.title}>Xác thực giấy phép lái xe</Text>
      <Text style={styles.subtitle}>Tải lên ảnh mặt trước và mặt sau GPLX để xác thực tài khoản</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Số GPLX *</Text>
        <TextInput
          style={[styles.input, errors.licenseNumber && styles.inputError]}
          placeholder="Nhập số GPLX"
          value={licenseNumber}
          onChangeText={v => { setLicenseNumber(v); if (errors.licenseNumber) validateField('licenseNumber', v); }}
          onBlur={() => validateField('licenseNumber', licenseNumber)}
        />
        {errors.licenseNumber && <Text style={styles.errorText}>{errors.licenseNumber}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Họ và tên *</Text>
        <SuggestionInput
          fieldKey="kyc_fullName"
          style={[styles.input, errors.fullName && styles.inputError]}
          placeholder="Nhập họ tên trên GPLX"
          value={fullName}
          onChangeText={v => { setFullName(v); if (errors.fullName) validateField('fullName', v); }}
          onBlur={() => validateField('fullName', fullName)}
        />
        {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
      </View>

      <Text style={styles.label}>Ảnh mặt trước *</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={() => openImageSource(setFrontImage)}>
        {frontImage ? (
          <Image source={frontImage.uri} style={styles.previewImage} contentFit="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="id-card-outline" size={32} color={COLORS.textSecondary} />
            <Text style={styles.imagePickerText}>Chọn ảnh mặt trước</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Ảnh mặt sau *</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={() => openImageSource(setBackImage)}>
        {backImage ? (
          <Image source={backImage.uri} style={styles.previewImage} contentFit="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="id-card-outline" size={32} color={COLORS.textSecondary} />
            <Text style={styles.imagePickerText}>Chọn ảnh mặt sau</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitBtnText}>Gửi xác thực</Text>
        )}
      </TouchableOpacity>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONT_SIZE.md, backgroundColor: COLORS.surface,
  },
  inputError: { borderColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.xs, marginTop: 4 },
  imagePicker: { marginBottom: SPACING.md, borderRadius: RADIUS.md, overflow: 'hidden' },
  imagePlaceholder: {
    height: 160, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  imagePickerText: { color: COLORS.textSecondary, marginTop: SPACING.xs },
  previewImage: { width: '100%', height: 160, borderRadius: RADIUS.md },
  submitBtn: {
    backgroundColor: COLORS.primary, padding: SPACING.md,
    borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.md,
  },
  submitBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '600' },
  statusCard: {
    borderWidth: 2, borderRadius: RADIUS.lg, padding: SPACING.xl,
    alignItems: 'center', marginBottom: SPACING.lg,
  },
  statusLabel: { fontSize: FONT_SIZE.xl, fontWeight: 'bold', marginTop: SPACING.md },
  statusInfo: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: SPACING.xs },
  rejectReason: { fontSize: FONT_SIZE.sm, color: COLORS.error, marginTop: SPACING.sm, textAlign: 'center' },
  retryBtn: {
    backgroundColor: COLORS.primary, padding: SPACING.md,
    borderRadius: RADIUS.md, alignItems: 'center',
  },
  retryBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '600' },
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
});
