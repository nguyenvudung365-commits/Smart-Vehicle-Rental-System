// Lịch đặt xe dạng calendar theo tháng — host xem toàn bộ xe
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { hostService } from '../../services/host.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';


const STATUS_COLOR = {
  pending_payment: '#F59E0B',
  confirmed:       '#3B82F6',
  host_handover:   '#8B5CF6',
  in_progress:     '#10B981',
  renter_return:   '#6366F1',
  completed:       '#6B7280',
  cancelled:       '#EF4444',
};
const STATUS_LABEL = {
  pending_payment: 'Chờ xác nhận',
  confirmed:       'Đã xác nhận',
  host_handover:   'Đã bàn giao',
  in_progress:     'Đang thuê',
  renter_return:   'Khách đã trả',
  completed:       'Hoàn thành',
  cancelled:       'Đã hủy',
};

const MONTHS_VI = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];
const DAYS_VI = ['CN','T2','T3','T4','T5','T6','T7'];

function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) { return `${pad(new Date(d).getDate())}/${pad(new Date(d).getMonth()+1)}`; }

export default function HostCalendarScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null); // day number selected
  const [selectedBookings, setSelectedBookings] = useState([]);

  useFocusEffect(useCallback(() => { load(); }, [year, month]));

  async function load() {
    setLoading(true);
    setSelectedDay(null);
    setSelectedBookings([]);
    try {
      const res = await hostService.getCalendar(year, month);
      if (res.success) setBookings(res.data);
    } catch {}
    finally { setLoading(false); }
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  // Tập hợp các ngày trong tháng có booking
  const bookedDaysMap = {}; // { day: [booking, ...] }
  bookings.forEach(b => {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    let cur = new Date(Math.max(start.getTime(), firstDay.getTime()));
    const fin = new Date(Math.min(end.getTime(), lastDay.getTime()));
    while (cur <= fin) {
      const d = cur.getDate();
      if (!bookedDaysMap[d]) bookedDaysMap[d] = [];
      bookedDaysMap[d].push(b);
      cur.setDate(cur.getDate() + 1);
    }
  });

  function onSelectDay(day) {
    setSelectedDay(day);
    setSelectedBookings(bookedDaysMap[day] || []);
  }

  // Build calendar grid
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=CN
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch xe</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        {/* Điều hướng tháng */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS_VI[month - 1]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Tiêu đề ngày trong tuần */}
        <View style={styles.weekRow}>
          {DAYS_VI.map(d => (
            <Text key={d} style={styles.weekLabel}>{d}</Text>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`empty-${i}`} style={styles.cell} />;
              const hasBooking = !!bookedDaysMap[day];
              const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
              const isSelected = day === selectedDay;
              const colors = hasBooking
                ? [...new Set(bookedDaysMap[day].map(b => STATUS_COLOR[b.status] || '#6B7280'))]
                : [];
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                    isToday && styles.cellToday,
                  ]}
                  onPress={() => onSelectDay(day)}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected, isToday && styles.dayTextToday]}>
                    {day}
                  </Text>
                  {colors.length > 0 && (
                    <View style={styles.dotsRow}>
                      {colors.slice(0, 3).map((c, idx) => (
                        <View key={idx} style={[styles.dot, { backgroundColor: c }]} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          {Object.entries(STATUS_COLOR).slice(0, 4).map(([k, c]) => (
            <View key={k} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c }]} />
              <Text style={styles.legendText}>{STATUS_LABEL[k]}</Text>
            </View>
          ))}
        </View>

        {/* Danh sách booking của ngày được chọn */}
        {selectedDay !== null && (
          <View style={styles.dayDetail}>
            <Text style={styles.dayDetailTitle}>
              Ngày {pad(selectedDay)}/{pad(month)}/{year}
              {selectedBookings.length === 0 ? ' — Không có lịch' : ` — ${selectedBookings.length} đơn`}
            </Text>
            {selectedBookings.map(b => (
              <TouchableOpacity
                key={b.id}
                style={styles.bookingCard}
                onPress={() => router.push({ pathname: '/host/booking-detail', params: { id: b.id } })}
              >
                <View style={[styles.statusBar, { backgroundColor: STATUS_COLOR[b.status] || '#6B7280' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingVehicle}>
                    {b.vehicle?.brand} {b.vehicle?.model} · {b.vehicle?.licensePlate}
                  </Text>
                  <Text style={styles.bookingRenter}>{b.renter?.fullName} · {b.renter?.phone}</Text>
                  <Text style={styles.bookingDates}>
                    {fmtDate(b.startDate)} → {fmtDate(b.endDate)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[b.status] + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[b.status] }]}>
                    {STATUS_LABEL[b.status]}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL_SIZE = 46;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xl, paddingVertical: SPACING.md,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  monthLabel: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, minWidth: 100, textAlign: 'center' },

  weekRow: { flexDirection: 'row', paddingHorizontal: SPACING.sm, marginBottom: SPACING.xs },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textSecondary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.sm },
  cell: {
    width: `${100/7}%`, height: CELL_SIZE,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 2,
  },
  cellSelected: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm },
  cellToday: { borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.primary },
  dayText: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  dayTextSelected: { color: '#FFF', fontWeight: '700' },
  dayTextToday: { color: COLORS.primary, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  dayDetail: { margin: SPACING.md },
  dayDetailTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  bookingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', marginBottom: SPACING.sm,
  },
  statusBar: { width: 4, alignSelf: 'stretch' },
  bookingVehicle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, padding: SPACING.sm, paddingBottom: 2 },
  bookingRenter: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, paddingHorizontal: SPACING.sm },
  bookingDates: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, padding: SPACING.sm, paddingTop: 2 },
  statusBadge: { paddingHorizontal: SPACING.sm, margin: SPACING.sm, borderRadius: RADIUS.sm },
  statusBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
});
