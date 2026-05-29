// Màn hình quản lý user: xem danh sách, khóa/mở khóa tài khoản
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/admin.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';


const ROLE_LABEL = { renter: 'Khách thuê', host: 'Chủ xe', admin: 'Admin' };
const ROLE_COLOR = { renter: COLORS.textSecondary, host: COLORS.primary, admin: '#EF4444' };
const ROLE_FILTER = ['all', 'renter', 'host', 'admin'];
const ROLE_FILTER_LABEL = { all: 'Tất cả', renter: 'Khách', host: 'Chủ xe', admin: 'Admin' };

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const LIMIT = 20;

  useFocusEffect(useCallback(() => { loadUsers(1, true); }, [roleFilter]));

  async function loadUsers(p = 1, reset = false) {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = { page: p, limit: LIMIT };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (search.trim()) params.search = search.trim();
      const res = await adminService.getUsers(params);
      if (res.data?.success) {
        const newUsers = res.data.data.users;
        setUsers(reset || p === 1 ? newUsers : prev => [...prev, ...newUsers]);
        setTotal(res.data.data.total);
        setPage(p);
      }
    } catch { showError('Tải danh sách thất bại'); }
    finally { setLoading(false); setLoadingMore(false); }
  }

  function handleSearch() { loadUsers(1, true); }

  function confirmToggle(user) {
    const action = user.isActive ? 'khóa' : 'mở khóa';
    Alert.alert(
      `${user.isActive ? 'Khóa' : 'Mở khóa'} tài khoản`,
      `Bạn có chắc muốn ${action} tài khoản của "${user.fullName}"?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: user.isActive ? 'Khóa' : 'Mở khóa', style: 'destructive', onPress: () => doToggle(user) },
      ],
    );
  }

  async function doToggle(user) {
    try {
      const res = await adminService.toggleUserActive(user.id);
      if (res.data?.success) {
        showSuccess(res.data.message || 'Đã thay đổi trạng thái');
        setUsers(list => list.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
      }
    } catch { showError('Thao tác thất bại'); }
  }

  function renderUser({ item: u }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          {u.avatarUrl ? (
            <Image source={u.avatarUrl} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{u.fullName}</Text>
              {!u.isActive && (
                <View style={styles.lockedBadge}><Text style={styles.lockedText}>Đã khóa</Text></View>
              )}
            </View>
            <Text style={styles.phone}>{u.phone}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.roleBadge, { color: ROLE_COLOR[u.role] }]}>
                {ROLE_LABEL[u.role] || u.role}
              </Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.meta}>{u._count.bookings} đơn</Text>
              {u.role === 'host' && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.meta}>{u._count.vehicles} xe</Text>
                </>
              )}
              <Text style={styles.metaDot}>·</Text>
              <Text style={[styles.meta, { color: u.kyc?.status === 'approved' ? COLORS.success : COLORS.textTertiary }]}>
                KYC: {u.kyc?.status === 'approved' ? '✓' : u.kyc?.status || 'chưa'}
              </Text>
            </View>
          </View>
          {u.role !== 'admin' && (
            <TouchableOpacity
              style={[styles.actionBtn, u.isActive ? styles.lockBtn : styles.unlockBtn]}
              onPress={() => confirmToggle(u)}
            >
              <Ionicons name={u.isActive ? 'lock-closed' : 'lock-open'} size={14} color={u.isActive ? COLORS.error : COLORS.success} />
              <Text style={[styles.actionBtnText, { color: u.isActive ? COLORS.error : COLORS.success }]}>
                {u.isActive ? 'Khóa' : 'Mở'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý user ({total})</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tìm kiếm */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên, SĐT, email..."
            placeholderTextColor={COLORS.textTertiary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); setTimeout(() => loadUsers(1, true), 100); }}>
              <Ionicons name="close-circle" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Tìm</Text>
        </TouchableOpacity>
      </View>

      {/* Filter role */}
      <View style={styles.filterRow}>
        {ROLE_FILTER.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.filterChip, roleFilter === r && styles.filterChipActive]}
            onPress={() => { setRoleFilter(r); }}
          >
            <Text style={[styles.filterText, roleFilter === r && styles.filterTextActive]}>
              {ROLE_FILTER_LABEL[r]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => u.id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
          renderItem={renderUser}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={52} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>Không tìm thấy user</Text>
            </View>
          }
          onEndReached={() => {
            if (!loadingMore && users.length < total) loadUsers(page + 1);
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.md }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },

  searchRow: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.background },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.sm,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text, paddingVertical: SPACING.sm },
  searchBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, justifyContent: 'center',
  },
  searchBtnText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.sm },

  filterRow: {
    flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  filterChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  filterText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.primary, fontWeight: '700' },

  card: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  name: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  phone: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  roleBadge: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  metaDot: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  meta: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  lockedBadge: { backgroundColor: '#FEE2E2', borderRadius: RADIUS.sm, paddingHorizontal: 5, paddingVertical: 1 },
  lockedText: { fontSize: 9, color: '#EF4444', fontWeight: '700' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.sm, borderWidth: 1,
    paddingHorizontal: SPACING.sm, paddingVertical: 5,
  },
  lockBtn: { borderColor: COLORS.error + '60' },
  unlockBtn: { borderColor: COLORS.success + '60' },
  actionBtnText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },

  empty: { alignItems: 'center', marginTop: 60, gap: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
});
