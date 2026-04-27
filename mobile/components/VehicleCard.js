import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants/theme';

export function VehicleCard({ vehicle }) {
  function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/vehicle/${vehicle.id}`)}
      activeOpacity={0.85}
    >
      <Image
        source={vehicle.coverImage || 'https://placehold.co/600x400/E5E7EB/999?text=No+Image'}
        style={styles.image}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {vehicle.brand} {vehicle.model} {vehicle.year}
        </Text>

        <View style={styles.specs}>
          <View style={styles.specItem}>
            <Ionicons name="settings-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.specText}>
              {vehicle.transmission === 'automatic' ? 'Số tự động' : 'Số sàn'}
            </Text>
          </View>
          <View style={styles.specItem}>
            <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.specText}>{vehicle.seats} chỗ</Text>
          </View>
        </View>

        {vehicle.location && (
          <View style={styles.specItem}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.specText} numberOfLines={1}>{vehicle.location}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.price}>{formatPrice(vehicle.pricePerDay)}</Text>
          <Text style={styles.priceUnit}>/ngày</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  image: { width: '100%', height: 180, backgroundColor: COLORS.surface },
  body: { padding: SPACING.md },
  name: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  specs: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xs },
  specItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  specText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'baseline', marginTop: SPACING.sm },
  price: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.primary },
  priceUnit: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginLeft: 4 },
});
