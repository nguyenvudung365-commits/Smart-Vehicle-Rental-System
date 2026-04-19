import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { vehicleService } from '../../services/vehicle.service';
import { VehicleCard } from '../../components/VehicleCard';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadVehicles(); }, []);

  async function loadVehicles() {
    try {
      const result = await vehicleService.search({ limit: 10 });
      if (result.success) {
        setVehicles(result.data.data);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không tải được danh sách xe. Kiểm tra kết nối backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadVehicles();
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header chào */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Xin chào,</Text>
          <Text style={styles.userName}>{user?.fullName || 'Bạn'}</Text>
        </View>
        <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
      </View>

      {/* Search bar shortcut */}
      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/(tabs)/search')}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <Text style={styles.searchPlaceholder}>Tìm xe theo địa điểm, thời gian...</Text>
      </TouchableOpacity>

      {/* Banner khuyến mãi (placeholder) */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Ưu đãi tháng này</Text>
          <Text style={styles.bannerSubtitle}>Giảm đến 30% cho chuyến đầu tiên</Text>
        </View>
        <Ionicons name="gift" size={48} color="#FFF" />
      </View>

      {/* Danh sách xe */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Xe nổi bật</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
        ) : vehicles.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có xe nào. Hãy chạy seed script để có data mẫu.</Text>
        ) : (
          vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, paddingTop: SPACING.lg,
  },
  greeting: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  userName: { fontSize: FONT_SIZE.xl, fontWeight: 'bold', color: COLORS.text },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, padding: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
  },
  searchPlaceholder: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: SPACING.lg, margin: SPACING.lg,
  },
  bannerTitle: { color: '#FFF', fontSize: FONT_SIZE.lg, fontWeight: 'bold' },
  bannerSubtitle: { color: '#FFF', fontSize: FONT_SIZE.sm, marginTop: SPACING.xs, opacity: 0.9 },
  section: { padding: SPACING.lg, paddingTop: 0 },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.lg },
});
