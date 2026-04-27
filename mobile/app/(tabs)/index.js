import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList, Dimensions, Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../contexts/AuthContext';
import { vehicleService } from '../../services/vehicle.service';
import { VehicleCard } from '../../components/VehicleCard';
import { getRecentlyViewed, clearRecentlyViewed } from '../../utils/recentlyViewed';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showError } from '../../utils/toast';

const { width: SW } = Dimensions.get('window');
const BANNER_W = SW * 0.72;

const PROMOTIONS = [
  // --- 2 banner gốc (giữ lại, chỉ bỏ cái 30/04-01/05) ---
  {
    id: 'p2',
    tag: 'TRANG BỊ HIỆN ĐẠI',
    title: 'TRẢI NGHIỆM XE ĐIỆN\nTHÔNG MINH — ƯU ĐÃI 80K',
    desc: 'Êm ái, không tiếng ồn, 400km/sạc. Đặt xe điện nhận ngay 80K, áp dụng đến hết 31/05/2026.',
    badge: 'GIẢM 80K',
    bg: '#1A3A6B',
    icon: 'flash',
    modalTitle: '⚡ TRẢI NGHIỆM XE ĐIỆN — ƯU ĐÃI 80K',
    modalBody: 'Êm ái, không tiếng ồn, tiết kiệm chi phí nhiên liệu.\n\n✅ Xe điện thông minh với phạm vi lên đến 400km/lần sạc.\n\n🔋 Nhận ngay 80K khi đặt xe điện lần đầu trên Mioto, áp dụng đến hết ngày 31/05/2026.',
  },
  {
    id: 'p3',
    tag: 'CHI PHÍ TIẾT KIỆM',
    title: 'CHỈ TỪ 7,2 TRIỆU ĐỒNG\nMỖI THÁNG',
    desc: 'Micarro — đối tác Mioto cung cấp thuê xe dài hạn. Tiết kiệm 50% so với giá thuê ngày, giao tận nhà.',
    badge: 'THUÊ DÀI HẠN',
    bg: '#7C2D12',
    icon: 'calendar',
    modalTitle: '📅 THUÊ XE DÀI HẠN — CHỈ TỪ 7,2 TRIỆU/THÁNG',
    modalBody: 'Micarro — đối tác Mioto cung cấp dịch vụ thuê xe dài hạn.\n\n✅ Tiết kiệm 50% so với giá thuê ngày.\n🚗 Giao xe tận nhà, đa dạng dòng xe.\n📦 Phù hợp cho cá nhân & doanh nghiệp.\n\nLiên hệ ngay để được tư vấn gói phù hợp!',
  },
  // --- 3 banner mới ---
  {
    id: 'p4',
    tag: 'XE MINI',
    title: 'MINI NHỎ GỌN\nLÁI PHỐ DỄ DÀNG',
    desc: 'Dòng xe nhỏ gọn, linh hoạt trong phố. Nhận ngay 100K cho lần đầu đặt xe mini.',
    badge: 'GIẢM 100K',
    bg: '#0B6E35',
    icon: 'car-sport-outline',
    modalTitle: '✨ GIẢM NGAY 100K CHO LẦN ĐẦU LÁI XE MINI',
    modalBody: 'Dòng xe nhỏ gọn, linh hoạt trong phố và thuận tiện khi di chuyển qua nhiều điểm.\n\n✅ Xe mini tiết kiệm nhiên liệu, chi phí hợp lý, dễ luôn lách qua các cung đường trong phố.\n\n🔥 Nhận ngay ưu đãi 100K cho lần đầu đặt xe mini trên Mioto, áp dụng đến hết ngày 31/05/2026.\n\n📱 Đặt xe ngay!',
  },
  {
    id: 'p5',
    tag: 'XE 7 CHỖ',
    title: 'KHÔNG GIAN RỘNG RÃI\nHÀNH TRÌNH THOẢI MÁI',
    desc: 'Xe 7 chỗ rộng rãi, đầy đủ tiện nghi — lý tưởng cho gia đình và nhóm bạn.',
    badge: 'GIẢM 120K',
    bg: '#065F46',
    icon: 'people-outline',
    modalTitle: '⚡ NHẬN NGAY 120K KHI THUÊ XE 7 CHỖ LẦN ĐẦU',
    modalBody: 'Chuyến đi trọn vẹn không chỉ nằm ở điểm đến, mà còn là cảm giác cả hành trình.\n\n🚐 Xe 7 chỗ với không gian rộng rãi, đầy đủ tiện nghi là lựa chọn lý tưởng cho gia đình hay nhóm bạn.\n\nVận hành bền bỉ, cốp lớn chẳng ngại hành lý cồng kềnh.\n\n💥 Giảm ngay 120K cho lần đầu thuê xe 7 chỗ, áp dụng đến hết ngày 31/05/2026.\n\n📱 Mioto xe nào cũng có, thuê ngay!',
  },
  {
    id: 'p6',
    tag: 'THUÊ THEO GIỜ',
    title: 'DI CHUYỂN THUẬN TIỆN\nLINH HOẠT THEO GIỜ',
    desc: 'Không cần thuê cả ngày. Nhập mã 48H — giảm ngay 10% khi thuê theo giờ.',
    badge: 'ƯU ĐÃI 10%',
    bg: '#1A5276',
    icon: 'time-outline',
    modalTitle: '🔥 TIẾT KIỆM 10% KHI THUÊ XE THEO GIỜ',
    modalBody: '🚗 Có những ngày chỉ cần xe trong vài tiếng để mọi kế hoạch ngắn diễn ra gọn gàng.\n\nChọn gói thuê 4h hoặc 8h giúp bạn linh hoạt lịch trình, tối ưu chi phí.\n\n✅ Không cần thuê cả ngày, chỉ cần đúng khung giờ bạn cần.\n\nNhập mã 48H - giảm ngay 10% (tối đa 100k) khi thuê theo giờ, áp dụng đến hết ngày 31/05/2026.',
  },
];

