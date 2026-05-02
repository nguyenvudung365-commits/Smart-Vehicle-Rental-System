import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Share, Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

export default function EditProfileScreen() {
  const { user, updateUser, uploadAvatar } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState(user?.avatarUrl || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [birthday, setBirthday] = useState(user?.birthday ? new Date(user.birthday) : new Date(2000, 0, 1));

  async function saveName() {
    if (!fullName.trim()) return showError('Họ tên không được để trống');
    setSaving(true);
    try {
      const result = await updateUser({ fullName: fullName.trim() });
      if (result.success) {
        showSuccess('Đã cập nhật họ tên');
        setEditingName(false);
      }
    } catch {
      showError('Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function doUpload(uri) {
    setAvatarUri(uri);
    setUploadingAvatar(true);
    try {
      const res = await uploadAvatar(uri);
      if (res.success) {
        setAvatarUri(res.data?.avatarUrl || uri);
        showSuccess('Đã cập nhật ảnh đại diện');
      }
    } catch {
      showError('Upload ảnh thất bại, thử lại sau');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return showError('Cần cấp quyền truy cập ảnh');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) doUpload(result.assets[0].uri);
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return showError('Cần cấp quyền truy cập camera');
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) doUpload(result.assets[0].uri);
  }

  function pickAvatar() {
    Alert.alert('Ảnh đại diện', 'Chọn nguồn ảnh', [
      { text: 'Chụp ảnh', onPress: pickFromCamera },
      { text: 'Thư viện ảnh', onPress: pickFromLibrary },
      { text: 'Hủy', style: 'cancel' },
    ]);
  }

  async function onBirthdayChange(_, date) {
    setShowBirthdayPicker(false);
    if (!date) return;
    setBirthday(date);
    try {
      await updateUser({ birthday: date.toISOString().slice(0, 10) });
      showSuccess('Đã cập nhật ngày sinh');
    } catch {
      showError('Cập nhật thất bại');
    }
  }

  async function handleShare() {
    try {
      await Share.share({ message: `Mioto — Hồ sơ của ${user?.fullName}` });
    } catch {}
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tài khoản</Text>
        <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
          <Ionicons name="share-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar}>
            {avatarUri ? (
              <Image source={avatarUri} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={40} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.cameraBtn}>
              {uploadingAvatar
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="camera" size={14} color="#FFF" />
              }
            </View>
          </TouchableOpacity>

          <View style={styles.nameRow}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={fullName}
                  onChangeText={setFullName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                />
                <TouchableOpacity onPress={saveName} disabled={saving} style={styles.saveBtn}>
                  {saving
                    ? <ActivityIndicator size="small" color={COLORS.primary} />
                    : <Text style={styles.saveBtnText}>Lưu</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditingName(false); setFullName(user?.fullName || ''); }}>
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.nameDisplayRow}>
                <Text style={styles.nameText}>{user?.fullName}</Text>
                <TouchableOpacity onPress={() => setEditingName(true)} style={styles.editIconBtn}>
                  <Ionicons name="pencil-outline" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Ngày tham gia</Text>
              <Text style={styles.metaValue}>{fmtDate(user?.createdAt) || '—'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Ngày sinh</Text>
              <Text style={styles.metaValue}>{fmtDate(user?.birthday) || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Thông tin tài khoản */}
        <View style={styles.section}>
          {/* Số điện thoại — không thể thay đổi */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Điện thoại</Text>
            <Text style={styles.infoValue}>{user?.phone}</Text>
          </View>
          <Text style={styles.phoneNote}>Số điện thoại không thể thay đổi sau khi đăng ký</Text>

          <InfoRow
            label="Giấy phép lái xe"
            right="Thêm giấy phép lái xe"
            onPress={() => router.push('/kyc/submit')}
          />
          <InfoRow
            label="Email"
            right={user?.email || 'Thêm email'}
            badge={user?.email ? 'Đã xác thực' : null}
            onPress={() => {}}
          />
          <TouchableOpacity style={[styles.infoRow, { borderBottomWidth: 0 }]}
            onPress={() => setShowBirthdayPicker(true)}>
            <Text style={styles.infoLabel}>Ngày sinh</Text>
            <View style={styles.infoRight}>
              <Text style={styles.infoValue}>{fmtDate(birthday)}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
            </View>
          </TouchableOpacity>
          {showBirthdayPicker && (
            <DateTimePicker
              value={birthday}
              mode="date"
              maximumDate={new Date()}
              onChange={onBirthdayChange}
            />
          )}
        </View>

        <View style={styles.section}>
          <InfoRow
            label="Facebook"
            right="Liên kết ngay"
            onPress={() => {}}
          />
          <InfoRow
            label="Google"
            right="Đã liên kết"
            badge="Đã liên kết"
            badgeColor="#10B981"
            onPress={() => {}}
            noBorder
          />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, right, badge, badgeColor, onPress, noBorder }) {
  return (
    <TouchableOpacity
      style={[styles.infoRow, noBorder && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoRight}>
        {badge && (
          <View style={[styles.badge, { backgroundColor: (badgeColor || COLORS.primary) + '20' }]}>
            <Ionicons name="checkmark-circle" size={13} color={badgeColor || COLORS.primary} />
            <Text style={[styles.badgeText, { color: badgeColor || COLORS.primary }]}>{badge}</Text>
          </View>
        )}
        <Text style={styles.infoValue} numberOfLines={1}>{right}</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: 50, paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },

  scroll: { paddingBottom: 40 },

  avatarCard: {
    backgroundColor: COLORS.background, padding: SPACING.lg,
    marginBottom: SPACING.md, alignItems: 'center',
  },
  avatarWrap: { position: 'relative', marginBottom: SPACING.md },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },

  nameRow: { width: '100%', alignItems: 'center', marginBottom: SPACING.md },
  nameDisplayRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  nameText: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  editIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
  },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, width: '100%' },
  nameInput: {
    flex: 1, fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text,
    borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingVertical: 4,
  },
  saveBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  saveBtnText: { color: COLORS.primary, fontWeight: '700' },

  metaRow: { flexDirection: 'row', gap: SPACING.xl },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  metaValue: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginTop: 2 },

  section: {
    backgroundColor: COLORS.background, marginBottom: SPACING.md,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: FONT_SIZE.md, color: COLORS.text, flex: 1 },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 2, justifyContent: 'flex-end' },
  infoValue: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'right' },
  phoneNote: {
    fontSize: FONT_SIZE.xs, color: COLORS.textTertiary,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, paddingTop: 2,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
