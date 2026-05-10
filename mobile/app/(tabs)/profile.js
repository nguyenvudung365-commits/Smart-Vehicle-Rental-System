import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';


const ACCOUNT_ITEMS = [
  { icon: 'person-outline',      label: 'Chỉnh sửa hồ sơ',       route: '/profile/edit' },
  { icon: 'card-outline',        label: 'Giấy phép lái xe',       route: '/kyc/submit' },
  { icon: 'wallet-outline',      label: 'Thẻ thanh toán',         route: '/card' },
  { icon: 'star-outline',        label: 'Điểm thưởng & Ưu đãi',  route: '/profile/points' },
  { icon: 'location-outline',    label: 'Địa chỉ của tôi',        route: '/profile/addresses' },
  { icon: 'people-outline',      label: 'Giới thiệu bạn bè',      route: '/profile/referral' },
  { icon: 'lock-closed-outline', label: 'Đổi mật khẩu',          route: '/profile/change-password' },
];

const HOST_ITEMS = [
  { icon: 'car-sport-outline',   label: 'Xe của tôi',        route: '/host/vehicles' },
  { icon: 'add-circle-outline',  label: 'Đăng ký xe mới',    route: '/host/add-vehicle' },
  { icon: 'receipt-outline',     label: 'Đơn thuê xe',        route: '/host/bookings' },
  { icon: 'bar-chart-outline',   label: 'Thống kê doanh thu', route: '/host/stats' },
];

const ADMIN_ITEMS = [
  { icon: 'bar-chart-outline',        label: 'Thống kê hệ thống',      route: '/admin/stats' },
  { icon: 'shield-checkmark-outline', label: 'Duyệt KYC',              route: '/admin/kyc' },
  { icon: 'car-outline',              label: 'Duyệt xe',               route: '/admin/vehicles' },
  { icon: 'person-remove-outline',    label: 'Yêu cầu xóa tài khoản', route: '/admin/users' },
];

function MenuSection({ title, items }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity
          key={item.label}
          style={styles.menuItem}
          onPress={() => router.push(item.route)}
        >
          <Ionicons name={item.icon} size={22} color={COLORS.textSecondary} />
          <Text style={styles.menuText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isHost = user?.role === 'host';
  const isAdmin = user?.role === 'admin';

  async function doLogout() {
    setShowLogoutConfirm(false);
    await logout();
    router.replace('/(auth)/login');
  }

  async function doDeleteAccount() {
    setDeleting(true);
    try {
      await api.delete('/auth/account');
      setShowDeleteConfirm(false);
      showSuccess('Đã gửi yêu cầu xóa tài khoản. Admin sẽ xử lý trong 1–3 ngày làm việc.');
    } catch {
      showError('Không thể gửi yêu cầu, vui lòng thử lại');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <TouchableOpacity onPress={() => router.push('/profile/edit')}>
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="none"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={40} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.editAvatarBtn}>
              <Ionicons name="pencil" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        {user?.rewardPoints !== undefined && (
          <TouchableOpacity style={styles.pointsBadge} onPress={() => router.push('/profile/points')}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.pointsBadgeText}>{(user.rewardPoints || 0).toLocaleString('vi-VN')} điểm</Text>
          </TouchableOpacity>
        )}
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {isAdmin ? 'Quản trị viên' : isHost ? 'Chủ xe' : 'Khách thuê'}
          </Text>
        </View>
      </View>

      {/* Tài khoản */}
      <MenuSection title="Tài khoản" items={ACCOUNT_ITEMS} />

      {/* Admin panel */}
      {isAdmin && <MenuSection title="Quản trị" items={ADMIN_ITEMS} />}

      {/* Cho thuê xe — host hoặc admin */}
      {(isHost || isAdmin) && <MenuSection title="Cho thuê xe" items={HOST_ITEMS} />}

      {/* Renter muốn trở thành chủ xe */}
      {!isHost && !isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cho thuê xe</Text>
          <TouchableOpacity
            style={styles.becomeHostBtn}
            onPress={() => router.push('/host/add-vehicle')}
          >
            <Ionicons name="car-sport-outline" size={22} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.becomeHostTitle}>Đăng ký cho thuê xe</Text>
              <Text style={styles.becomeHostSub}>Kiếm thêm thu nhập từ xe của bạn</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Đăng xuất */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => setShowLogoutConfirm(true)}>
        <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>

      {/* Xóa tài khoản */}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteConfirm(true)}>
        <Ionicons name="trash-outline" size={18} color={COLORS.textTertiary} />
        <Text style={styles.deleteText}>Yêu cầu xóa tài khoản</Text>
      </TouchableOpacity>

      {/* Modal xác nhận xóa tài khoản */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Ionicons name="warning-outline" size={40} color={COLORS.error} style={{ alignSelf: 'center', marginBottom: SPACING.sm }} />
            <Text style={styles.confirmTitle}>Xóa tài khoản</Text>
            <Text style={styles.confirmMsg}>
              Tài khoản sẽ bị vô hiệu hóa ngay lập tức. Dữ liệu lịch sử sẽ được lưu giữ theo quy định. Bạn có chắc chắn muốn xóa?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={styles.confirmCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmOk, deleting && { opacity: 0.6 }]}
                onPress={doDeleteAccount}
                disabled={deleting}
              >
                <Text style={styles.confirmOkText}>{deleting ? 'Đang xử lý...' : 'Xóa tài khoản'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal xác nhận đăng xuất */}
      <Modal visible={showLogoutConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Đăng xuất</Text>
            <Text style={styles.confirmMsg}>Bạn có chắc muốn đăng xuất?</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowLogoutConfirm(false)}>
                <Text style={styles.confirmCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOk} onPress={doLogout}>
                <Text style={styles.confirmOkText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    backgroundColor: COLORS.background, alignItems: 'center',
    paddingVertical: SPACING.xl, marginBottom: SPACING.md,
  },
  avatarWrap: { position: 'relative', marginBottom: SPACING.md },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  editAvatarBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  name: { fontSize: FONT_SIZE.xl, fontWeight: 'bold', color: COLORS.text },
  phone: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },
  email: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: 4,
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.full,
  },
  pointsBadgeText: { fontSize: FONT_SIZE.xs, color: '#92400E', fontWeight: '700' },
  roleBadge: {
    marginTop: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 4,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full,
  },
  roleBadgeText: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  section: { backgroundColor: COLORS.background, marginBottom: SPACING.md },
  sectionTitle: {
    fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  menuText: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  becomeHostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.primaryLight + '40',
  },
  becomeHostTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  becomeHostSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.background, padding: SPACING.md, marginTop: SPACING.md,
  },
  logoutText: { color: COLORS.error, fontSize: FONT_SIZE.md, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.sm, marginBottom: SPACING.xl,
  },
  deleteText: { color: COLORS.textTertiary, fontSize: FONT_SIZE.sm },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '80%' },
  confirmTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  confirmMsg: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md },
  confirmCancel: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  confirmCancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmOk: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.error },
  confirmOkText: { color: '#FFF', fontWeight: '600' },
});
