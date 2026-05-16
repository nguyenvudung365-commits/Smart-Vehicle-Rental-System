import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Platform, FlatList, KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { bookingService } from '../../services/booking.service';
import { cardService } from '../../services/card.service';
import { pointsService } from '../../services/points.service';
import { addressService } from '../../services/address.service';
import { vehicleService } from '../../services/vehicle.service';
import { voucherService } from '../../services/voucher.service';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { formatPrice } from '../../utils/format';
import MapPickerModal from '../../components/MapPickerModal';
import { SafeAreaView } from 'react-native-safe-area-context';


const INSURANCE_RATE = 0.09;  // 9% bảo hiểm thuê xe
const DEPOSIT_RATE   = 0.40;  // 40% thanh toán giữ chỗ
const DISCOUNT_PROMO = 100000; // Giảm 100K chương trình

// Nội dung expandable "Giấy tờ thuê xe"
const GIAYTO_CONTENT = `1. Giấy phép lái xe
Chủ xe đối chiếu bản gốc hoặc bản điện tử (VN-eID/VN-eTraffic) & gửi lại bạn.
• GPLX trùng khớp với thông tin đã xác thực trên app Mioto.
• GPLX còn điểm & còn hiệu lực trên VN-eID hoặc VN-eTraffic.

2. Chọn 1 trong 2 giấy tờ sau:
• CCCD gắn chip (chủ xe đối chiếu bản gốc/điện tử VN-eID & gửi lại bạn)
• Passport (chủ xe kiểm tra bản gốc, giữ lại & hoàn trả khi bạn trả xe)

Thanh toán giữ chỗ
40% giá trị chuyến đi thanh toán trước qua Mioto. Số còn lại thanh toán cho chủ xe khi nhận xe.
⚠️ Hủy trong vòng 1h sau giữ chỗ để không mất phí.

Thanh toán khi nhận xe
Phần tiền còn lại (nếu có) bằng Tiền mặt hoặc Chuyển khoản cho chủ xe.

Tài sản thế chấp
Chủ xe hỗ trợ miễn thế chấp. Không cần để lại xe máy hoặc tiền mặt.

Đơn giá thuê
• Tính tròn theo ngày. Thuê dưới 24h tính tròn 1 ngày.
• Chưa bao gồm tiền xăng/sạc pin. Vui lòng đổ xăng/sạc pin về mức ban đầu khi trả xe.
• Đã bao gồm phí dịch vụ Mioto: tổng đài hỗ trợ, tìm xe thay thế nếu bị hủy, hỗ trợ bảo hiểm và dàn xếp tranh chấp.`;

