import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { bookingService } from '../../services/booking.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showError } from '../../utils/toast';
import { formatPrice } from '../../utils/format';

const STATUS_LABELS = {
  pending_payment: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang thuê',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const STATUS_COLORS = {
  pending_payment: '#F59E0B',
  confirmed: '#3B82F6',
  in_progress: '#10B981',
  completed: '#6B7280',
  cancelled: '#EF4444',
};

function StatCard({ icon, label, value, color, sub }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color || COLORS.primary }]}>
      <View style={[styles.statIcon, { backgroundColor: (color || COLORS.primary) + '20' }]}>
        <Ionicons name={icon} size={22} color={color || COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, color && { color }]}>{value}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export default function HostStatsScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    loadStats();
  }, []));

  async function loadStats() {
    setLoading(true);
    try {
      const res = await bookingService.getHostStats();
      setStats(res.data);
    } catch {
      showError('Không thể tải thống kê');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      const res = await bookingService.getHostStats();
      setStats(res.data);
    } catch {
      showError('Không thể làm mới dữ liệu');
    } finally {
      setRefreshing(false);
    }
  }

  const revenueGrowth = stats
    ? stats.revenue.lastMonth > 0
      ? (((stats.revenue.thisMonth - stats.revenue.lastMonth) / stats.revenue.lastMonth) * 100).toFixed(0)
      : null
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thống kê cho thuê</Text>
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
          {/* Tổng quan */}
          <Text style={styles.sectionTitle}>Tổng quan</Text>
          <View style={styles.grid2}>
            <StatCard
              icon="car-sport-outline"
              label="Xe đang cho thuê"
              value={stats?.totalVehicles ?? 0}
              color={COLORS.primary}
            />
            <StatCard
              icon="receipt-outline"
              label="Tổng đơn thuê"
              value={stats?.totalBookings ?? 0}
              color="#6366F1"
            />
            <StatCard
              icon="time-outline"
              label="Chờ xác nhận"
              value={stats?.pendingBookings ?? 0}
              color="#F59E0B"
            />
            <StatCard
              icon="checkmark-circle-outline"
              label="Đã hoàn thành"
              value={stats?.completedBookings ?? 0}
              color="#10B981"
            />
          </View>

          {/* Quản lý nhanh */}
          <Text style={styles.sectionTitle}>Quản lý</Text>
          <View style={styles.quickLinks}>
            {[
              { label: 'Lịch xe tháng này', icon: 'calendar-outline', route: '/host/calendar' },
              { label: 'Khách bị chặn', icon: 'ban-outline', route: '/host/blocked-renters' },
            ].map(l => (
              <TouchableOpacity key={l.route} style={styles.quickLink} onPress={() => router.push(l.route)}>
                <Ionicons name={l.icon} size={20} color={COLORS.primary} />
                <Text style={styles.quickLinkText}>{l.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Doanh thu */}
          <Text style={styles.sectionTitle}>Doanh thu</Text>
          <View style={styles.revenueCard}>
            <View style={styles.revenueMain}>
              <Text style={styles.revenueLabel}>Tổng doanh thu (gộp)</Text>
              <Text style={styles.revenueTotal}>{formatPrice(stats?.revenue.total ?? 0)}</Text>
              {stats?.revenue.netTotal !== undefined && (
                <View style={styles.netRevRow}>
                  <Ionicons name="remove-circle-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.netRevLabel}>Sau phí nền tảng {((stats.platformFeeRate || 0.2) * 100).toFixed(0)}%:</Text>
                  <Text style={styles.netRevVal}>{formatPrice(stats.revenue.netTotal)}</Text>
                </View>
              )}
            </View>
            <View style={styles.revenueRow}>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueSubLabel}>Tháng này</Text>
                <Text style={styles.revenueSubValue}>{formatPrice(stats?.revenue.thisMonth ?? 0)}</Text>
                {revenueGrowth !== null && (
                  <View style={[styles.growthBadge, { backgroundColor: Number(revenueGrowth) >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Ionicons
                      name={Number(revenueGrowth) >= 0 ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={Number(revenueGrowth) >= 0 ? '#10B981' : '#EF4444'}
                    />
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

          {/* Phân bổ trạng thái đơn */}
          {stats?.statusBreakdown && Object.keys(stats.statusBreakdown).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Trạng thái đơn thuê</Text>
              <View style={styles.statusCard}>
                {Object.entries(stats.statusBreakdown).map(([status, count]) => {
                  const total = stats.totalBookings || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <View key={status} style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] || '#999' }]} />
                      <Text style={styles.statusLabel}>{STATUS_LABELS[status] || status}</Text>
                      <View style={styles.statusBarWrap}>
                        <View style={[styles.statusBar, { width: `${pct}%`, backgroundColor: STATUS_COLORS[status] || '#999' }]} />
                      </View>
                      <Text style={styles.statusCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Top xe */}
          {stats?.topVehicles?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Xe được thuê nhiều nhất</Text>
              {stats.topVehicles.map((v, i) => (
                <View key={v.id} style={styles.topVehicleCard}>
                  <Text style={styles.topRank}>#{i + 1}</Text>
                  {v.coverImage ? (
                    <Image source={{ uri: v.coverImage }} style={styles.topVehicleImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.topVehicleImg, styles.topVehicleImgPlaceholder]}>
                      <Ionicons name="car-outline" size={20} color={COLORS.textTertiary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topVehicleName}>{v.brand} {v.model} {v.year}</Text>
                    <Text style={styles.topVehicleCount}>{v.totalBookings} lượt thuê</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Đơn gần đây */}
          {stats?.recentBookings?.length > 0 && (
            <>
              <View style={styles.recentHeader}>
                <Text style={styles.sectionTitle}>Đơn thuê gần đây</Text>
                <TouchableOpacity onPress={() => router.push('/host/bookings')}>
                  <Text style={styles.viewAll}>Xem tất cả</Text>
                </TouchableOpacity>
              </View>
              {stats.recentBookings.map(b => (
                <View key={b.id} style={styles.recentCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentVehicle}>{b.vehicle?.brand} {b.vehicle?.model}</Text>
                    <Text style={styles.recentRenter}>{b.renter?.fullName}</Text>
                  </View>
                  <View>
                    <Text style={[styles.recentStatus, { color: STATUS_COLORS[b.status] }]}>
                      {STATUS_LABELS[b.status]}
                    </Text>
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
  sectionTitle: {
    fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text,
    marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statCard: {
    flex: 1, minWidth: '47%', backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 2 },
  statValue: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text },
  statSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 1 },
  revenueCard: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.lg,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  revenueMain: { marginBottom: SPACING.md },
  revenueLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: 4 },
  revenueTotal: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  netRevRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  netRevLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  netRevVal: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: '#10B981' },
  quickLinks: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  quickLink: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  quickLinkText: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  revenueRow: { flexDirection: 'row', alignItems: 'center' },
  revenueItem: { flex: 1, alignItems: 'center' },
  revenueSubLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 4 },
  revenueSubValue: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  revenueDivider: { width: 1, height: 40, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  growthBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full, marginTop: 4,
  },
  growthText: { fontSize: 11, fontWeight: '700' },
  statusCard: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, gap: SPACING.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { width: 110, fontSize: FONT_SIZE.xs, color: COLORS.text },
  statusBarWrap: { flex: 1, height: 8, backgroundColor: COLORS.surface, borderRadius: 4, overflow: 'hidden' },
  statusBar: { height: '100%', borderRadius: 4 },
  statusCount: { width: 30, textAlign: 'right', fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  topVehicleCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  topRank: { width: 24, fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  topVehicleImg: { width: 56, height: 42, borderRadius: RADIUS.sm },
  topVehicleImgPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  topVehicleName: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  topVehicleCount: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.lg, marginBottom: SPACING.sm },
  viewAll: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
  recentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  recentVehicle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  recentRenter: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  recentStatus: { fontSize: FONT_SIZE.xs, fontWeight: '700', textAlign: 'right' },
  recentAmount: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, textAlign: 'right', marginTop: 2 },
});
