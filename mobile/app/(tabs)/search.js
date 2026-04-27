// FR-04: Tìm kiếm và lọc xe — giao diện theo Mioto gốc
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, StatusBar, PanResponder
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { vehicleService } from '../../services/vehicle.service';
import { getRecentlyViewed } from '../../utils/recentlyViewed';
import { VehicleCard } from '../../components/VehicleCard';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { formatPrice } from '../../utils/format';
import api from '../../services/api';

const POPULAR_BRANDS = ['Toyota', 'Honda', 'Mazda', 'Kia', 'Hyundai', 'Ford', 'Mitsubishi', 'VinFast'];
const SEATS_OPTIONS = [4, 5, 7, 9];
const FUEL_OPTIONS = [
  { value: 'gasoline', label: 'Xăng' },
  { value: 'diesel', label: 'Dầu diesel' },
  { value: 'electric', label: 'Điện' },
  { value: 'hybrid', label: 'Hybrid' },
];
const SORT_OPTIONS = [
  { sortBy: 'created_at', order: 'desc', label: 'Mới nhất' },
  { sortBy: 'price', order: 'asc', label: 'Giá thấp nhất' },
  { sortBy: 'price', order: 'desc', label: 'Giá cao nhất' },
  { sortBy: 'year', order: 'desc', label: 'Xe mới nhất' },
];

const KM_STEPS   = [150, 200, 300, 350, 400, 450]; // km/ngày
const FEE_STEPS   = [2, 3, 4, 5];                   // K/km
const DIST_STEPS  = [5, 10, 20, 30, 50];            // km khoảng cách
const FUEL_OPTIONS_FILTER = [
  { label: '< 5L/100km',   value: 'lt5' },
  { label: '5–7L/100km',   value: '5to7' },
  { label: '7–10L/100km',  value: '7to10' },
  { label: '> 10L/100km',  value: 'gt10' },
];

const DEFAULT_FILTERS = {
  transmission: null,
  fuelType: null,
  seats: null,
  minPrice: '',
  maxPrice: '',
  yearFrom: '',
  yearTo: '',
  brand: null,
  featureIds: [],
  sortBy: 'created_at',
  order: 'desc',
  // UI-only (chưa kết nối backend)
  kmLimit: null,    // index trong KM_STEPS, null = bất kỳ
  overspeedFee: null,
  distance: null,
  fuelConsumption: null,
};

