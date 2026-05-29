import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { adminService } from '../../services/admin.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showError } from '../../utils/toast';
import { formatPrice } from '../../utils/format';

const STATUS_LABELS = {
  pending_payment: 'Chờ xác nhận',
  confirmed:       'Đã xác nhận',
  in_progress:     'Đang thuê',
  completed:       'Hoàn thành',
  cancelled:       'Đã hủy',
};
const STATUS_COLORS = {
  pending_payment: '#F59E0B',
  confirmed:       '#3B82F6',
  in_progress:     '#10B981',
  completed:       '#6B7280',
  cancelled:       '#EF4444',
};

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()}`;
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color || COLORS.primary }]}>
      <View style={[styles.statIcon, { backgroundColor: (color || COLORS.primary) + '20' }]}>
        <Ionicons name={icon} size={20} color={color || COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color: color || COLORS.text }]}>{value}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export default function AdminStatsScreen() {
  const [stats, setStats] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadStats(); }, []));

  async function loadStats() {
    try {
      const [statsRes, dashRes] = await Promise.all([
        adminService.getStats(),
        adminService.getDashboard(),
      ]);
      setStats(statsRes.data?.data);
      setDashboard(dashRes.data?.data);
    } catch {
      showError('Không thể tải thống kê');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      const [statsRes, dashRes] = await Promise.all([
        adminService.getStats(),
        adminService.getDashboard(),
      ]);
      setStats(statsRes.data?.data);
      setDashboard(dashRes.data?.data);
    } catch { showError('Không thể làm mới'); }
    finally { setRefreshing(false); }
  }

  const revenueGrowth = stats?.revenue.lastMonth > 0
    ? (((stats.revenue.thisMonth - stats.revenue.lastMonth) / stats.revenue.lastMonth) * 100).toFixed(0)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thống kê hệ thống</Text>
        <TouchableOpacity onPress={loadStats}>
          <Ionicons name="refresh-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading && !stats ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xxl }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* Cảnh báo chờ xử lý */}
          {(stats?.pendingKyc > 0 || stats?.vehicles?.pending > 0) && (
            <View style={styles.alertBox}>
              <Ionicons name="alert-circle" size={18} color="#92400E" />
              <View style={{ flex: 1, gap: 2 }}>
                {stats.pendingKyc > 0 && (
                  <TouchableOpacity onPress={() => router.push('/admin/kyc')}>
                    <Text style={styles.alertText}>
                      {stats.pendingKyc} hồ sơ GPLX chờ duyệt → <Text style={styles.alertLink}>Duyệt ngay</Text>
                    </Text>
                  </TouchableOpacity>
                )}
                {stats.vehicles?.pending > 0 && (
                  <TouchableOpacity onPress={() => router.push('/admin/vehicles')}>
                    <Text style={styles.alertText}>
                      {stats.vehicles.pending} xe chờ duyệt → <Text style={styles.alertLink}>Duyệt ngay</Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Realtime dashboard */}
          {dashboard && (
            <>
              <Text style={styles.sectionTitle}>Hoạt động hôm nay</Text>
              <View style={styles.realtimeGrid}>
                <View style={[styles.realtimeCard, { borderColor: '#F59E0B' }]}>
                  <Text style={[styles.realtimeNum, { color: '#F59E0B' }]}>{dashboard.bookings.pendingApproval}</Text>
                  <Text style={styles.realtimeLabel}>Đơn chờ duyệt</Text>
                </View>
                <View style={[styles.realtimeCard, { borderColor: '#10B981' }]}>
                  <Text style={[styles.realtimeNum, { color: '#10B981' }]}>{dashboard.bookings.activeRentals}</Text>
                  <Text style={styles.realtimeLabel}>Xe đang thuê</Text>
                </View>
                <View style={[styles.realtimeCard, { borderColor: '#3B82F6' }]}>
                  <Text style={[styles.realtimeNum, { color: '#3B82F6' }]}>{dashboard.bookings.confirmed}</Text>
                  <Text style={styles.realtimeLabel}>Đã xác nhận</Text>
                </View>
                <View style={[styles.realtimeCard, { borderColor: COLORS.primary }]}>
                  <Text style={[styles.realtimeNum, { color: COLORS.primary }]}>{dashboard.bookings.todayNew}</Text>
                  <Text style={styles.realtimeLabel}>Đơn mới</Text>
                </View>
              </View>
              <View style={styles.revenueCard}>
                <Text style={styles.revenueLabel}>Doanh thu hôm nay</Text>
                <Text style={styles.revenueTotal}>{formatPrice(dashboard.todayRevenue ?? 0)}</Text>
                <Text style={styles.revenueSub}>{dashboard.platform.activeUsers} user · {dashboard.platform.activeVehicles} xe hoạt động</Text>
              </View>
            </>
          )}

          {/* Doanh thu */}
          <Text style={styles.sectionTitle}>Doanh thu hệ thống</Text>
          <View style={styles.revenueCard}>
            <Text style={styles.revenueLabel}>Tổng doanh thu (đã hoàn thành)</Text>
            <Text style={styles.revenueTotal}>{formatPrice(stats?.revenue.total ?? 0)}</Text>
            <View style={styles.revenueRow}>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueSubLabel}>Tháng này</Text>
                <Text style={styles.revenueSubValue}>{formatPrice(stats?.revenue.thisMonth ?? 0)}</Text>
                {revenueGrowth !== null && (
                  <View style={[styles.growthBadge, { backgroundColor: Number(revenueGrowth) >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Ionicons name={Number(revenueGrowth) >= 0 ? 'trending-up' : 'trending-down'} size={11}
                      color={Number(revenueGrowth) >= 0 ? '#10B981' : '#EF4444'} />
                    <Text style={[styles.growthText, { color: Number(revenueGrowth) >= 0 ? '#10B981' : '#EF4444' }]}>
                      {Number(revenueGrowth) >= 0 ? '+' : ''}{revenueGrowth}%
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.revenueDivider} />
              <View style={styles.revenueItem}>
                <Text style={styles.revenueSubLabel}>Tháng trước</Text>
                <Text style={styles.revenueSubValue}>{formatPrice(stats?.revenue.lastMonth ?? 0)}</Text>
              </View>
            </View>
          </View>

          {/* Người dùng */}
          <Text style={styles.sectionTitle}>Người dùng</Text>
          <View style={styles.grid2}>
            <StatCard icon="people-outline"      label="Tổng người dùng"  value={stats?.users.total ?? 0}        color={COLORS.primary} sub={`+${stats?.users.newThisMonth ?? 0} tháng này`} />
            <StatCard icon="person-outline"      label="Khách thuê"       value={stats?.users.renters ?? 0}      color="#6366F1" />
            <StatCard icon="car-sport-outline"   label="Chủ xe"           value={stats?.users.hosts ?? 0}        color="#10B981" />
            <StatCard icon="close-circle-outline" label="Đã vô hiệu"      value={(stats?.users.total ?? 0) - (stats?.users.active ?? 0)} color="#EF4444" />
          </View>

          {/* Xe */}
          <Text style={styles.sectionTitle}>Xe cho thuê</Text>
          <View style={styles.grid2}>
            <StatCard icon="car-outline"              label="Tổng xe"         value={stats?.vehicles.total ?? 0}    color={COLORS.primary} />
            <StatCard icon="checkmark-circle-outline" label="Đã duyệt"        value={stats?.vehicles.approved ?? 0} color="#10B981" />
            <StatCard icon="time-outline"             label="Chờ duyệt"       value={stats?.vehicles.pending ?? 0}  color="#F59E0B" />
          </View>

          {/* Đơn thuê */}
          <Text style={styles.sectionTitle}>Đơn thuê xe</Text>
          <View style={styles.grid2}>
            <StatCard icon="receipt-outline"          label="Tổng đơn"        value={stats?.bookings.total ?? 0}      color={COLORS.primary} sub={`+${stats?.bookings.newThisMonth ?? 0} tháng này`} />
            <StatCard icon="checkmark-done-outline"   label="Hoàn thành"      value={stats?.bookings.completed ?? 0}  color="#10B981" />
            <StatCard icon="hourglass-outline"        label="Chờ xác nhận"    value={stats?.bookings.pending ?? 0}    color="#F59E0B" />
          </View>

          {/* Nhanh điều hướng */}
          <Text style={styles.sectionTitle}>Quản trị nhanh</Text>
          <View style={styles.quickLinks}>
            {[
              { label: 'Quản lý User', icon: 'people-outline', route: '/admin/user-management' },
              { label: 'Phí & Voucher', icon: 'settings-outline', route: '/admin/config' },
              { label: 'Duyệt KYC', icon: 'id-card-outline', route: '/admin/kyc' },
              { label: 'Duyệt xe', icon: 'car-sport-outline', route: '/admin/vehicles' },
            ].map(l => (
              <TouchableOpacity key={l.route} style={styles.quickLink} onPress={() => router.push(l.route)}>
                <Ionicons name={l.icon} size={20} color={COLORS.primary} />
                <Text style={styles.quickLinkText}>{l.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Đơn gần đây */}
          {stats?.recentBookings?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Đơn thuê gần đây</Text>
              {stats.recentBookings.map(b => (
                <View key={b.id} style={styles.recentCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentVehicle} numberOfLines={1}>
                      {b.vehicle?.brand} {b.vehicle?.model}
                    </Text>
                    <Text style={styles.recentRenter}>{b.renter?.fullName} · {formatDate(b.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[b.status] || '#999') + '20' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[b.status] || '#999' }]}>
                        {STATUS_LABELS[b.status] || b.status}
                      </Text>
                    </View>
                    <Text style={styles.recentAmount}>{formatPrice(Number(b.totalAmount))}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  alertBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#FCD34D', padding: SPACING.md, marginBottom: SPACING.md,
  },
  alertText: { fontSize: FONT_SIZE.sm, color: '#92400E' },
  alertLink: { fontWeight: '700', textDecorationLine: 'underline' },
  sectionTitle: {
    fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text,
    marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },
  revenueCard: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.lg, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  revenueLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: 4 },
  revenueTotal: { fontSize: 26, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.md },
  revenueRow: { flexDirection: 'row', alignItems: 'center' },
  revenueItem: { flex: 1, alignItems: 'center' },
  revenueSubLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 4 },
  revenueSubValue: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  revenueDivider: { width: 1, height: 36, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  growthBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full, marginTop: 4,
  },
  growthText: { fontSize: 11, fontWeight: '700' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statCard: {
    flex: 1, minWidth: '47%', backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 2 },
  statValue: { fontSize: FONT_SIZE.xl, fontWeight: '800' },
  statSub: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  recentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  recentVehicle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  recentRenter: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  statusText: { fontSize: 11, fontWeight: '700' },
  recentAmount: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  revenueSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 4 },
  realtimeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  realtimeCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center',
    borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  realtimeNum: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  realtimeLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'center' },
  quickLinks: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: SPACING.sm,
  },
  quickLink: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  quickLinkText: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
});
