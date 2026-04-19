import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';

const MENU_ITEMS = [
  { icon: 'card-outline', label: 'Giấy phép lái xe', screen: '/kyc', enabled: false },
  { icon: 'wallet-outline', label: 'Thẻ thanh toán', screen: '/cards', enabled: false },
  { icon: 'heart-outline', label: 'Xe yêu thích', screen: '/favorites', enabled: false },
  { icon: 'location-outline', label: 'Địa chỉ của tôi', screen: '/addresses', enabled: false },
  { icon: 'gift-outline', label: 'Điểm thưởng & Quà tặng', screen: '/rewards', enabled: false },
  { icon: 'settings-outline', label: 'Cài đặt', screen: '/settings', enabled: false },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất', style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        }
      },
    ]);
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header avatar + tên */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {user?.role === 'host' ? 'Chủ xe' : user?.role === 'admin' ? 'Quản trị viên' : 'Khách thuê'}
          </Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={() => Alert.alert('Chưa triển khai', `Chức năng "${item.label}" sẽ có ở buổi sau`)}
          >
            <Ionicons name={item.icon} size={22} color={COLORS.textSecondary} />
            <Text style={styles.menuText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Đăng xuất */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    backgroundColor: COLORS.background, alignItems: 'center',
    paddingVertical: SPACING.xl, marginBottom: SPACING.md,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
  },
  name: { fontSize: FONT_SIZE.xl, fontWeight: 'bold', color: COLORS.text },
  phone: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },
  roleBadge: {
    marginTop: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 4,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full,
  },
  roleBadgeText: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  menu: { backgroundColor: COLORS.background },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  menuText: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.background, padding: SPACING.md, marginTop: SPACING.md,
  },
  logoutText: { color: COLORS.error, fontSize: FONT_SIZE.md, fontWeight: '600' },
});
