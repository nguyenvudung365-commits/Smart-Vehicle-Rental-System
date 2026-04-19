import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Dimensions, Alert
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vehicleService } from '../../services/vehicle.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const result = await vehicleService.getById(id);
      if (result.success) setVehicle(result.data);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không tải được thông tin xe');
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.center}>
        <Text>Không tìm thấy xe</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        {/* Image gallery */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImage(idx);
            }}
            scrollEventThrottle={16}
          >
            {vehicle.images.length > 0 ? (
              vehicle.images.map((img) => (
                <Image
                  key={img.id}
                  source={img.url}
                  style={{ width, height: 250 }}
                  contentFit="cover"
                />
              ))
            ) : (
              <View style={[styles.placeholder, { width, height: 250 }]}>
                <Ionicons name="image-outline" size={48} color={COLORS.textTertiary} />
              </View>
            )}
          </ScrollView>
          {vehicle.images.length > 1 && (
            <View style={styles.imageDots}>
              {vehicle.images.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Info section */}
        <View style={styles.body}>
          <Text style={styles.title}>
            {vehicle.brand} {vehicle.model} {vehicle.year}
          </Text>
          <Text style={styles.plate}>Biển số: {vehicle.licensePlate}</Text>

          {/* Quick specs grid */}
          <View style={styles.specsGrid}>
            <SpecItem icon="settings-outline" label={vehicle.transmission === 'automatic' ? 'Số tự động' : 'Số sàn'} />
            <SpecItem icon="people-outline" label={`${vehicle.seats} chỗ`} />
            <SpecItem icon="flash-outline" label={fuelLabel(vehicle.fuelType)} />
            <SpecItem icon="calendar-outline" label={`Năm ${vehicle.year}`} />
          </View>

          {/* Address */}
          {vehicle.address && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vị trí xe</Text>
              <View style={styles.addressBox}>
                <Ionicons name="location" size={20} color={COLORS.primary} />
                <Text style={styles.addressText}>
                  {[vehicle.address.detail, vehicle.address.ward, vehicle.address.district, vehicle.address.province]
                    .filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>
          )}

          {/* Features */}
          {vehicle.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Các tiện nghi</Text>
              <View style={styles.featuresGrid}>
                {vehicle.features.map((f) => (
                  <View key={f.id} style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                    <Text style={styles.featureText}>{f.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          {vehicle.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mô tả</Text>
              <Text style={styles.description}>{vehicle.description}</Text>
            </View>
          )}

          {/* Owner */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chủ xe</Text>
            <View style={styles.ownerBox}>
              <View style={styles.ownerAvatar}>
                <Ionicons name="person" size={28} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.ownerName}>{vehicle.owner.fullName}</Text>
                <Text style={styles.ownerSince}>
                  Tham gia: {new Date(vehicle.owner.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom: giá + nút đặt xe */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceLabel}>Giá thuê</Text>
          <Text style={styles.priceValue}>
            {formatPrice(vehicle.pricePerDay)} <Text style={styles.priceUnit}>/ngày</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => Alert.alert('Chưa triển khai', 'Chức năng đặt xe sẽ có ở buổi sau (FR-07)')}
        >
          <Text style={styles.bookBtnText}>Đặt xe ngay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SpecItem({ icon, label }) {
  return (
    <View style={styles.specItem}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

function fuelLabel(type) {
  return { gasoline: 'Xăng', diesel: 'Dầu', electric: 'Điện', hybrid: 'Hybrid' }[type] || type;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  placeholder: { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  imageDots: {
    position: 'absolute', bottom: 12, alignSelf: 'center',
    flexDirection: 'row', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#FFF', width: 18 },
  body: { backgroundColor: COLORS.background, padding: SPACING.lg },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: 'bold', color: COLORS.text },
  plate: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },
  specsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.md,
  },
  specItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  specLabel: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  section: { marginTop: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },
  addressBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  addressText: { flex: 1, color: COLORS.text, lineHeight: 22 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  feature: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  featureText: { color: COLORS.text },
  description: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 22 },
  ownerBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  ownerAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  ownerName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  ownerSince: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  priceLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  priceValue: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.primary },
  priceUnit: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: 'normal' },
  bookBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.md },
  bookBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '600' },
});
