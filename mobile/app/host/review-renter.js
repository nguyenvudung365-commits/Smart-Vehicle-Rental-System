// Màn hình host đánh giá khách thuê sau khi hoàn thành chuyến
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { hostService } from '../../services/host.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function ReviewRenterScreen() {
  const { bookingId, renterName, renterAvatar } = useLocalSearchParams();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await hostService.reviewRenter(bookingId, rating, comment);
      if (res.success) {
        showSuccess('Đã gửi đánh giá');
        router.back();
      }
    } catch (e) {
      showError(e?.response?.data?.message || 'Gửi đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  const LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];
  const QUICK_COMMENTS = [
    'Khách lịch sự, trả xe đúng giờ',
    'Xe được giữ gìn cẩn thận',
    'Giao tiếp tốt, đáng tin cậy',
    'Cần cải thiện thái độ',
    'Trả xe muộn, cần nhắc nhở',
  ];

  return (
    <SafeAreaView style={{flex:1}}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đánh giá khách thuê</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Thông tin khách */}
        <View style={styles.renterCard}>
          {renterAvatar ? (
            <Image source={renterAvatar} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={28} color={COLORS.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.renterName}>{renterName || 'Khách thuê'}</Text>
            <Text style={styles.renterSub}>Đánh giá sau khi hoàn thành chuyến</Text>
          </View>
        </View>

        {/* Chọn sao */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mức độ hài lòng</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                <Ionicons
                  name={s <= rating ? 'star' : 'star-outline'}
                  size={44}
                  color={s <= rating ? '#F59E0B' : COLORS.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingLabel}>{LABELS[rating]}</Text>
        </View>

        {/* Nhận xét nhanh */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nhận xét nhanh</Text>
          <View style={styles.quickRow}>
            {QUICK_COMMENTS.map(q => (
              <TouchableOpacity
                key={q}
                style={[styles.quickChip, comment === q && styles.quickChipActive]}
                onPress={() => setComment(c => c === q ? '' : q)}
              >
                <Text style={[styles.quickChipText, comment === q && styles.quickChipTextActive]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nhận xét tự do */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nhận xét (tùy chọn)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Chia sẻ trải nghiệm của bạn với khách thuê này..."
            placeholderTextColor={COLORS.textTertiary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.submitBtnText}>Gửi đánh giá</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },

  renterCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.lg,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  renterName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  renterSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },

  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm },
  ratingLabel: { textAlign: 'center', marginTop: SPACING.sm, fontSize: FONT_SIZE.md, fontWeight: '600', color: '#F59E0B' },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  quickChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  quickChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  quickChipText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  quickChipTextActive: { color: COLORS.primary, fontWeight: '600' },

  commentInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, minHeight: 100, fontSize: FONT_SIZE.sm, color: COLORS.text,
  },

  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm,
  },
  submitBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '700' },
});