const ADVANTAGES = [
  { icon: 'shield-checkmark-outline', title: 'An tâm đặt xe', desc: 'Hoàn cọc 100% nếu chủ xe hủy trong vòng 7 ngày' },
  { icon: 'document-text-outline',    title: 'Thủ tục đơn giản', desc: 'Chỉ cần CCCD gắn chip & Giấy phép lái xe' },
  { icon: 'car-outline',              title: 'Giao xe tận nơi', desc: 'Phí chỉ từ 15k/km, giao tận nhà/sân bay' },
  { icon: 'apps-outline',             title: 'Đa dạng dòng xe', desc: 'Hơn 100 dòng xe: Mini, Sedan, SUV, MPV, Bán tải' },
];

const INSURANCE_CONTENT = `Với nhiều năm kinh nghiệm trong lĩnh vực cho thuê xe, Mioto hiểu rằng các rủi ro đâm đụng, cháy nổ, thủy kích gây tổn thất lớn luôn tiềm ẩn trong thời gian thuê xe.

✅ Mioto kết hợp với các đối tác bảo hiểm hàng đầu Việt Nam mang đến sản phẩm Bảo hiểm thuê xe tự lái với mức phí tiết kiệm và số tiền bảo hiểm lớn (đến 100% giá trị xe).

Trong thời gian thuê xe, nếu xảy ra sự cố va chạm ngoài ý muốn dẫn đến tổn thất về xe, khách thuê chỉ bồi thường tối đa 2.000.000đ (mức khấu trừ), nhà bảo hiểm hỗ trợ chi phí vượt mức khấu trừ.

• Thiệt hại ≤ 2 triệu → Khách trả toàn bộ
• Thiệt hại > 2 triệu → Khách trả 2 triệu, bảo hiểm trả phần còn lại (tối đa 298 triệu)

Bảo hiểm vật chất xe: đâm va, hỏa hoạn, cháy nổ. Miễn phí cứu hộ tối đa 70km/vụ. Mức khấu trừ: 2.000.000đ/vụ.

Ngoài ra, tài xế & người ngồi trên xe được bảo hiểm tối đa 300.000.000 VNĐ/người/chuyến trong trường hợp có thiệt hại về thân thể do tai nạn khi tham gia giao thông.`;

