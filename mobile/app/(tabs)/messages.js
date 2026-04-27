import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../../services/notification.service';
import { conversationService } from '../../services/conversation.service';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showError } from '../../utils/toast';

// ─── Thông báo ───────────────────────────────────────────────
const TYPE_ICON = {
  booking_confirmed: { name: 'checkmark-circle', color: '#10B981' },
  booking_cancelled: { name: 'close-circle',      color: '#EF4444' },
  vehicle_approved:  { name: 'car-sport',          color: '#10B981' },
  vehicle_rejected:  { name: 'car-sport',          color: '#EF4444' },
  kyc_approved:      { name: 'shield-checkmark',   color: '#10B981' },
  kyc_rejected:      { name: 'shield',             color: '#EF4444' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

function NotificationsTab() {
  const [list, setList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationService.getMyNotifications();
      if (result.success) {
        setList(result.data.list);
        setUnreadCount(result.data.unreadCount);
      }
    } catch { showError('Không tải được thông báo'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleMarkAll() {
    try {
      await notificationService.markAllRead();
      setList(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }

  async function handleTap(item) {
    if (item.isRead) return;
    try {
      await notificationService.markRead(item.id);
      setList(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }

  if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />;

  return (
    <FlatList
      data={list}
      keyExtractor={item => item.id}
      contentContainerStyle={list.length === 0 && styles.emptyContainer}
      ListHeaderComponent={unreadCount > 0 ? (
        <TouchableOpacity style={styles.markAllBar} onPress={handleMarkAll}>
          <Text style={styles.markAllText}>{unreadCount} chưa đọc — Đánh dấu tất cả đã đọc</Text>
        </TouchableOpacity>
      ) : null}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={64} color={COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
          <Text style={styles.emptySub}>Thông báo về chuyến đi sẽ xuất hiện tại đây</Text>
        </View>
      }
      renderItem={({ item }) => {
        const iconInfo = TYPE_ICON[item.type] || { name: 'notifications-outline', color: COLORS.primary };
        return (
          <TouchableOpacity
            style={[styles.notifItem, !item.isRead && styles.notifUnread]}
            onPress={() => handleTap(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.notifIcon, { backgroundColor: iconInfo.color + '20' }]}>
              <Ionicons name={iconInfo.name} size={24} color={iconInfo.color} />
            </View>
            <View style={styles.notifContent}>
              <Text style={[styles.notifTitle, !item.isRead && styles.bold]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
              <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      }}
    />
  );
}

// ─── Tin nhắn ────────────────────────────────────────────────
function MessagesTab() {
  const { user } = useAuth();
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await conversationService.getMyConversations();
      if (res.success) setConvs(res.data);
    } catch { showError('Không tải được tin nhắn'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />;

  return (
    <FlatList
      data={convs}
      keyExtractor={item => item.id}
      contentContainerStyle={convs.length === 0 && styles.emptyContainer}
      ListHeaderComponent={
        /* Mia chatbot — luôn hiện đầu danh sách */
        <TouchableOpacity style={styles.miaCard} onPress={() => router.push('/chat/mia')}>
          <View style={styles.miaAvatar}>
            <Text style={styles.miaAvatarText}>M</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.miaName}>Mia — Trợ lý ảo</Text>
            <Text style={styles.miaSub}>Giải đáp mọi thắc mắc về thuê xe 24/7</Text>
          </View>
          <View style={styles.miaOnline} />
        </TouchableOpacity>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>Chưa có tin nhắn</Text>
          <Text style={styles.emptySub}>Nhắn tin với chủ xe từ màn hình chi tiết xe</Text>
        </View>
      }
      renderItem={({ item }) => {
        const isRenter = item.renterId === user?.id;
        const other = isRenter ? item.host : item.renter;
        const otherName = other?.fullName || 'Người dùng';
        return (
          <TouchableOpacity
            style={styles.convItem}
            onPress={() => router.push({
              pathname: `/chat/${item.id}`,
              params: { otherName },
            })}
            activeOpacity={0.7}
          >
            <View style={styles.convAvatar}>
              <Ionicons name="person" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.convTopRow}>
                <Text style={styles.convName} numberOfLines={1}>{otherName}</Text>
                {item.lastAt && (
                  <Text style={styles.convTime}>{timeAgo(item.lastAt)}</Text>
                )}
              </View>
              <Text style={styles.convLast} numberOfLines={1}>
                {item.lastMessage || (item.vehicle ? `${item.vehicle.brand} ${item.vehicle.model}` : 'Bắt đầu cuộc trò chuyện')}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

// ─── Root screen ─────────────────────────────────────────────
export default function MessagesScreen() {
  const [tab, setTab] = useState('messages'); // 'messages' | 'notifications'

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hộp thư</Text>
      </View>

      {/* Segment tabs */}
      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[styles.segBtn, tab === 'messages' && styles.segBtnActive]}
          onPress={() => setTab('messages')}
        >
          <Ionicons
            name="chatbubble-outline" size={16}
            color={tab === 'messages' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.segText, tab === 'messages' && styles.segTextActive]}>Tin nhắn</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, tab === 'notifications' && styles.segBtnActive]}
          onPress={() => setTab('notifications')}
        >
          <Ionicons
            name="notifications-outline" size={16}
            color={tab === 'notifications' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.segText, tab === 'notifications' && styles.segTextActive]}>Thông báo</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {tab === 'messages' ? <MessagesTab /> : <NotificationsTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },

  // Segment
  segmentWrap: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg, marginVertical: SPACING.sm,
    borderRadius: RADIUS.md, padding: 4,
  },
  segBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: RADIUS.sm,
  },
  segBtnActive: { backgroundColor: COLORS.background, elevation: 1, shadowOpacity: 0.05 },
  segText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600' },
  segTextActive: { color: COLORS.primary },

  // Mia card
  miaCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.primary + '08',
  },
  miaAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  miaAvatarText: { color: '#FFF', fontWeight: '800', fontSize: 20 },
  miaName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  miaSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  miaOnline: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981',
    borderWidth: 2, borderColor: COLORS.background,
  },

  // Conversation
  convItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  convAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  convTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  convName: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, flex: 1 },
  convTime: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  convLast: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Notification
  markAllBar: {
    backgroundColor: COLORS.primaryLight + '30', padding: SPACING.sm,
    paddingHorizontal: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  markAllText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '600' },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  notifUnread: { backgroundColor: COLORS.primary + '08' },
  notifIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: FONT_SIZE.sm, color: COLORS.text, marginBottom: 2 },
  bold: { fontWeight: '700' },
  notifBody: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  notifTime: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 4 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary, marginTop: 6,
  },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.xl, marginTop: 40 },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.text },
  emptySub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center' },
});
