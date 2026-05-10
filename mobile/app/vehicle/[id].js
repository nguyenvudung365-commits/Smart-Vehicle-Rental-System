import { useEffect, useState } from 'react';
import { saveRecentlyViewed } from '../../utils/recentlyViewed';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Dimensions, Modal, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vehicleService } from '../../services/vehicle.service';
import { reviewService } from '../../services/review.service';
import { favoriteService } from '../../services/favorite.service';
import { conversationService } from '../../services/conversation.service';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showError } from '../../utils/toast';
import MapPickerModal from '../../components/MapPickerModal';
import { SafeAreaView } from 'react-native-safe-area-context';


const { width } = Dimensions.get('window');

// Nội dung modal Bảo hiểm thuê xe tự lái
const INSURANCE_CONTENT = `Với nhiều năm kinh nghiệm trong lĩnh vực cho thuê xe, Mioto hiểu rằng các rủi ro đâm đụng, cháy nổ, thủy kích gây tổn thất lớn luôn tiềm ẩn trong thời gian thuê xe.

❌ Hầu hết các rủi ro phát sinh khi thuê xe tự lái sẽ không thuộc phạm vi Bảo hiểm thân vỏ xe theo năm (Bảo hiểm 2 chiều).

✅ Mioto kết hợp với các đối tác bảo hiểm hàng đầu Việt Nam mang đến sản phẩm Bảo hiểm thuê xe tự lái với mức phí tiết kiệm và số tiền bảo hiểm lớn (đến 100% giá trị xe).

I. Nội dung sản phẩm

Trong thời gian thuê xe, nếu xảy ra sự cố va chạm ngoài ý muốn dẫn đến tổn thất về xe, khách thuê chỉ bồi thường tối đa 2.000.000đ (mức khấu trừ), nhà bảo hiểm hỗ trợ chi phí vượt mức khấu trừ.

• Thiệt hại ≤ 2 triệu → Khách trả toàn bộ
• Thiệt hại > 2 triệu → Khách trả 2 triệu, bảo hiểm trả phần còn lại (tối đa 298 triệu)

II. Điều khoản Bảo hiểm

• Bảo hiểm vật chất xe: đâm va, hỏa hoạn, cháy nổ
• Miễn phí cứu hộ tối đa 70km/vụ
• Bảo hiểm thủy kích (khấu trừ 20%, tối thiểu 3 triệu đồng)
• Mức khấu trừ: 2.000.000đ/vụ

III. Quy trình xử lý khi xảy ra sự cố

1. Giữ nguyên hiện trường & chụp ảnh xe bị sự cố
2. Gọi trung tâm bồi thường: MIC - 1900 55 88 91 | DBV (VNI) - 1900 96 96 90
3. Giám định viên liên hệ hướng dẫn xử lý
4. Giám định viên & chủ xe cùng mang xe ra Garage giám định
5. Trung tâm bảo hiểm ra Biên bản giám định thiệt hại
6. Garage tiến hành sửa chữa theo báo giá`;

// Nội dung modal Bảo hiểm Bình An Vạn Dặm
const PASSENGER_INSURANCE_CONTENT = `Bảo vệ cho tài xế & các thành viên trên xe cùng gói bảo hiểm Bình An Vạn Dặm từ bảo hiểm Hàng không DBV (VNI).

I. Nội dung sản phẩm

Trong thời gian thuê xe, tài xế & người ngồi trên xe được bảo hiểm nếu có thiệt hại về thân thể do sự cố không may khi tham gia giao thông, với quyền lợi bảo hiểm lên tới 300.000.000 VNĐ/người/chuyến.

II. Điều khoản Bảo hiểm

• Phạm vi: thiệt hại thân thể do tai nạn khi tham gia giao thông
• Lựa chọn cơ sở khám chữa bệnh bất kì trên toàn quốc

III. Quy trình xử lý khi xảy ra sự cố

1. Sơ cứu người bị thương hoặc gọi cấp cứu 115
2. Thông báo cho Bảo hiểm DBV (VNI) - 1900 96 96 90
3. Nộp hồ sơ yêu cầu bồi thường:
   • Giấy tờ xe bản photo (đăng ký, đăng kiểm), GPLX, giấy CNBH
   • Giấy yêu cầu bảo hiểm
   • Toa thuốc hoặc giấy xuất viện hoặc giấy xác nhận thương tật
   • Chứng từ y tế: hoá đơn, phiếu chỉ định, kết quả chỉ định`;