export default function HomeScreen() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('self');
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [insuranceModal, setInsuranceModal] = useState(false);
  const [promoModal, setPromoModal] = useState(null); // item promo hoặc null
  const [points, setPoints] = useState(user?.rewardPoints ?? 0);

  useEffect(() => { loadVehicles(); }, []);

  useFocusEffect(useCallback(() => {
    getRecentlyViewed().then(setRecentlyViewed).catch(() => {});
    // Sync diem thuong moi khi quay lai tab
    if (user?.rewardPoints !== undefined) setPoints(user.rewardPoints);
  }, [user?.rewardPoints]));

  async function loadVehicles() {
    try {
      const result = await vehicleService.search({ limit: 6 });
      if (result.success) setVehicles(result.data.data);
    } catch {
      showError('Không tải được danh sách xe');
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
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* ===== HEADER ===== */}
      <View style={styles.headerBg}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.push('/profile/edit')}>
              {user?.avatarUrl ? (
                <Image
                  source={user.avatarUrl}
                  style={styles.avatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
              )}
            </TouchableOpacity>
            <View>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.fullName || 'Khách'}
              </Text>
              <TouchableOpacity style={styles.pointsRow} onPress={() => router.push('/profile/points')}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.pointsText}>{points.toLocaleString('vi-VN')} điểm</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/favorites')}>
              <Ionicons name="heart-outline" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/profile/points')}>
              <Ionicons name="gift-outline" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== SEARCH CARD ===== */}
        <View style={styles.searchCard}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'self' && styles.tabActive]}
              onPress={() => setActiveTab('self')}
            >
              <Ionicons name="person-outline" size={16} color={activeTab === 'self' ? '#fff' : COLORS.text} />
              <Text style={[styles.tabText, activeTab === 'self' && styles.tabTextActive]}>Xe tự lái</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, styles.tabDisabled]}
              disabled
            >
              <Ionicons name="car-outline" size={16} color={COLORS.textTertiary} />
              <Text style={styles.tabTextDisabled}>Xe có tài xế</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Sắp có</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Địa điểm */}
          <TouchableOpacity style={styles.fieldRow} onPress={() => router.push('/(tabs)/search')}>
            <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            <View style={styles.fieldInner}>
              <Text style={styles.fieldLabel}>Địa điểm</Text>
              <Text style={styles.fieldValue}>TP. Hồ Chí Minh</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />

          {/* Thời gian */}
          <TouchableOpacity style={styles.fieldRow} onPress={() => router.push('/(tabs)/search')}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <View style={styles.fieldInner}>
              <Text style={styles.fieldLabel}>Thời gian thuê</Text>
              <Text style={styles.fieldValue}>Chọn ngày nhận — trả xe</Text>
            </View>
          </TouchableOpacity>

          {/* Nút tìm */}
          <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.searchBtnText}>Tìm xe</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== CHƯƠNG TRÌNH KHUYẾN MÃI ===== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chương trình khuyến mãi</Text>
      </View>
      <FlatList
        horizontal
        data={PROMOTIONS}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bannerList}
        renderItem={({ item: p }) => (
          <TouchableOpacity
            style={[styles.bannerCard, { width: BANNER_W }]}
            activeOpacity={0.88}
            onPress={() => setPromoModal(p)}
          >
            <View style={[styles.bannerBg, { backgroundColor: p.bg }]}>
              <View style={styles.bannerBadgeRow}>
                <View style={styles.bannerBadge}>
                  <Text style={styles.bannerBadgeText}>{p.badge}</Text>
                </View>
              </View>
              <Text style={styles.bannerTag}>{p.tag}</Text>
              <Text style={styles.bannerTitle}>{p.title}</Text>
              <Text style={styles.bannerDesc} numberOfLines={3}>{p.desc}</Text>
              <View style={styles.bannerIconCircle}>
                <Ionicons name={p.icon} size={40} color="rgba(255,255,255,0.3)" />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* ===== BẢO HIỂM ===== */}
      <View style={[styles.section, { marginTop: SPACING.md }]}>
        <Text style={styles.sectionTitle}>Bảo hiểm</Text>
        <TouchableOpacity onPress={() => setInsuranceModal(true)} activeOpacity={0.9}>
          <Image
            source={require('../../assets/insurance_banner.jpg')}
            style={styles.insuranceBanner}
            contentFit="cover"
          />
        </TouchableOpacity>
      </View>

      {/* ===== XE XEM GẦN ĐÂY ===== */}
      {recentlyViewed.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Xe xem gần đây</Text>
            <TouchableOpacity onPress={() => { setRecentlyViewed([]); clearRecentlyViewed(); }}>
              <Text style={styles.seeAll}>Xóa</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={recentlyViewed}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: SPACING.sm }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentCard}
                onPress={() => router.push(`/vehicle/${item.id}`)}
                activeOpacity={0.85}
              >
                <Image
                  source={item.coverImage || 'https://picsum.photos/seed/car/200/140'}
                  style={styles.recentImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View style={styles.recentBody}>
                  <Text style={styles.recentName} numberOfLines={1}>{item.brand} {item.model}</Text>
                  <Text style={styles.recentPrice}>
                    {new Intl.NumberFormat('vi-VN').format(item.pricePerDay)}đ/ngày
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ===== XE NỔI BẬT ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Xe nổi bật</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.seeAll}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
        ) : vehicles.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có xe nào. Hãy chạy seed để có dữ liệu mẫu.</Text>
        ) : (
          vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)
        )}
      </View>

      {/* ===== ƯU ĐIỂM CỦA MIOTO ===== */}
      <View style={[styles.section, { marginBottom: SPACING.xxl }]}>
        <Text style={styles.sectionTitle}>Ưu điểm của Mioto</Text>
        <View style={styles.advantageGrid}>
          {ADVANTAGES.map((a, i) => (
            <View key={i} style={styles.advantageItem}>
              <View style={styles.advantageIcon}>
                <Ionicons name={a.icon} size={26} color={COLORS.primary} />
              </View>
              <Text style={styles.advantageTitle}>{a.title}</Text>
              <Text style={styles.advantageDesc}>{a.desc}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>

      {/* Modal bảo hiểm */}
      <Modal visible={insuranceModal} animationType="slide" onRequestClose={() => setInsuranceModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bảo hiểm thuê xe</Text>
            <TouchableOpacity onPress={() => setInsuranceModal(false)} style={styles.modalClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxl }}>
            <Text style={styles.modalContent}>{INSURANCE_CONTENT}</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal khuyến mãi */}
      <Modal visible={!!promoModal} animationType="slide" onRequestClose={() => setPromoModal(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={2}>{promoModal?.modalTitle}</Text>
            <TouchableOpacity onPress={() => setPromoModal(null)} style={styles.modalClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          {promoModal && (
            <View style={[styles.promoBannerSmall, { backgroundColor: promoModal.bg }]}>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>{promoModal.badge}</Text>
              </View>
              <Text style={[styles.bannerTitle, { marginTop: SPACING.sm }]}>{promoModal.title}</Text>
            </View>
          )}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxl }}>
            <Text style={styles.modalContent}>{promoModal?.modalBody}</Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  headerBg: { backgroundColor: COLORS.primaryLight, paddingBottom: SPACING.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2, borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  userName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, maxWidth: 160 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  pointsText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  headerRight: { flexDirection: 'row', gap: SPACING.xs },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },

  // Search card
  searchCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg, padding: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  tabs: { flexDirection: 'row', borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.md, backgroundColor: COLORS.surface },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  tabActive: { backgroundColor: COLORS.primary },
  tabDisabled: { opacity: 0.5, position: 'relative' },
  tabText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  tabTextActive: { color: '#fff' },
  tabTextDisabled: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textTertiary },
  comingSoonBadge: {
    backgroundColor: COLORS.border, borderRadius: RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 1, marginLeft: 4,
  },
  comingSoonText: { fontSize: 9, color: COLORS.textSecondary, fontWeight: '600' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  fieldInner: { flex: 1 },
  fieldLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  fieldValue: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  searchBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 14, alignItems: 'center', marginTop: SPACING.sm,
  },
  searchBtnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700' },

  // Sections
  section: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  seeAll: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.lg },

  // Banner khuyến mãi
  bannerList: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  bannerCard: { borderRadius: RADIUS.lg, overflow: 'hidden', marginRight: 2 },
  bannerBg: { padding: SPACING.md, minHeight: 200, position: 'relative', overflow: 'hidden' },
  bannerBadgeRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  bannerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  bannerBadgeText: { color: '#fff', fontSize: FONT_SIZE.xs, fontWeight: '700' },
  bannerTag: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', marginBottom: 4, letterSpacing: 0.5 },
  bannerTitle: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '800', lineHeight: 22, marginBottom: 8 },
  bannerDesc: { color: 'rgba(255,255,255,0.85)', fontSize: FONT_SIZE.xs, lineHeight: 18 },
  bannerIconCircle: { position: 'absolute', bottom: -10, right: -10 },

  // Bảo hiểm banner
  insuranceBanner: {
    width: '100%', height: 120,
    borderRadius: RADIUS.lg, overflow: 'hidden',
  },
  // Modal bảo hiểm
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  modalClose: { padding: SPACING.sm },
  modalContent: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 24 },
  promoBannerSmall: { padding: SPACING.lg, marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg },

  // Xe xem gần đây
  recentCard: {
    width: 160, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  recentImage: { width: '100%', height: 100 },
  recentBody: { padding: SPACING.sm },
  recentName: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  recentPrice: { fontSize: FONT_SIZE.xs, color: COLORS.primary, marginTop: 2 },

  // Ưu điểm
  advantageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  advantageItem: {
    width: (SW - SPACING.lg * 2 - SPACING.sm) / 2,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
  },
  advantageIcon: {
    width: 46, height: 46, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  advantageTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  advantageDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 17 },
});
