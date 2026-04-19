import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vehicleService } from '../../services/vehicle.service';
import { VehicleCard } from '../../components/VehicleCard';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';

export default function SearchScreen() {
  const [keyword, setKeyword] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    transmission: null,
    fuelType: null,
    minPrice: null,
    maxPrice: null,
    sortBy: 'created_at',
    order: 'desc',
  });

  useEffect(() => { search(); }, []);

  async function search() {
    setLoading(true);
    try {
      const params = { ...filters };
      if (keyword.trim()) params.province = keyword.trim();
      // Loại bỏ null/undefined
      Object.keys(params).forEach(k => params[k] == null && delete params[k]);

      const result = await vehicleService.search(params);
      if (result.success) setVehicles(result.data.data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }

  function applyFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? null : value }));
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Nhập thành phố..."
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={search}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
          <Ionicons name="options-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Active filters chip */}
      {(filters.transmission || filters.fuelType) && (
        <View style={styles.activeFilters}>
          {filters.transmission && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {filters.transmission === 'automatic' ? 'Số tự động' : 'Số sàn'}
              </Text>
            </View>
          )}
          {filters.fuelType && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{filters.fuelType}</Text>
            </View>
          )}
        </View>
      )}

      {/* Result list */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.lg }}
          renderItem={({ item }) => <VehicleCard vehicle={item} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không tìm thấy xe phù hợp</Text>
          }
        />
      )}

      {/* Filter modal */}
      <Modal visible={filterOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bộ lọc</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Hộp số</Text>
            <View style={styles.optionRow}>
              {[
                { value: 'automatic', label: 'Tự động' },
                { value: 'manual', label: 'Số sàn' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.option, filters.transmission === opt.value && styles.optionActive]}
                  onPress={() => applyFilter('transmission', opt.value)}
                >
                  <Text style={[styles.optionText, filters.transmission === opt.value && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Nhiên liệu</Text>
            <View style={styles.optionRow}>
              {[
                { value: 'gasoline', label: 'Xăng' },
                { value: 'diesel', label: 'Dầu' },
                { value: 'electric', label: 'Điện' },
                { value: 'hybrid', label: 'Hybrid' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.option, filters.fuelType === opt.value && styles.optionActive]}
                  onPress={() => applyFilter('fuelType', opt.value)}
                >
                  <Text style={[styles.optionText, filters.fuelType === opt.value && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Sắp xếp theo</Text>
            <View style={styles.optionRow}>
              {[
                { value: { sortBy: 'price', order: 'asc' }, label: 'Giá thấp → cao' },
                { value: { sortBy: 'price', order: 'desc' }, label: 'Giá cao → thấp' },
                { value: { sortBy: 'created_at', order: 'desc' }, label: 'Mới nhất' },
              ].map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.option,
                    filters.sortBy === opt.value.sortBy && filters.order === opt.value.order && styles.optionActive
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, ...opt.value }))}
                >
                  <Text style={[
                    styles.optionText,
                    filters.sortBy === opt.value.sortBy && filters.order === opt.value.order && styles.optionTextActive
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => { setFilterOpen(false); search(); }}
            >
              <Text style={styles.applyBtnText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.lg, paddingBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
  },
  input: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  filterBtn: {
    padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
  },
  activeFilters: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 4,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full,
  },
  chipText: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xs, fontWeight: '500' },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.xl },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: 'bold', color: COLORS.text },
  filterLabel: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  option: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
  },
  optionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionText: { color: COLORS.text, fontSize: FONT_SIZE.sm },
  optionTextActive: { color: '#FFF', fontWeight: '600' },
  applyBtn: {
    backgroundColor: COLORS.primary, padding: SPACING.md,
    borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.lg,
  },
  applyBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '600' },
});