// Nội dung modal Điều khoản + Chính sách hủy chuyến
const TERMS_CONTENT = `ĐIỀU KHOẢN

# Thanh toán tiền thuê ngay khi bàn giao xe

Quy định khác:
◦ Sử dụng xe đúng mục đích.
◦ Không sử dụng xe thuê vào mục đích phi pháp, trái pháp luật.
◦ Không sử dụng xe thuê để cầm cố, thế chấp.
◦ Không hút thuốc, nhả kẹo cao su, xả rác trong xe.
◦ Không chở hàng quốc cấm dễ cháy nổ.
◦ Không chở hoa quả, thực phẩm nặng mùi trong xe.
◦ Không được di chuyển xe đến khu vực biên giới, cửa khẩu.
◦ Khi trả xe, nếu xe bẩn hoặc có mùi, khách hàng vui lòng vệ sinh xe hoặc gửi phụ thu phí vệ sinh xe.

Trân trọng cảm ơn, chúc quý khách hàng có những chuyến đi tuyệt vời!

────────────────────────────────

CHÍNH SÁCH HỦY CHUYẾN

• Trong vòng 1h sau giữ chỗ → Miễn phí
• Trước chuyến đi >7 ngày (sau 1h giữ chỗ) → 10% giá trị chuyến đi
• Trong vòng 7 ngày trước chuyến đi (sau 1h giữ chỗ) → 40% giá trị chuyến đi

Lưu ý:
* Chính sách hủy áp dụng chung cho cả khách thuê và chủ xe.
* Khách thuê không nhận xe sẽ mất phí hủy 40% giá trị chuyến đi.
* Chủ xe không giao xe sẽ hoàn tiền giữ chỗ & bồi thường 40% giá trị chuyến đi cho khách thuê.
* Tiền hoàn trả sẽ được chuyển khoản trong vòng 1–3 ngày làm việc kế tiếp.`;

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [insuranceModal, setInsuranceModal] = useState(false);
  const [passengerInsuranceModal, setPassengerInsuranceModal] = useState(false);
  const [termsModal, setTermsModal] = useState(false);
  const [reviewData, setReviewData] = useState({ averageRating: 0, totalReviews: 0, reviews: [] });
  const [isFavorited, setIsFavorited] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [mapModal, setMapModal] = useState(false);
  const [bookedRanges, setBookedRanges] = useState([]);

  async function handleChat() {
    if (!vehicle?.owner?.id) return;
    if (vehicle.owner.id === user?.id) return showError('Đây là xe của bạn');
    setChatLoading(true);
    try {
      const res = await conversationService.getOrCreate(vehicle.owner.id, vehicle.id);
      if (res.success) {
        router.push({
          pathname: `/chat/${res.data.id}`,
          params: { otherName: vehicle.owner.fullName },
        });
      }
    } catch {
      showError('Không thể mở chat');
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const [vehicleResult, reviewResult, favResult, bookedResult] = await Promise.all([
        vehicleService.getById(id),
        reviewService.getByVehicle(id).catch(() => ({ success: true, data: { averageRating: 0, totalReviews: 0, reviews: [] } })),
        favoriteService.check(id).catch(() => ({ data: { isFavorited: false } })),
        vehicleService.getBookedDates(id).catch(() => ({ success: false, data: [] })),
      ]);
      if (vehicleResult.success) {
        setVehicle(vehicleResult.data);
        saveRecentlyViewed({
          id: vehicleResult.data.id,
          brand: vehicleResult.data.brand,
          model: vehicleResult.data.model,
          year: vehicleResult.data.year,
          pricePerDay: vehicleResult.data.pricePerDay,
          coverImage: vehicleResult.data.images?.[0]?.imageUrl || null,
          location: vehicleResult.data.address
            ? `${vehicleResult.data.address.district}, ${vehicleResult.data.address.province}` : null,
        }).catch(() => {});
      }
      if (reviewResult.success && reviewResult.data) {
        setReviewData(reviewResult.data);
      }
      if (favResult?.data) setIsFavorited(favResult.data.isFavorited);
      if (bookedResult?.success && bookedResult.data?.length) {
        setBookedRanges(bookedResult.data.map(r => ({
          start: new Date(r.startDate),
          end: new Date(r.endDate),
        })));
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được thông tin xe');
    } finally {
      setLoading(false);
    }
  }


  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!vehicle) {
    return <View style={styles.center}><Text>Không tìm thấy xe</Text></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>

        {/* Gallery */}
        <View>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onScroll={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={16}
          >
            {vehicle.images.length > 0 ? vehicle.images.map((img) => (
              <Image key={img.id} source={img.imageUrl} style={{ width, height: 250 }} contentFit="cover" cachePolicy="memory-disk" />
            )) : (
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

        <View style={styles.body}>
          {/* Tiêu đề */}
          <Text style={styles.title}>{vehicle.brand} {vehicle.model} {vehicle.year}</Text>
          <Text style={styles.plate}>Biển số: {vehicle.licensePlate}</Text>

          {/* Bảo hiểm thuê xe */}
          <View style={styles.insuranceBox}>
            <View style={styles.insuranceHeader}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
              <Text style={styles.insuranceTitle}>Bảo hiểm thuê xe</Text>
            </View>
            <Text style={styles.insuranceSub}>
              Chuyến đi có mua bảo hiểm. Khách thuê bồi thường tối đa 2.000.000 VNĐ trong trường hợp có sự cố ngoài ý muốn
            </Text>
            <TouchableOpacity style={styles.xemThemBtn} onPress={() => setInsuranceModal(true)}>
              <Text style={styles.xemThemText}>Xem thêm</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Bảo hiểm bổ sung */}
          <View style={[styles.insuranceBox, { marginTop: SPACING.sm }]}>
            <Text style={styles.sectionTitle}>Bảo hiểm bổ sung</Text>
            <View style={styles.addInsuranceRow}>
              <View style={styles.addInsuranceInfo}>
                <Text style={styles.addInsuranceName}>Bảo hiểm người trên xe</Text>
                <Text style={styles.addInsuranceSub}>
                  Tài xế & người ngồi trên xe được bảo hiểm tối đa 300.000.000 VNĐ/người/chuyến
                </Text>
              </View>
              <Text style={styles.addInsurancePrice}>40.000đ/ngày</Text>
            </View>
            <TouchableOpacity style={styles.xemThemBtn} onPress={() => setPassengerInsuranceModal(true)}>
              <Text style={styles.xemThemText}>Xem thêm</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Đặc điểm */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đặc điểm</Text>
            <View style={styles.specsGrid}>
              <SpecItem icon="settings-outline" top={vehicle.transmission === 'automatic' ? 'Số tự động' : 'Số sàn'} bottom="Truyền động" />
              <SpecItem icon="people-outline" top={`${vehicle.seats} chỗ`} bottom="Số ghế" />
              <SpecItem icon="flash-outline" top={fuelLabel(vehicle.fuelType)} bottom="Nhiên liệu" />
              <SpecItem icon="speedometer-outline" top={vehicle.fuelConsumption ? `${vehicle.fuelConsumption}L/100km` : 'N/A'} bottom="Tiêu hao" />
            </View>
          </View>

          {/* Mô tả */}
          {vehicle.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mô tả</Text>
              <Text style={styles.description}>{vehicle.description}</Text>
            </View>
          )}

          {/* Vị trí */}
          {vehicle.address && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vị trí xe</Text>
              <View style={styles.addressBox}>
                <Ionicons name="location" size={20} color={COLORS.primary} />
                <Text style={styles.addressText}>
                  {[vehicle.address.detail, vehicle.address.ward, vehicle.address.district, vehicle.address.province].filter(Boolean).join(', ')}
                </Text>
              </View>
              {vehicle.address.latitude && vehicle.address.longitude ? (
                <TouchableOpacity
                  style={styles.gmapsBtn}
                  onPress={() => Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${vehicle.address.latitude},${vehicle.address.longitude}`
                  )}
                >
                  <Ionicons name="navigate-outline" size={16} color="#4285F4" />
                  <Text style={styles.gmapsBtnText}>Xem trên Google Maps</Text>
                  <Ionicons name="open-outline" size={14} color="#4285F4" />
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Tiện nghi */}
          {vehicle.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Các tiện nghi</Text>
              <View style={styles.featuresGrid}>
                {vehicle.features.map((f) => (
                  <View key={f.featureId} style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                    <Text style={styles.featureText}>{f.feature?.name || f.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Chủ xe */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chủ xe</Text>
            <View style={styles.ownerCard}>
              <View style={styles.ownerTop}>
                <View style={styles.ownerAvatar}>
                  <Ionicons name="person" size={28} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ownerName}>{vehicle.owner.fullName}</Text>
                  <View style={styles.ownerMeta}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ownerMetaText}>5.0</Text>
                    <Text style={styles.ownerDot}>•</Text>
                    <Ionicons name="briefcase-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.ownerMetaText}>100+ chuyến</Text>
                  </View>
                </View>
              </View>
              <View style={styles.ownerStats}>
                <View style={styles.ownerStat}>
                  <Text style={styles.ownerStatValue}>100%</Text>
                  <Text style={styles.ownerStatLabel}>Tỉ lệ phản hồi</Text>
                </View>
                <View style={styles.ownerStat}>
                  <Text style={styles.ownerStatValue}>100%</Text>
                  <Text style={styles.ownerStatLabel}>Tỉ lệ đồng ý</Text>
                </View>
                <View style={styles.ownerStat}>
                  <Text style={styles.ownerStatValue}>5 phút</Text>
                  <Text style={styles.ownerStatLabel}>Phản hồi trong</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Đánh giá */}
          <View style={styles.section}>
            <View style={styles.reviewTitleRow}>
              <Text style={styles.sectionTitle}>Đánh giá từ khách thuê</Text>
              {reviewData.totalReviews > 0 && (
                <View style={styles.avgRatingBadge}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.avgRatingText}>{reviewData.averageRating.toFixed(1)}</Text>
                  <Text style={styles.totalReviewsText}>({reviewData.totalReviews})</Text>
                </View>
              )}
            </View>
            {reviewData.reviews.length === 0 ? (
              <Text style={styles.noReviewText}>Chưa có đánh giá nào</Text>
            ) : (
              reviewData.reviews.slice(0, 3).map(rv => (
                <View key={rv.id} style={styles.reviewCard}>
                  <View style={styles.reviewAvatar}>
                    <Ionicons name="person-circle-outline" size={36} color={COLORS.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewerName}>{rv.renter?.fullName || 'Ẩn danh'}</Text>
                      <View style={styles.reviewRating}>
                        {[1,2,3,4,5].map(s => (
                          <Ionicons key={s} name="star" size={12} color={s <= rv.rating ? '#F59E0B' : COLORS.border} />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(rv.createdAt).toLocaleDateString('vi-VN')}
                    </Text>
                    {rv.comment ? (
                      <Text style={styles.reviewComment}>{rv.comment}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Giấy tờ thuê xe */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giấy tờ thuê xe</Text>
            <Text style={styles.subLabel}>Chọn 1 trong 2 hình thức:</Text>
            <View style={styles.docOption}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.text} />
              <Text style={styles.docText}>GPLX (đối chiếu) &amp; Passport (giữ lại)</Text>
            </View>
            <View style={styles.docOption}>
              <Ionicons name="card-outline" size={24} color={COLORS.text} />
              <Text style={styles.docText}>GPLX (đối chiếu) &amp; CCCD (đối chiếu VNeID)</Text>
            </View>
          </View>

          {/* Tài sản thế chấp */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tài sản thế chấp</Text>
            <Text style={styles.description}>Không yêu cầu khách thuê thế chấp Tiền mặt hoặc Xe máy</Text>
          </View>

          {/* Điều khoản */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Điều khoản</Text>
            <Text style={styles.description} numberOfLines={4}>
              {'# Thanh toán tiền thuê ngay khi bàn giao xe\nQuy định khác:\n◦ Sử dụng xe đúng mục đích.\n◦ Không sử dụng xe thuê vào mục đích phi pháp, trái pháp luật.'}
            </Text>
            <TouchableOpacity style={styles.xemThemBtn} onPress={() => setTermsModal(true)}>
              <Text style={styles.xemThemText}>Xem thêm</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Lịch xe đã đặt */}
          {bookedRanges.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ngày xe đã được đặt</Text>
              <Text style={styles.description}>Xe không khả dụng trong các khoảng thời gian sau:</Text>
              {bookedRanges.map((r, i) => (
                <View key={i} style={styles.bookedRangeRow}>
                  <Ionicons name="close-circle" size={16} color={COLORS.error} />
                  <Text style={styles.bookedRangeText}>
                    {r.start.getDate().toString().padStart(2,'0')}/{(r.start.getMonth()+1).toString().padStart(2,'0')}/{r.start.getFullYear()}
                    {' — '}
                    {r.end.getDate().toString().padStart(2,'0')}/{(r.end.getMonth()+1).toString().padStart(2,'0')}/{r.end.getFullYear()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Phụ phí */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phụ phí có thể phát sinh</Text>
            <View style={styles.feeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.feeName}>Phí vượt giới hạn</Text>
                <Text style={styles.feeSub}>Phụ phí nếu di chuyển vượt quá 350km khi thuê xe 1 ngày</Text>
              </View>
              <Text style={styles.feePrice}>3.000đ/km</Text>
            </View>
            <View style={[styles.feeRow, { marginTop: SPACING.md }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.feeName}>Phí quá giờ</Text>
                <Text style={styles.feeSub}>Phụ phí khi hoàn trả xe trễ giờ. Trễ quá 3 giờ phụ phí thêm 1 ngày thuê</Text>
              </View>
              <Text style={styles.feePrice}>70.000đ/giờ</Text>
            </View>
            <View style={[styles.feeRow, { marginTop: SPACING.md }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.feeName}>Phụ phí khác</Text>
                <Text style={styles.feeSub}>Phụ phí nếu xe không đảm bảo vệ sinh hoặc bị ám mùi</Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Sticky bottom */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.priceLabel}>Giá thuê</Text>
          <Text style={styles.priceValue}>
            {new Intl.NumberFormat('vi-VN').format(vehicle.pricePerDay)}đ{' '}
            <Text style={styles.priceUnit}>/ngày</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.heartBtnBar}
          onPress={async () => {
            try {
              const res = await favoriteService.toggle(vehicle.id);
              if (res.success) setIsFavorited(res.data.isFavorited);
            } catch {}
          }}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorited ? COLORS.error : COLORS.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={handleChat}
          disabled={chatLoading}
        >
          {chatLoading
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push({
            pathname: '/booking/create',
            params: {
              vehicleId: vehicle.id,
              vehicleName: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
              pricePerDay: vehicle.pricePerDay,
              vehicleImage: vehicle.images?.[0]?.imageUrl || '',
              vehiclePlate: vehicle.licensePlate || '',
              ownerName: vehicle.owner?.fullName || '',
              vehicleAddress: [vehicle.address?.district, vehicle.address?.province].filter(Boolean).join(', '),
              vehicleLat: vehicle.address?.latitude?.toString() || '',
              vehicleLon: vehicle.address?.longitude?.toString() || '',
            },
          })}
        >
          <Ionicons name="flash" size={16} color="#FFF" />
          <Text style={styles.bookBtnText}>Đặt xe ngay</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Bảo hiểm thuê xe */}
      <InfoModal
        visible={insuranceModal}
        title="Bảo hiểm thuê xe tự lái"
        content={INSURANCE_CONTENT}
        onClose={() => setInsuranceModal(false)}
      />

      {/* Modal Bảo hiểm bổ sung */}
      <InfoModal
        visible={passengerInsuranceModal}
        title="Bảo hiểm Bình An Vạn Dặm"
        content={PASSENGER_INSURANCE_CONTENT}
        onClose={() => setPassengerInsuranceModal(false)}
      />

      {/* Modal Điều khoản */}
      <InfoModal
        visible={termsModal}
        title="Điều khoản & Chính sách hủy"
        content={TERMS_CONTENT}
        onClose={() => setTermsModal(false)}
      />

      {/* Modal bản đồ vị trí xe */}
      {vehicle?.address?.latitude && vehicle?.address?.longitude && (
        <MapPickerModal
          visible={mapModal}
          onClose={() => setMapModal(false)}
          onConfirm={() => setMapModal(false)}
          initialLat={vehicle.address.latitude}
          initialLon={vehicle.address.longitude}
          title="Vị trí xe"
          readOnly
          markerLabel={`${vehicle.brand} ${vehicle.model}`}
        />
      )}
    </View>
  );
}

function InfoModal({ visible, title, content, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: SPACING.xl }}>
          <Text style={styles.modalContent}>{content}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function SpecItem({ icon, top, bottom }) {
  return (
    <View style={styles.specItem}>
      <Ionicons name={icon} size={22} color={COLORS.primary} />
      <Text style={styles.specTop}>{top}</Text>
      <Text style={styles.specBottom}>{bottom}</Text>
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
  imageDots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#FFF', width: 18 },

  body: { backgroundColor: COLORS.background, padding: SPACING.lg },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: 'bold', color: COLORS.text },
  plate: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },

  // Bảo hiểm
  insuranceBox: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.lg,
  },
  insuranceHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  insuranceTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.primary },
  insuranceSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  addInsuranceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  addInsuranceInfo: { flex: 1 },
  addInsuranceName: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  addInsuranceSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  addInsurancePrice: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.primary, whiteSpace: 'nowrap' },
  xemThemBtn: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
  xemThemText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },

  // Đặc điểm
  section: { marginTop: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },
  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  specItem: {
    width: '48%', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  specTop: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  specBottom: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  description: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 22 },
  subLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },

  addressBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  addressText: { flex: 1, color: COLORS.text, lineHeight: 22 },
  gmapsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: SPACING.sm, borderWidth: 1.5, borderColor: '#4285F4',
    borderRadius: RADIUS.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    alignSelf: 'flex-start',
  },
  gmapsBtnText: { fontSize: FONT_SIZE.sm, color: '#4285F4', fontWeight: '600' },

  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  feature: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  featureText: { color: COLORS.text, fontSize: FONT_SIZE.sm },

  // Chủ xe
  ownerCard: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md,
  },
  ownerTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  ownerAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  ownerName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  ownerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ownerMetaText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  ownerDot: { color: COLORS.textTertiary, fontSize: FONT_SIZE.xs },
  ownerStats: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: SPACING.md, justifyContent: 'space-around',
  },
  ownerStat: { alignItems: 'center' },
  ownerStatValue: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  ownerStatLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Đánh giá
  reviewTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  avgRatingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avgRatingText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  totalReviewsText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  noReviewText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  bookedRangeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs },
  bookedRangeText: { fontSize: FONT_SIZE.sm, color: COLORS.error },
  reviewCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  reviewAvatar: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewerName: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewRatingText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  reviewDate: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  reviewComment: { fontSize: FONT_SIZE.sm, color: COLORS.text, marginTop: 4, lineHeight: 20 },

  // Giấy tờ
  docOption: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, marginBottom: SPACING.sm,
  },
  docText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text },

  // Phụ phí
  feeRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  feeName: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  feeSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  feePrice: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.primary, marginLeft: SPACING.sm },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  priceLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  priceValue: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.primary },
  priceUnit: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: 'normal' },
  heartBtnBar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  chatBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
  },
  bookBtnText: { color: '#FFF', fontSize: FONT_SIZE.sm, fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  modalClose: { padding: SPACING.sm },
  modalBody: { flex: 1, padding: SPACING.lg },
  modalContent: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 24 },
});
