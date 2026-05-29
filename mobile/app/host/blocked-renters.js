// Màn hình quản lý danh sách khách bị chặn
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { hostService } from '../../services/host.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function BlockedRentersScreen() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setLoading(true);
    try {
      const res = await hostService.getBlockedList();
      if (res.success) setList(res.data);
    } catch { showError('Tải danh sách thất bại'); }
    finally { setLoading(false); }
  }

  function confirmUnblock(item) {
    Alert.alert(
      'Bỏ chặn',
      `Bỏ chặn ${item.renter.fullName}? Họ có thể đặt xe của bạn trở lại.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Bỏ chặn', style: 'destructive', onPress: () => doUnblock(item.renterId) },
      ],
    );
  }

  async function doUnblock(renterId) {
    try {
      await hostService.unblockRenter(renterId);
      showSuccess('Đã bỏ chặn');
      setList(l => l.filter(i => i.renterId !== renterId));
    } catch { showError('Thất bại'); }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Khách bị chặn ({list.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="shield-checkmark-outline" size={60} color={COLORS.textTertiary} />
          <Text style={styles.emptyText}>Chưa chặn khách nào</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: SPACING.md }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.renter.avatarUrl ? (
                <Image source={item.renter.avatarUrl} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={22} color={COLORS.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.renter.fullName}</Text>
                <Text style={styles.phone}>{item.renter.phone}</Text>
                {item.reason && <Text style={styles.reason}>Lý do: {item.reason}</Text>}
              </View>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => confirmUnblock(item)}>
                <Text style={styles.unblockText}>Bỏ chặn</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarPlaceholder: { backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  phone: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  reason: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2, fontStyle: 'italic' },
  unblockBtn: {
    borderWidth: 1, borderColor: COLORS.error, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  unblockText: { fontSize: FONT_SIZE.xs, color: COLORS.error, fontWeight: '600' },
});