// Format ngày theo kiểu Mioto: "21h00 CN, 26/04/2026"
const DOW_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
function fmtDateTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const dow = DOW_VI[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${h}h${m} ${dow}, ${dd}/${mm}/${yyyy}`;
}
function isToday(date) {
  const t = new Date();
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
}

export default function CreateBookingScreen() {
  const { vehicleId, vehicleName, pricePerDay, vehicleImage, vehiclePlate, ownerName, vehicleAddress, vehicleLat, vehicleLon } = useLocalSearchParams();
  const { user } = useAuth();
  const price = Number(pricePerDay);

  // Ngày mặc định: nhận ngay bây giờ, trả sau 1 ngày
  const now = new Date();
  const defaultEnd = new Date(now);
  defaultEnd.setDate(defaultEnd.getDate() + 1);

  const [startDate, setStartDate] = useState(now);
  const [endDate, setEndDate]     = useState(defaultEnd);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker]     = useState(false);

  const [cards, setCards]               = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [loadingCards, setLoadingCards] = useState(true);

  const [note, setNote]                 = useState('');
  const [agreed, setAgreed]             = useState(false);
  const [usePromo, setUsePromo]         = useState(true);
  const [showGiayTo, setShowGiayTo]     = useState(false);
  const [infoModal, setInfoModal]       = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [usePoints, setUsePoints]       = useState(false);
  const [deliveryOption, setDeliveryOption] = useState('pickup'); // 'pickup' | 'delivery'
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [myAddresses, setMyAddresses] = useState([]);
  const [showAddrModal, setShowAddrModal] = useState(false);
  const [vehicleMapModal, setVehicleMapModal] = useState(false);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [dateConflict, setDateConflict] = useState(false);
  const FEE_PER_KM = 5000;

  // Voucher
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherData, setVoucherData] = useState(null); // { id, code, discountAmount }
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [showVoucherInput, setShowVoucherInput] = useState(false);

  // Tính toán giá
  const diffMs    = Math.max(endDate.getTime() - startDate.getTime(), 0);
  const rentalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const insurancePerDay = Math.round(price * INSURANCE_RATE);
  const totalPerDay     = price + insurancePerDay;
  const subtotal        = totalPerDay * rentalDays;

  // Điểm tối đa có thể dùng (30% subtotal, không vượt số dư)
  const maxPointsDiscount = Math.floor(subtotal * 0.3 / 1000); // quy ra diem
  const usablePoints      = Math.min(pointsBalance, maxPointsDiscount);
  const pointsDiscountVnd = usePoints ? usablePoints * 1000 : 0;

  const voucherDiscountVnd = voucherData?.discountAmount || 0;
  const discount    = usePromo && !usePoints ? DISCOUNT_PROMO : usePoints ? pointsDiscountVnd : voucherDiscountVnd;

  // Tính phí giao xe theo khoảng cách (5k/km)
  // vehicleLatLng cần parse từ vehicleAddress params — nếu không có tọa độ thì dùng base 15km
  const deliveryDistKm = (() => {
    if (deliveryOption !== 'delivery' || !selectedAddress) return 0;
    const dist = calcDistance(
      parseFloat(vehicleLat), parseFloat(vehicleLon),
      parseFloat(selectedAddress.latitude), parseFloat(selectedAddress.longitude),
    );
    return dist != null ? Math.ceil(dist) : 15;
  })();
  const deliveryFee = deliveryOption === 'delivery' && selectedAddress
    ? Math.max(deliveryDistKm, 1) * FEE_PER_KM
    : 0;
  const thanhTien   = Math.max(0, subtotal - discount + deliveryFee);
  const giuCho      = Math.round(thanhTien * DEPOSIT_RATE);
  const khinhanXe   = thanhTien - giuCho;

  useEffect(() => { loadPoints(); loadAddresses(); loadBookedDates(); }, []);

  // Tải lại thẻ mỗi khi màn hình được focus (ví dụ: sau khi thêm thẻ xong quay lại)
  useFocusEffect(useCallback(() => { loadCards(); }, []));

  async function loadBookedDates() {
    try {
      const res = await vehicleService.getBookedDates(vehicleId);
      if (res.success) {
        setBookedRanges(res.data.map(r => ({
          start: new Date(r.startDate),
          end: new Date(r.endDate),
        })));
      }
    } catch {}
  }

  function checkConflict(start, end) {
    return bookedRanges.some(r => start < r.end && end > r.start);
  }

  async function loadAddresses() {
    try {
      const res = await addressService.getMyAddresses();
      if (res.success) setMyAddresses(res.data);
    } catch {}
  }

  // Haversine formula — km
  function calcDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  async function loadPoints() {
    try {
      const res = await pointsService.getPointsInfo();
      if (res.success) setPointsBalance(res.data.balance);
    } catch {}
  }

  async function applyVoucher() {
    const code = voucherCode.trim();
    if (!code) return showError('Nhập mã voucher trước');
    setVoucherLoading(true);
    try {
      const res = await voucherService.check(code, subtotal);
      if (res.success) {
        setVoucherData(res.data);
        setUsePromo(false);
        setUsePoints(false);
        showSuccess(`Áp dụng thành công! Giảm ${formatPrice(res.data.discountAmount)}`);
      }
    } catch (e) {
      showError(e?.response?.data?.message || 'Mã voucher không hợp lệ');
      setVoucherData(null);
    } finally {
      setVoucherLoading(false);
    }
  }

  async function loadCards() {
    try {
      const result = await cardService.getMyCards();
      if (result.success) {
        setCards(result.data);
        const def = result.data.find(c => c.isDefault);
        if (def) setSelectedCardId(def.id);
        else if (result.data.length) setSelectedCardId(result.data[0].id);
      }
    } catch { /* no-op */ }
    finally { setLoadingCards(false); }
  }

  function onStartChange(_, date) {
    setShowStartPicker(false);
    if (!date) return;
    let newEnd = endDate;
    if (date >= endDate) {
      newEnd = new Date(date);
      newEnd.setDate(newEnd.getDate() + 1);
      setEndDate(newEnd);
    }
    setStartDate(date);
    setDateConflict(checkConflict(date, newEnd));
  }

  function onEndChange(_, date) {
    setShowEndPicker(false);
    if (!date) return;
    if (date <= startDate) return showError('Ngày trả phải sau ngày nhận');
    setEndDate(date);
    setDateConflict(checkConflict(startDate, date));
  }

  async function handleSubmit() {
    if (!agreed)         return showError('Vui lòng đồng ý với chính sách hủy chuyến');
    if (!selectedCardId) return showError('Vui lòng chọn thẻ thanh toán');
    if (dateConflict || checkConflict(startDate, endDate))
      return showError('Xe đã được đặt trong khoảng thời gian này, vui lòng chọn ngày khác');

    router.push({
      pathname: '/booking/payment',
      params: {
        bookingPayload: JSON.stringify({
          vehicleId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          cardId: selectedCardId,
          note: [note, deliveryOption === 'delivery' && selectedAddress ? `[Giao xe đến: ${[selectedAddress.detail, selectedAddress.ward, selectedAddress.district].filter(Boolean).join(', ')}]` : ''].filter(Boolean).join(' '),
          usePoints: usePoints ? usablePoints : 0,
          // Chỉ gửi voucherCode khi không dùng promo hay điểm thưởng
          voucherCode: (!usePromo && !usePoints && voucherData) ? voucherData.code : '',
        }),
        totalAmount: thanhTien,
        vehicleName,
        cardLast4: selectedCard?.last4 || '****',
      },
    });
  }

  const selectedCard = cards.find(c => c.id === selectedCardId);

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* 1. Thông tin xe */}
        <View style={styles.vehicleCard}>
          {vehicleImage ? (
            <Image source={vehicleImage} style={styles.vehicleThumb} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.vehicleThumb, styles.thumbPlaceholder]}>
              <Ionicons name="car-sport" size={28} color={COLORS.textTertiary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName}>{vehicleName}</Text>
            <Text style={styles.vehiclePlate}>Mã số xe: {vehiclePlate}</Text>
            <View style={styles.vehicleMeta}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.metaText}>5.0</Text>
              <Text style={styles.metaDot}>•</Text>
              <Ionicons name="briefcase-outline" size={13} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>100+ chuyến</Text>
            </View>
          </View>
        </View>

        {/* 2. Bảo hiểm thuê xe */}
        <View style={styles.insuranceBanner}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.insuranceBannerTitle}>Bảo hiểm thuê xe</Text>
            <Text style={styles.insuranceBannerSub}>Chuyến đi có mua bảo hiểm. Khách thuê bồi thường tối đa 2.000.000 VNĐ trong trường hợp có sự cố ngoài ý muốn.</Text>
          </View>
        </View>

        {/* 3. Thời gian thuê */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thời gian thuê xe</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity style={styles.timeCol} onPress={() => setShowStartPicker(true)}>
              <View style={styles.timeHeader}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.timeLabel}>Nhận xe</Text>
              </View>
              <Text style={styles.timeValue}>{fmtDateTime(startDate)}</Text>
              {isToday(startDate) && <Text style={styles.timeNote}>(Hôm nay)</Text>}
            </TouchableOpacity>
            <View style={styles.timeDivider} />
            <TouchableOpacity style={styles.timeCol} onPress={() => setShowEndPicker(true)}>
              <View style={styles.timeHeader}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.timeLabel}>Trả xe</Text>
              </View>
              <Text style={styles.timeValue}>{fmtDateTime(endDate)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Nhận xe tại địa chỉ của xe</Text>
              <Text style={styles.addressValue}>{vehicleAddress || 'Xem chi tiết trên bản đồ'}</Text>
            </View>
          </View>
          {vehicleLat && vehicleLon ? (
            <TouchableOpacity style={styles.mapLink} onPress={() => setVehicleMapModal(true)}>
              <Ionicons name="map-outline" size={14} color={COLORS.primary} />
              <Text style={styles.mapLinkText}>Xem bản đồ</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {showStartPicker && (
          <DateTimePicker value={startDate} mode="date" minimumDate={new Date()} onChange={onStartChange} />
        )}
        {showEndPicker && (
          <DateTimePicker value={endDate} mode="date" minimumDate={new Date(startDate.getTime() + 86400000)} onChange={onEndChange} />
        )}

        {/* Cảnh báo trùng ngày */}
        {dateConflict && (
          <View style={styles.conflictBanner}>
            <Ionicons name="warning-outline" size={16} color="#92400E" />
            <Text style={styles.conflictText}>
              Xe đã được đặt trong khoảng thời gian này. Vui lòng chọn ngày khác.
            </Text>
          </View>
        )}

        {/* Lịch ngày đã đặt */}
        {bookedRanges.length > 0 && (
          <View style={styles.bookedSection}>
            <View style={styles.bookedHeader}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.bookedTitle}>Xe đã được đặt trong các ngày:</Text>
            </View>
            {bookedRanges.map((r, i) => (
              <Text key={i} style={styles.bookedRange}>
                • {r.start.getDate().toString().padStart(2,'0')}/{(r.start.getMonth()+1).toString().padStart(2,'0')}/{r.start.getFullYear()}
                {' — '}
                {r.end.getDate().toString().padStart(2,'0')}/{(r.end.getMonth()+1).toString().padStart(2,'0')}/{r.end.getFullYear()}
              </Text>
            ))}
          </View>
        )}

        {/* 3b. Hình thức nhận xe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hình thức nhận xe</Text>
          <TouchableOpacity style={styles.deliveryOption} onPress={() => setDeliveryOption('pickup')}>
            <View style={[styles.radio, deliveryOption === 'pickup' && styles.radioSelected]}>
              {deliveryOption === 'pickup' && <View style={styles.radioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryLabel}>Nhận xe tại địa chỉ của xe</Text>
              <Text style={styles.deliverySub}>{vehicleAddress || 'Xem chi tiết trên bản đồ'}</Text>
            </View>
            <Text style={styles.deliveryFreeText}>Miễn phí</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deliveryOption} onPress={async () => {
            setDeliveryOption('delivery');
            // Reload địa chỉ mỗi lần mở
            const res = await addressService.getMyAddresses().catch(() => null);
            const list = res?.success ? res.data : myAddresses;
            setMyAddresses(list || []);
            if (!list || list.length === 0) {
              router.push('/profile/addresses');
            } else {
              setShowAddrModal(true);
            }
          }}>
            <View style={[styles.radio, deliveryOption === 'delivery' && styles.radioSelected]}>
              {deliveryOption === 'delivery' && <View style={styles.radioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryLabel}>Giao xe đến địa chỉ của tôi</Text>
              <Text style={styles.deliverySub}>
                {deliveryOption === 'delivery' && selectedAddress
                  ? `${deliveryDistKm}km × 5.000đ = ${formatPrice(deliveryFee)}`
                  : '5.000đ/km • Chọn địa chỉ giao'}
              </Text>
            </View>
            {deliveryOption === 'delivery' && selectedAddress && (
              <Text style={styles.deliveryFeeText}>+{formatPrice(deliveryFee)}</Text>
            )}
          </TouchableOpacity>
          {deliveryOption === 'delivery' && (
            <TouchableOpacity style={styles.addrPickerBtn} onPress={async () => {
              const res = await addressService.getMyAddresses().catch(() => null);
              const list = res?.success ? res.data : myAddresses;
              setMyAddresses(list || []);
              if (!list || list.length === 0) router.push('/profile/addresses');
              else setShowAddrModal(true);
            }}>
              <Ionicons name="location-outline" size={16} color={COLORS.primary} />
              <Text style={styles.addrPickerText} numberOfLines={1}>
                {selectedAddress
                  ? [selectedAddress.detail, selectedAddress.ward, selectedAddress.district].filter(Boolean).join(', ')
                  : 'Chọn địa chỉ giao xe...'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Modal chọn địa chỉ */}
        <Modal visible={showAddrModal} animationType="slide" onRequestClose={() => setShowAddrModal(false)}>
          <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View style={styles.addrModalHeader}>
              <TouchableOpacity onPress={() => setShowAddrModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.addrModalTitle}>Chọn địa chỉ giao xe</Text>
              <View style={{ width: 24 }} />
            </View>
            {myAddresses.length === 0 ? (
              <View style={styles.addrEmpty}>
                <Ionicons name="location-outline" size={48} color={COLORS.textTertiary} />
                <Text style={styles.addrEmptyText}>Chưa có địa chỉ nào</Text>
                <TouchableOpacity onPress={() => { setShowAddrModal(false); router.push('/profile/addresses'); }}
                  style={styles.addrAddBtn}>
                  <Text style={styles.addrAddBtnText}>Thêm địa chỉ ngay</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myAddresses.map(addr => (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.addrRow, selectedAddress?.id === addr.id && styles.addrRowActive]}
                  onPress={() => { setSelectedAddress(addr); setShowAddrModal(false); }}
                >
                  <Ionicons name="location" size={20} color={selectedAddress?.id === addr.id ? COLORS.primary : COLORS.textSecondary} />
                  <View style={{ flex: 1 }}>
                    {addr.label && <Text style={styles.addrLabel}>{addr.label}</Text>}
                    <Text style={styles.addrDetail}>
                      {[addr.detail, addr.ward, addr.district, addr.province].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                  {addr.isDefault && (
                    <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Mặc định</Text></View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </Modal>

        {/* 4. Chủ xe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chủ xe</Text>
          <View style={styles.ownerCard}>
            <View style={styles.ownerAvatar}>
              <Ionicons name="person" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerName}>{ownerName}</Text>
              <View style={styles.vehicleMeta}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.metaText}>5.0</Text>
                <Text style={styles.metaDot}>•</Text>
                <Ionicons name="briefcase-outline" size={13} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>100+ chuyến</Text>
              </View>
            </View>
            <View style={styles.crownBadge}>
              <Ionicons name="trophy" size={14} color="#F59E0B" />
            </View>
          </View>
          <Text style={styles.ownerNote}>Nhằm bảo mật thông tin cá nhân, Mioto sẽ gửi chi tiết liên hệ sau khi đặt xe thành công.</Text>
        </View>

        {/* 5. Lời nhắn */}
        <View style={styles.section}>
          <TextInput
            style={styles.noteInput}
            placeholder="Nhập nội dung lời nhắn cho chủ xe"
            placeholderTextColor={COLORS.textTertiary}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* 6. Mioto protection note */}
        <View style={styles.protectNote}>
          <Ionicons name="shield-checkmark-outline" size={28} color={COLORS.primary} />
          <Text style={styles.protectText}>Giao dịch qua Mioto để chúng tôi bảo vệ bạn tốt nhất trong trường hợp bị hủy chuyến ngoài ý muốn & phát sinh sự cố bảo hiểm.</Text>
        </View>

        {/* 7. Bảng tính giá */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bảng tính giá</Text>
          <View style={styles.priceCard}>
            <PriceRow label="Đơn giá thuê" hint onHint={() => setInfoModal('donGia')}   value={`${formatPrice(price)}/ngày`} />
            <PriceRow label="Bảo hiểm thuê xe" hint onHint={() => setInfoModal('baoHiem')} value={`${formatPrice(insurancePerDay)}/ngày`} />
            <View style={styles.priceDivider} />
            <PriceRow label="Tổng cộng" value={`${formatPrice(totalPerDay)} x ${rentalDays} ngày`} />

            {/* Khuyến mãi */}
            <Text style={styles.promoTitle}>Khuyến mãi</Text>
            {/* Option 1: Promo 100K */}
            <TouchableOpacity style={styles.promoOption} onPress={() => { setUsePromo(true); setUsePoints(false); setVoucherData(null); setShowVoucherInput(false); }}>
              <View style={[styles.radio, (usePromo && !usePoints) && styles.radioSelected]}>
                {(usePromo && !usePoints) && <View style={styles.radioInner} />}
              </View>
              <View style={styles.promoIcon}>
                <Ionicons name="pricetag" size={16} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.promoLabel}>Chương trình giảm giá</Text>
                <Text style={styles.promoSub}>Giảm 100K trên đơn giá</Text>
              </View>
              {(usePromo && !usePoints) && <Text style={styles.promoAmount}>-100.000đ</Text>}
            </TouchableOpacity>
            {/* Option 2: Dùng điểm thưởng */}
            {pointsBalance > 0 && (
              <TouchableOpacity style={styles.promoOption} onPress={() => { setUsePoints(true); setUsePromo(false); setVoucherData(null); setShowVoucherInput(false); }}>
                <View style={[styles.radio, usePoints && styles.radioSelected]}>
                  {usePoints && <View style={styles.radioInner} />}
                </View>
                <View style={[styles.promoIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoLabel}>Dùng điểm thưởng</Text>
                  <Text style={styles.promoSub}>Bạn có {pointsBalance} điểm · dùng {usablePoints} điểm</Text>
                </View>
                {usePoints && <Text style={styles.promoAmount}>-{(usablePoints * 1000).toLocaleString('vi-VN')}đ</Text>}
              </TouchableOpacity>
            )}
            {/* Option 3: Mã voucher */}
            <TouchableOpacity style={styles.promoOption} onPress={() => {
              setUsePromo(false); setUsePoints(false); setShowVoucherInput(true);
            }}>
              <View style={[styles.radio, (!usePromo && !usePoints) && styles.radioSelected]}>
                {(!usePromo && !usePoints) && <View style={styles.radioInner} />}
              </View>
              <View style={styles.promoIcon}>
                <Ionicons name="ticket-outline" size={16} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.promoLabel}>Mã voucher</Text>
                {voucherData && (
                  <Text style={styles.promoSub}>Mã: {voucherData.code}</Text>
                )}
              </View>
              {voucherData
                ? <Text style={styles.promoAmount}>-{formatPrice(voucherData.discountAmount)}</Text>
                : <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />}
            </TouchableOpacity>
            {showVoucherInput && (
              <View style={styles.voucherInputRow}>
                <TextInput
                  style={styles.voucherInput}
                  placeholder="Nhập mã voucher..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={voucherCode}
                  onChangeText={setVoucherCode}
                  autoCapitalize="characters"
                />
                {voucherLoading
                  ? <ActivityIndicator color={COLORS.primary} style={{ marginHorizontal: SPACING.sm }} />
                  : <TouchableOpacity style={styles.voucherApplyBtn} onPress={applyVoucher}>
                      <Text style={styles.voucherApplyText}>Áp dụng</Text>
                    </TouchableOpacity>}
              </View>
            )}

            {deliveryOption === 'delivery' && selectedAddress && (
              <PriceRow label={`Phí giao xe (${deliveryDistKm}km)`} value={`+${formatPrice(deliveryFee)}`} />
            )}
            <View style={styles.priceDivider} />
            <PriceRow label="Thành tiền" valueBold value={formatPrice(thanhTien)} />
            <PriceRow label="Thanh toán giữ chỗ" hint onHint={() => setInfoModal('giuCho')} valueGreen value={formatPrice(giuCho)} />
            <PriceRow label="Thanh toán khi nhận xe" value={formatPrice(khinhanXe)} />
          </View>
        </View>

        {/* 8. Thẻ thanh toán */}
        {loadingCards ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.md }} />
        ) : cards.length === 0 ? (
          <View style={styles.noCard}>
            <Text style={styles.noCardText}>Chưa có thẻ thanh toán</Text>
            <TouchableOpacity onPress={() => router.push('/card')}>
              <Text style={styles.noCardLink}>Thêm thẻ ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thẻ thanh toán</Text>
            {cards.map(card => (
              <TouchableOpacity
                key={card.id}
                style={[styles.cardRow, selectedCardId === card.id && styles.cardRowSelected]}
                onPress={() => setSelectedCardId(card.id)}
              >
                <View style={[styles.radio, selectedCardId === card.id && styles.radioSelected]}>
                  {selectedCardId === card.id && <View style={styles.radioInner} />}
                </View>
                <Ionicons name="card-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.cardLabel}>{card.brand?.toUpperCase()} •••• {card.last4}</Text>
                {card.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Mặc định</Text></View>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 9. Giấy tờ thuê xe */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.accordionHeader} onPress={() => setShowGiayTo(v => !v)}>
            <Text style={styles.sectionTitle}>Giấy tờ thuê xe</Text>
            <TouchableOpacity onPress={() => setInfoModal('giayTo')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="help-circle-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Ionicons name={showGiayTo ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          {showGiayTo && (
            <View style={styles.accordionBody}>
              <Text style={styles.accordionContent}>{GIAYTO_CONTENT}</Text>
            </View>
          )}
        </View>

        {/* 10. Đồng ý */}
        <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(v => !v)}>
          <Ionicons
            name={agreed ? 'checkbox' : 'square-outline'}
            size={22}
            color={agreed ? COLORS.primary : COLORS.textTertiary}
          />
          <Text style={styles.agreeText}>
            Tôi đồng ý với{' '}
            <Text style={styles.agreeLink}>Chính sách hủy chuyến của Mioto.</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Bottom: Gửi yêu cầu */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Gửi yêu cầu thuê xe</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal bản đồ vị trí xe */}
      <MapPickerModal
        visible={vehicleMapModal}
        onClose={() => setVehicleMapModal(false)}
        onConfirm={() => setVehicleMapModal(false)}
        initialLat={vehicleLat}
        initialLon={vehicleLon}
        title="Vị trí xe"
        readOnly
        markerLabel={vehicleName}
      />

      {/* Modal giải thích "?" */}
      <Modal visible={!!infoModal} transparent animationType="fade" onRequestClose={() => setInfoModal('')}>
        <TouchableOpacity style={styles.infoOverlay} activeOpacity={1} onPress={() => setInfoModal('')}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{INFO_TITLES[infoModal]}</Text>
            <Text style={styles.infoContent}>{INFO_CONTENT[infoModal]}</Text>
            <TouchableOpacity style={styles.infoClose} onPress={() => setInfoModal('')}>
              <Text style={styles.infoCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function PriceRow({ label, hint, onHint, value, valueBold, valueGreen }) {
  return (
    <View style={styles.priceRow}>
      <View style={styles.priceRowLeft}>
        <Text style={styles.priceLabelText}>{label}</Text>
        {hint && (
          <TouchableOpacity onPress={onHint} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="help-circle-outline" size={15} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[
        styles.priceValueText,
        valueBold && { fontWeight: '700', color: COLORS.text },
        valueGreen && { color: COLORS.primary },
      ]}>{value}</Text>
    </View>
  );
}

const INFO_TITLES = {
  donGia:  'Đơn giá thuê',
  baoHiem: 'Bảo hiểm thuê xe',
  giuCho:  'Thanh toán giữ chỗ',
  giayTo:  'Giấy tờ thuê xe',
};
const INFO_CONTENT = {
  donGia: 'Giá thuê tính tròn theo ngày. Thuê dưới 24h tính tròn 1 ngày. Chưa bao gồm tiền xăng/sạc pin. Đã bao gồm phí dịch vụ Mioto.',
  baoHiem: 'Chuyến đi có mua bảo hiểm. Khách thuê chỉ bồi thường tối đa 2.000.000đ khi có sự cố. Nhà bảo hiểm chi trả phần còn lại (tối đa 298 triệu).',
  giuCho: '40% tổng giá trị chuyến đi được thanh toán trước qua Mioto để giữ chỗ. Số tiền còn lại thanh toán trực tiếp cho chủ xe khi nhận xe.',
  giayTo: GIAYTO_CONTENT,
};

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.surface },
  scroll: { padding: SPACING.lg, paddingBottom: 100 },

  // Xe
  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md,
  },
  vehicleThumb: { width: 90, height: 65, borderRadius: RADIUS.sm },
  thumbPlaceholder: { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  vehicleName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  vehiclePlate: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  vehicleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  metaDot: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },

  // Xung dot ngay
  conflictBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#FCD34D',
    padding: SPACING.md, marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  conflictText: { flex: 1, fontSize: FONT_SIZE.sm, color: '#92400E', lineHeight: 20 },
  bookedSection: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  bookedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xs },
  bookedTitle: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textSecondary },
  bookedRange: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, paddingVertical: 2 },

  // Bảo hiểm banner
  insuranceBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.primary + '40',
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  insuranceBannerTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  insuranceBannerSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },

  // Section
  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },

  // Thời gian
  timeRow: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  timeCol: { flex: 1, padding: SPACING.md },
  timeDivider: { width: 1, backgroundColor: COLORS.border },
  timeHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  timeLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  timeValue: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  timeNote: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.sm, paddingHorizontal: 2 },
  addressLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  addressValue: { fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: '500', marginTop: 2 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: SPACING.xs, paddingLeft: 22 },
  mapLinkText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },

  // Chủ xe
  ownerCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  ownerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  ownerName: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  crownBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center',
  },
  ownerNote: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: SPACING.sm, lineHeight: 18 },

  // Lời nhắn
  noteInput: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, minHeight: 100, fontSize: FONT_SIZE.sm, color: COLORS.text,
  },

  // Protect note
  protectNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.background, padding: SPACING.md,
    borderRadius: RADIUS.md, marginBottom: SPACING.md,
  },
  protectText: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 },

  // Bảng tính giá
  priceCard: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  priceDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.xs },
  priceRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceLabelText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  priceValueText: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  promoTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  promoOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  promoIcon: { width: 28, height: 28, borderRadius: RADIUS.sm, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  promoLabel: { fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: '500' },
  promoSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 1 },
  promoAmount: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  radioSelected: { borderColor: COLORS.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },

  // Card
  noCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.md },
  noCardText: { color: COLORS.textSecondary, marginBottom: SPACING.sm },
  noCardLink: { color: COLORS.primary, fontWeight: '600' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, marginBottom: SPACING.sm },
  cardRowSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight + '30' },
  cardLabel: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text },
  defaultBadge: { backgroundColor: '#E6F7F1', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  defaultBadgeText: { fontSize: FONT_SIZE.xs, color: COLORS.success, fontWeight: '600' },

  // Giấy tờ accordion
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  accordionBody: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm },
  accordionContent: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 22 },

  // Đồng ý
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.lg },
  agreeText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  agreeLink: { color: COLORS.primary, fontWeight: '600' },

  // Delivery
  deliveryOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  deliveryLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  deliverySub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  deliveryFreeText: { fontSize: FONT_SIZE.xs, color: '#10B981', fontWeight: '600' },
  deliveryFeeText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary },
  addrPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginTop: SPACING.sm, padding: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
  },
  addrPickerText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
  addrModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  addrModalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  addrEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  addrEmptyText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  addrAddBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm },
  addrAddBtnText: { color: '#FFF', fontWeight: '700' },
  addrRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  addrRowActive: { backgroundColor: COLORS.primaryLight + '30' },
  addrLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  addrDetail: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  // Voucher
  voucherInputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs },
  voucherInput: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.sm, color: COLORS.text,
  },
  voucherApplyBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  voucherApplyText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.sm },

  // Bottom
  bottomBar: { padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: FONT_SIZE.lg, fontWeight: '700' },

  // Info modal
  infoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  infoBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '100%' },
  infoTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  infoContent: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 22 },
  infoClose: { marginTop: SPACING.lg, alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.sm },
  infoCloseText: { color: '#FFF', fontWeight: '600' },
});
