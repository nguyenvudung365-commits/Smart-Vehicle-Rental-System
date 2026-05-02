// Màn hình xe yêu thích
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { favoriteService } from '../../services/favorite.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showError, showSuccess } from '../../utils/toast';
import { formatPrice } from '../../utils/format';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await favoriteService.getMyFavorites();
      if (result.success) setFavorites(result.data);
    } catch { showError('Không tải được danh sách yêu thích'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleRemove(vehicleId) {
    try {
      await favoriteService.toggle(vehicleId);
      setFavorites(prev => prev.filter(f => f.id !== vehicleId));
      showSuccess('Đã bỏ yêu thích');
    } catch {}
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Xe yêu thích</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={item => item.id}
          contentContainerStyle={favorites.length === 0 ? styles.emptyWrap : { padding: SPACING.md }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>Chưa có xe yêu thích</Text>
              <Text style={styles.emptySub}>Nhấn biểu tượng ♡ khi xem xe để lưu lại</Text>
              <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/search')}>
                <Text style={styles.browseBtnText}>Tìm xe ngay</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/vehicle/${item.id}`)}
              activeOpacity={0.85}
            >
              <Image
                source={item.coverImage || item.images?.[0]?.imageUrl}
                style={styles.cardImg}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <View style={styles.cardBody}>
                <Text style={styles.carName} numberOfLines={1}>
                  {item.brand} {item.model} {item.year}
                </Text>
                <Text style={styles.carLocation} numberOfLines={1}>
                  <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
                  {' '}{item.location || 'Chưa có địa chỉ'}
                </Text>
                <Text style={styles.carPrice}>
                  {formatPrice(item.pricePerDay)}<Text style={styles.perDay}>/ngày</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={() => handleRemove(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="heart" size={22} color={COLORS.error} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', gap: SPACING.md, padding: SPACING.xl },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.text },
  emptySub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center' },
  browseBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, marginTop: SPACING.sm,
  },
  browseBtnText: { color: '#FFF', fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm, overflow: 'hidden',
  },
  cardImg: { width: 100, height: 80 },
  cardBody: { flex: 1, padding: SPACING.sm },
  carName: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  carLocation: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  carPrice: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  perDay: { fontSize: FONT_SIZE.xs, fontWeight: '400', color: COLORS.textSecondary },
  heartBtn: { padding: SPACING.md },
});