export default function SearchScreen() {
  const [keyword, setKeyword] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [features, setFeatures] = useState([]);
  const [tooltip, setTooltip] = useState(null); // { title, content }
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const activeCount = [
    filters.transmission, filters.fuelType, filters.seats, filters.brand,
    filters.minPrice, filters.maxPrice, filters.yearFrom, filters.yearTo,
    ...(filters.featureIds || []),
  ].filter(Boolean).length;

  useEffect(() => {
    search(filters);
    loadFeatures();
  }, []);

  useFocusEffect(useCallback(() => {
    getRecentlyViewed().then(setRecentlyViewed).catch(() => {});
  }, []));

  async function loadFeatures() {
    try {
      const { data } = await api.get('/vehicles/features');
      if (data.success) setFeatures(data.data);
    } catch (_) {}
  }

  const search = useCallback(async (f = filters) => {
    setLoading(true);
    try {
      const params = {};
      if (keyword.trim()) params.province = keyword.trim();
      if (f.transmission) params.transmission = f.transmission;
      if (f.fuelType) params.fuelType = f.fuelType;
      if (f.seats) params.minSeats = f.seats;
      if (f.brand) params.brand = f.brand;
      if (f.minPrice) params.minPrice = f.minPrice;
      if (f.maxPrice) params.maxPrice = f.maxPrice;
      if (f.yearFrom) params.yearFrom = f.yearFrom;
      if (f.yearTo) params.yearTo = f.yearTo;
      if (f.featureIds?.length) params.featureIds = f.featureIds;
      params.sortBy = f.sortBy;
      params.order = f.order;
      // Filters đã kết nối backend
      if (f.kmLimit !== null) params.minKmLimit = KM_STEPS[f.kmLimit];
      if (f.overspeedFee !== null) params.maxOverageFee = FEE_STEPS[f.overspeedFee] * 1000;
      if (f.fuelConsumption !== null) {
        const fcMap = { lt5: 5, '5to7': 7, '7to10': 10 };
        if (fcMap[f.fuelConsumption]) params.maxFuelConsumption = fcMap[f.fuelConsumption];
      }

      const result = await vehicleService.search(params);
      if (result.success) {
        setVehicles(result.data.data);
        setTotal(result.data.pagination.total);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [keyword, filters]);

  function openFilter() {
    setDraft({ ...filters });
    setFilterOpen(true);
  }

  function applyFilter() {
    setFilters({ ...draft });
    setFilterOpen(false);
    search(draft);
  }

  function resetFilter() {
    setDraft({ ...DEFAULT_FILTERS });
  }

  function toggleDraftFeature(id) {
    setDraft(prev => ({
      ...prev,
      featureIds: prev.featureIds.includes(id)
        ? prev.featureIds.filter(f => f !== id)
        : [...prev.featureIds, id],
    }));
  }

  const currentSort = SORT_OPTIONS.find(s => s.sortBy === filters.sortBy && s.order === filters.order) || SORT_OPTIONS[0];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Tìm xe</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Thanh tìm kiếm */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Ionicons name="location-outline" size={20} color={COLORS.primary} />
          <TextInput
            style={styles.input}
            placeholder="Nhập tỉnh/thành phố..."
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={() => search(filters)}
            returnKeyType="search"
          />
          {keyword ? (
            <TouchableOpacity onPress={() => { setKeyword(''); search(filters); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]} onPress={openFilter}>
          <Ionicons name="options-outline" size={22} color={activeCount > 0 ? '#FFF' : COLORS.text} />
          {activeCount > 0 && <Text style={styles.filterCount}>{activeCount}</Text>}
        </TouchableOpacity>
      </View>

      {/* Dòng kết quả */}
      <View style={styles.resultBar}>
        <Text style={styles.resultText}>{total} xe</Text>
        {activeCount > 0 && (
          <TouchableOpacity onPress={() => { setFilters(DEFAULT_FILTERS); search(DEFAULT_FILTERS); }}>
            <Text style={styles.clearText}>Xóa bộ lọc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Danh sách xe */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.lg }}
          renderItem={({ item }) => <VehicleCard vehicle={item} />}
          ListHeaderComponent={
            recentlyViewed.length > 0 && !keyword ? (
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Xe xem gần đây</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                  {recentlyViewed.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.recentChip}
                      onPress={() => router.push(`/vehicle/${item.id}`)}
                    >
                      <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.recentChipText} numberOfLines={1}>
                        {item.brand} {item.model} {item.year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="car-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>Không tìm thấy xe phù hợp</Text>
            </View>
          }
        />
      )}

      {/* === Modal bộ lọc === */}
      <Modal visible={filterOpen} animationType="slide">
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFilterOpen(false)}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Bộ lọc</Text>
            <TouchableOpacity onPress={resetFilter}>
              <Text style={styles.resetText}>Đặt lại</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
            {/* Sắp xếp */}
            <Text style={styles.sectionTitle}>Sắp xếp theo</Text>
            {SORT_OPTIONS.map((s, i) => (
              <TouchableOpacity key={i} style={styles.radioRow}
                onPress={() => setDraft(prev => ({ ...prev, sortBy: s.sortBy, order: s.order }))}>
                <View style={[styles.radio, draft.sortBy === s.sortBy && draft.order === s.order && styles.radioActive]}>
                  {draft.sortBy === s.sortBy && draft.order === s.order && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Mức giá */}
            <Text style={styles.sectionTitle}>Mức giá (VND/ngày)</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>Từ</Text>
                <TextInput style={styles.priceInput} placeholder="VD: 500000" value={draft.minPrice}
                  onChangeText={v => setDraft(p => ({ ...p, minPrice: v.replace(/\D/g, '') }))}
                  keyboardType="number-pad" />
              </View>
              <Text style={styles.priceSep}>—</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>Đến</Text>
                <TextInput style={styles.priceInput} placeholder="VD: 2000000" value={draft.maxPrice}
                  onChangeText={v => setDraft(p => ({ ...p, maxPrice: v.replace(/\D/g, '') }))}
                  keyboardType="number-pad" />
              </View>
            </View>
            {draft.minPrice && draft.maxPrice && (
              <Text style={styles.pricePreview}>
                {formatPrice(Number(draft.minPrice))} — {formatPrice(Number(draft.maxPrice))}
              </Text>
            )}

            {/* Hãng xe */}
            <Text style={styles.sectionTitle}>Hãng xe</Text>
            <View style={styles.chipGrid}>
              {POPULAR_BRANDS.map(b => (
                <TouchableOpacity key={b} style={[styles.filterChip, draft.brand === b && styles.filterChipActive]}
                  onPress={() => setDraft(p => ({ ...p, brand: p.brand === b ? null : b }))}>
                  <Text style={[styles.filterChipText, draft.brand === b && styles.filterChipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Số chỗ */}
            <Text style={styles.sectionTitle}>Số chỗ</Text>
            <View style={styles.chipGrid}>
              {SEATS_OPTIONS.map(s => (
                <TouchableOpacity key={s} style={[styles.filterChip, draft.seats === s && styles.filterChipActive]}
                  onPress={() => setDraft(p => ({ ...p, seats: p.seats === s ? null : s }))}>
                  <Text style={[styles.filterChipText, draft.seats === s && styles.filterChipTextActive]}>{s} chỗ</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Truyền động */}
            <Text style={styles.sectionTitle}>Truyền động</Text>
            <View style={styles.chipGrid}>
              {[{ value: null, label: 'Tất cả' }, { value: 'automatic', label: 'Số tự động' }, { value: 'manual', label: 'Số sàn' }].map(t => (
                <TouchableOpacity key={t.label} style={[styles.filterChip, draft.transmission === t.value && styles.filterChipActive]}
                  onPress={() => setDraft(p => ({ ...p, transmission: t.value }))}>
                  <Text style={[styles.filterChipText, draft.transmission === t.value && styles.filterChipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nhiên liệu */}
            <Text style={styles.sectionTitle}>Loại nhiên liệu</Text>
            <View style={styles.chipGrid}>
              <TouchableOpacity style={[styles.filterChip, !draft.fuelType && styles.filterChipActive]}
                onPress={() => setDraft(p => ({ ...p, fuelType: null }))}>
                <Text style={[styles.filterChipText, !draft.fuelType && styles.filterChipTextActive]}>Tất cả</Text>
              </TouchableOpacity>
              {FUEL_OPTIONS.map(f => (
                <TouchableOpacity key={f.value} style={[styles.filterChip, draft.fuelType === f.value && styles.filterChipActive]}
                  onPress={() => setDraft(p => ({ ...p, fuelType: p.fuelType === f.value ? null : f.value }))}>
                  <Text style={[styles.filterChipText, draft.fuelType === f.value && styles.filterChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Năm sản xuất */}
            <Text style={styles.sectionTitle}>Năm sản xuất</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>Từ năm</Text>
                <TextInput style={styles.priceInput} placeholder="VD: 2018" value={draft.yearFrom}
                  onChangeText={v => setDraft(p => ({ ...p, yearFrom: v }))}
                  keyboardType="number-pad" maxLength={4} />
              </View>
              <Text style={styles.priceSep}>—</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>Đến năm</Text>
                <TextInput style={styles.priceInput} placeholder="VD: 2024" value={draft.yearTo}
                  onChangeText={v => setDraft(p => ({ ...p, yearTo: v }))}
                  keyboardType="number-pad" maxLength={4} />
              </View>
            </View>

            {/* Tính năng */}
            {features.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Tính năng</Text>
                <View style={styles.chipGrid}>
                  {features.map(f => (
                    <TouchableOpacity key={f.id}
                      style={[styles.filterChip, draft.featureIds.includes(f.id) && styles.filterChipActive]}
                      onPress={() => toggleDraftFeature(f.id)}>
                      <Text style={[styles.filterChipText, draft.featureIds.includes(f.id) && styles.filterChipTextActive]}>
                        {f.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Mức tiêu thụ nhiên liệu */}
            <Text style={styles.sectionTitle}>Mức tiêu thụ nhiên liệu</Text>
            <View style={styles.chipGrid}>
              <TouchableOpacity
                style={[styles.filterChip, draft.fuelConsumption === null && styles.filterChipActive]}
                onPress={() => setDraft(p => ({ ...p, fuelConsumption: null }))}>
                <Text style={[styles.filterChipText, draft.fuelConsumption === null && styles.filterChipTextActive]}>Bất kỳ</Text>
              </TouchableOpacity>
              {FUEL_OPTIONS_FILTER.map(f => (
                <TouchableOpacity key={f.value}
                  style={[styles.filterChip, draft.fuelConsumption === f.value && styles.filterChipActive]}
                  onPress={() => setDraft(p => ({ ...p, fuelConsumption: p.fuelConsumption === f.value ? null : f.value }))}>
                  <Text style={[styles.filterChipText, draft.fuelConsumption === f.value && styles.filterChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Giới hạn số km */}
            <FilterSlider
              label="Giới hạn số km"
              steps={KM_STEPS}
              value={draft.kmLimit}
              onChange={v => setDraft(p => ({ ...p, kmLimit: v }))}
              formatValue={v => v === null ? 'Bất kỳ' : `${KM_STEPS[v]} km/ngày trở lên`}
              onTooltip={() => setTooltip({
                title: 'Giới hạn số km',
                content: 'Số km khách thuê được di chuyển tính theo 1 ngày thuê xe, bình quân từ 300–400 km/ngày hoặc hơn. Nếu vượt giới hạn sẽ bị tính phụ phí.',
              })}
            />

            {/* Phí vượt giới hạn */}
            <FilterSlider
              label="Phí vượt giới hạn"
              steps={FEE_STEPS}
              value={draft.overspeedFee}
              onChange={v => setDraft(p => ({ ...p, overspeedFee: v }))}
              formatValue={v => v === null ? 'Bất kỳ' : `${FEE_STEPS[v]}K/km trở xuống`}
            />

            {/* Khoảng cách */}
            <FilterSlider
              label="Khoảng cách"
              steps={DIST_STEPS}
              value={draft.distance}
              onChange={v => setDraft(p => ({ ...p, distance: v }))}
              formatValue={v => v === null ? 'Bất kỳ' : `≤ ${DIST_STEPS[v]} km`}
              onTooltip={() => setTooltip({
                title: 'Khoảng cách',
                content: 'Hiển thị các xe trong phạm vi bạn lựa chọn.',
              })}
            />

          </ScrollView>

          {/* Nút xác nhận */}
          <View style={styles.applyBar}>
            <Text style={styles.applyCount}>{total} xe</Text>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilter}>
              <Text style={styles.applyBtnText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal tooltip (dấu ?) */}
      <Modal visible={!!tooltip} transparent animationType="fade" onRequestClose={() => setTooltip(null)}>
        <TouchableOpacity style={styles.tooltipOverlay} activeOpacity={1} onPress={() => setTooltip(null)}>
          <View style={styles.tooltipBox}>
            <Text style={styles.tooltipTitle}>{tooltip?.title}</Text>
            <Text style={styles.tooltipContent}>{tooltip?.content}</Text>
            <TouchableOpacity style={styles.tooltipClose} onPress={() => setTooltip(null)}>
              <Text style={styles.tooltipCloseText}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ===== CUSTOM SLIDER =====
function FilterSlider({ label, steps, value, onChange, formatValue, onTooltip }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const total = steps.length; // số bước (không tính "bất kỳ")

  // Tổng vị trí = total + 1 (thêm vị trí 0 = bất kỳ)
  const totalPositions = total + 1;
  const currentIndex = value === null ? 0 : value + 1; // 0 = bất kỳ, 1..n = steps[0..n-1]

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => handleTouch(e.nativeEvent.locationX),
    onPanResponderMove: (e) => handleTouch(e.nativeEvent.locationX),
  }), [trackWidth]);

  function handleTouch(x) {
    if (trackWidth === 0) return;
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    const idx = Math.round(ratio * (totalPositions - 1));
    onChange(idx === 0 ? null : idx - 1);
  }

  const thumbPercent = trackWidth > 0
    ? (currentIndex / (totalPositions - 1)) * trackWidth : 0;

  return (
    <View style={sliderStyles.wrap}>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.label}>{label}</Text>
        {onTooltip && (
          <TouchableOpacity onPress={onTooltip} style={sliderStyles.helpBtn}>
            <Ionicons name="help-circle-outline" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <View
        style={sliderStyles.trackArea}
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        {/* Track nền */}
        <View style={sliderStyles.trackBg} />
        {/* Track đã chọn */}
        <View style={[sliderStyles.trackFill, { width: thumbPercent }]} />
        {/* Thumb */}
        <View style={[sliderStyles.thumb, { left: thumbPercent - 12 }]} />
      </View>
      <Text style={sliderStyles.valueLabel}>{formatValue(value)}</Text>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrap: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.text },
  helpBtn: { marginLeft: 6 },
  trackArea: {
    height: 40, justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    position: 'absolute', left: 0, right: 0,
    height: 4, backgroundColor: COLORS.border, borderRadius: 2,
  },
  trackFill: {
    position: 'absolute', left: 0,
    height: 4, backgroundColor: COLORS.primary, borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primary,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
    elevation: 4,
  },
  valueLabel: {
    textAlign: 'right', fontSize: FONT_SIZE.sm,
    color: COLORS.text, fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Header tùy chỉnh
  topHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  topTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.md, backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  searchInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  input: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterCount: { color: '#FFF', fontSize: FONT_SIZE.xs, fontWeight: 'bold' },
  // Filter chips bar — style Mioto
  filterBarWrap: {
    flexShrink: 0,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  filterBar: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    gap: SPACING.sm, alignItems: 'center',
  },
  fChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  fChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  fChipText: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  fChipTextActive: { color: '#FFF', fontWeight: '600' },
  // Kết quả
  resultBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  resultText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  clearText: { fontSize: FONT_SIZE.sm, color: COLORS.error, fontWeight: '600' },
  // Xe xem gần đây
  recentSection: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  recentTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  recentChipText: { fontSize: FONT_SIZE.sm, color: COLORS.text, maxWidth: 120 },
  // Empty
  emptyBox: { alignItems: 'center', marginTop: SPACING.xxl },
  emptyText: { color: COLORS.textSecondary, marginTop: SPACING.md },
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text },
  resetText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT_SIZE.md },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.md },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: COLORS.primary },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.primary },
  radioLabel: { fontSize: FONT_SIZE.md, color: COLORS.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  subLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 4 },
  priceInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.sm, fontSize: FONT_SIZE.sm, backgroundColor: COLORS.surface,
  },
  priceSep: { color: COLORS.textSecondary, fontSize: FONT_SIZE.lg, marginTop: SPACING.md },
  pricePreview: { fontSize: FONT_SIZE.xs, color: COLORS.primary, marginTop: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  filterChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },
  applyBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  applyCount: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  applyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.md },
  applyBtnText: { color: '#FFF', fontWeight: '600', fontSize: FONT_SIZE.md },
  // Tooltip
  tooltipOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  tooltipBox: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: SPACING.xl, width: '82%',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  tooltipTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  tooltipContent: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 22 },
  tooltipClose: {
    marginTop: SPACING.lg, alignSelf: 'flex-end',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  tooltipCloseText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.sm },
});
