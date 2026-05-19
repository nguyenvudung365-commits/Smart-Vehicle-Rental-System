import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Linking, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants/theme';

const DEFAULT_LAT = 10.7769;
const DEFAULT_LON = 106.7009;

/**
 * Map picker hoạt động trong Expo Go:
 * - Lấy GPS hiện tại bằng expo-location
 * - Hiện địa chỉ reverse geocode
 * - Nút "Mở Google Maps" để xem trực quan
 * - Người dùng confirm để lưu tọa độ + địa chỉ
 *
 * Props: visible, onClose, onConfirm(lat, lon, addressParts?),
 *        initialLat, initialLon, title, readOnly, markerLabel
 */
export default function MapPickerModal({
  visible, onClose, onConfirm,
  initialLat, initialLon,
  title = 'Chọn vị trí',
  readOnly = false,
  markerLabel,
}) {
  const [loading, setLoading] = useState(false);
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [address, setAddress] = useState('');
  const [addressParts, setAddressParts] = useState(null);

  useEffect(() => {
    if (!visible) return;
    const initLat = parseFloat(initialLat);
    const initLon = parseFloat(initialLon);
    if (!isNaN(initLat) && !isNaN(initLon)) {
      setLat(initLat);
      setLon(initLon);
      doReverseGeocode(initLat, initLon);
    } else {
      setLat(null);
      setLon(null);
      setAddress('');
      setAddressParts(null);
    }
  }, [visible]);

  async function doReverseGeocode(la, lo) {
    try {
      // Dùng Nominatim (OpenStreetMap) thay vì expo-location để nhất quán iOS & Android
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}&accept-language=vi`,
        { headers: { 'User-Agent': 'MiotoApp/1.0' } }
      );
      const data = await resp.json();
      if (!data?.address) return null;
      const a = data.address;
      const geocodedParts = {
        province: a.city || a.state || a.province || '',
        district: a.city_district || a.county || a.suburb || '',
        ward: a.suburb || a.quarter || a.neighbourhood || '',
        detail: [a.house_number, a.road].filter(Boolean).join(' '),
      };
      const displayParts = [geocodedParts.detail, geocodedParts.ward, geocodedParts.district, geocodedParts.province].filter(Boolean);
      setAddress(displayParts.join(', ') || data.display_name || '');
      setAddressParts(geocodedParts);
      return geocodedParts;
    } catch {}
    return null;
  }

  async function handleGetGPS() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền vị trí', 'Vui lòng cho phép ứng dụng truy cập vị trí trong Cài đặt.');
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const la = pos.coords.latitude;
      const lo = pos.coords.longitude;
      setLat(la);
      setLon(lo);
      setAddress('Đang tải địa chỉ...');
      const parts = await doReverseGeocode(la, lo);
      // Tự xác nhận luôn sau khi lấy GPS (không cần bấm nút Xác nhận)
      if (!readOnly) {
        onConfirm(la, lo, parts);
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không lấy được vị trí. Kiểm tra GPS đã bật chưa.');
    } finally {
      setLoading(false);
    }
  }

  function openGoogleMaps() {
    const la = lat ?? DEFAULT_LAT;
    const lo = lon ?? DEFAULT_LON;
    const label = markerLabel ? encodeURIComponent(markerLabel) : 'Vị trí';
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${la},${lo}&query_place_id=${label}`);
  }

  function handleConfirm() {
    if (lat == null || lon == null) return;
    onConfirm(lat, lon, addressParts);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!readOnly ? (
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.confirmBtn, lat == null && styles.confirmBtnDisabled]}
              disabled={lat == null}
            >
              <Text style={styles.confirmText}>Xác nhận</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>

        <View style={styles.body}>
          {/* Tọa độ hiện tại */}
          <View style={styles.coordCard}>
            <Ionicons
              name={lat != null ? 'location' : 'location-outline'}
              size={28}
              color={lat != null ? COLORS.primary : COLORS.textTertiary}
            />
            <View style={{ flex: 1 }}>
              {lat != null ? (
                <>
                  <Text style={styles.coordText}>
                    {lat.toFixed(6)}, {lon.toFixed(6)}
                  </Text>
                  {address ? (
                    <Text style={styles.addressText} numberOfLines={3}>{address}</Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.noCoordText}>Chưa có tọa độ</Text>
              )}
            </View>
          </View>

          {/* Nút lấy GPS */}
          {!readOnly && (
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleGetGPS}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="navigate" size={18} color="#FFF" />
              }
              <Text style={styles.gpsBtnText}>
                {loading ? 'Đang lấy vị trí...' : 'Lấy vị trí GPS hiện tại'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Nút mở Google Maps */}
          {lat != null && (
            <TouchableOpacity style={styles.gmapsBtn} onPress={openGoogleMaps}>
              <Ionicons name="map-outline" size={18} color="#4285F4" />
              <Text style={styles.gmapsBtnText}>Xem trên Google Maps</Text>
              <Ionicons name="open-outline" size={14} color="#4285F4" />
            </TouchableOpacity>
          )}

          {/* Hướng dẫn */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              {readOnly
                ? 'Nhấn "Xem trên Google Maps" để mở bản đồ.'
                : 'Nhấn "Lấy vị trí GPS" để tự động điền tọa độ và địa chỉ. Sau đó nhấn Xác nhận.'
              }
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  headerBtn: { padding: SPACING.xs },
  title: {
    flex: 1, textAlign: 'center',
    fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
    minWidth: 80, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: COLORS.textTertiary },
  confirmText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.sm },

  body: { flex: 1, padding: SPACING.lg, gap: SPACING.md },

  coordCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  coordText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  addressText: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 20 },
  noCoordText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary, fontStyle: 'italic' },

  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  gpsBtnText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.md },

  gmapsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1.5, borderColor: '#4285F4', borderRadius: RADIUS.md,
    padding: SPACING.md, justifyContent: 'center',
  },
  gmapsBtnText: { flex: 1, color: '#4285F4', fontWeight: '600', fontSize: FONT_SIZE.md },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
  },
  infoText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
});
