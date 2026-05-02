import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { pointsService } from '../../services/points.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showError } from '../../utils/toast';

const TYPE_INFO = {
  booking_reward: { icon: 'car-sport',   color: '#10B981', label: 'Tích điểm đặt xe' },
  referral_bonus: { icon: 'people',       color: '#8B5CF6', label: 'Giới thiệu bạn bè' },
  points_used:    { icon: 'pricetag',     color: '#EF4444', label: 'Dùng điểm giảm giá' },
  referral_self:  { icon: 'gift',         color: '#F59E0B', label: 'Thưởng đăng ký' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

export default function PointsScreen() {
  const [balance, setBalance]   = useState(0);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pointsService.getPointsInfo();
      if (res.success) {
        setBalance(res.data.balance);
        setHistory(res.data.history);
      }
    } catch {
      showError('Không tải được thông tin điểm thưởng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Điểm thưởng & Ưu đãi</Text>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceIconWrap}>
          <Ionicons name="star" size={32} color="#F59E0B" />
        </View>
        <Text style={styles.balanceLabel}>Số điểm hiện có</Text>
        <Text style={styles.balanceValue}>{balance.toLocaleString('vi-VN')}</Text>
        <Text style={styles.balanceEquiv}>≈ {(balance * 1000).toLocaleString('vi-VN')}đ giảm giá</Text>

        <View style={styles.ruleRow}>
          <View style={styles.ruleItem}>
            <Ionicons name="arrow-up-circle" size={20} color="#10B981" />
            <Text style={styles.ruleText}>1 điểm / 10.000đ chi tiêu</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="arrow-down-circle" size={20} color="#EF4444" />
            <Text style={styles.ruleText}>1 điểm = 1.000đ giảm giá</Text>
          </View>
        </View>
      </View>

      {/* History */}
      <Text style={styles.sectionTitle}>Lịch sử điểm</Text>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          contentContainerStyle={history.length === 0 && styles.emptyContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="star-outline" size={56} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>Chưa có lịch sử điểm</Text>
              <Text style={styles.emptySub}>Đặt xe để bắt đầu tích điểm thưởng</Text>
              <TouchableOpacity style={styles.bookNowBtn} onPress={() => router.push('/')}>
                <Text style={styles.bookNowText}>Tìm xe ngay</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const info = TYPE_INFO[item.type] || { icon: 'star', color: COLORS.primary, label: 'Điểm thưởng' };
            const isEarn = item.points > 0;
            return (
              <View style={styles.histItem}>
                <View style={[styles.histIcon, { backgroundColor: info.color + '20' }]}>
                  <Ionicons name={info.icon} size={22} color={info.color} />
                </View>
                <View style={styles.histInfo}>
                  <Text style={styles.histLabel}>{info.label}</Text>
                  <Text style={styles.histDesc} numberOfLines={1}>{item.description}</Text>
                  <Text style={styles.histTime}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={[styles.histPoints, { color: isEarn ? '#10B981' : '#EF4444' }]}>
                  {isEarn ? '+' : ''}{item.points}
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingTop: 50, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: '#FFF' },

  balanceCard: {
    backgroundColor: COLORS.primary, alignItems: 'center',
    paddingTop: SPACING.md, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl,
  },
  balanceIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  balanceLabel: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  balanceValue: { fontSize: 48, fontWeight: '800', color: '#FFF' },
  balanceEquiv: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: SPACING.lg },
  ruleRow: { flexDirection: 'row', gap: SPACING.lg },
  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ruleText: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.9)' },

  sectionTitle: {
    fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm,
    textTransform: 'uppercase', letterSpacing: 0.5, backgroundColor: COLORS.surface,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', gap: SPACING.sm, paddingTop: 60 },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.text, marginTop: SPACING.sm },
  emptySub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  bookNowBtn: {
    marginTop: SPACING.md, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
  },
  bookNowText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.md },

  histItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.background, padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  histIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  histInfo: { flex: 1 },
  histLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  histDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  histTime: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  histPoints: { fontSize: FONT_SIZE.lg, fontWeight: '800' },
});
