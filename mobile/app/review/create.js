// FR-22: Màn hình đánh giá xe sau khi hoàn thành chuyến
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { reviewService } from '../../services/review.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';

export default function CreateReviewScreen() {
  const { bookingId, vehicleName, vehicleImage } = useLocalSearchParams();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await reviewService.create({ bookingId, rating, comment: comment.trim() || undefined });
      showSuccess('Gửi đánh giá thành công!');
      router.replace('/(tabs)/trips');
    } catch (err) {
      showError(err.response?.data?.message || 'Gửi đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá chuyến đi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Thông tin xe */}
        <View style={styles.vehicleCard}>
          {vehicleImage ? (
            <Image source={vehicleImage} style={styles.vehicleImg} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.vehicleImg, styles.imgPlaceholder]}>
              <Ionicons name="car-sport" size={32} color={COLORS.textTertiary} />
            </View>
          )}
          <Text style={styles.vehicleName}>{vehicleName}</Text>
          <Text style={styles.vehicleSub}>Chia sẻ cảm nhận của bạn về chuyến đi</Text>
        </View>

        {/* Chọn sao */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chất lượng xe</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? '#F59E0B' : COLORS.border}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
        </View>

        {/* Nhận xét */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nhận xét (tùy chọn)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Chia sẻ trải nghiệm của bạn về xe, chủ xe, dịch vụ..."
            placeholderTextColor={COLORS.textTertiary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>
      </ScrollView>

      {/* Nút gửi */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>Gửi đánh giá</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const RATING_LABELS = {
  1: 'Rất tệ',
  2: 'Tệ',
  3: 'Bình thường',
  4: 'Tốt',
  5: 'Tuyệt vời!',
};

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.md,
    backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },

  scroll: { padding: SPACING.lg, paddingBottom: 100 },

  vehicleCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    alignItems: 'center', padding: SPACING.xl, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  vehicleImg: { width: 120, height: 80, borderRadius: RADIUS.md, marginBottom: SPACING.md },
  imgPlaceholder: { backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  vehicleName: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  vehicleSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },

  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },

  stars: { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center', marginBottom: SPACING.sm },
  ratingLabel: { textAlign: 'center', fontSize: FONT_SIZE.md, color: COLORS.primary, fontWeight: '600' },

  commentInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, minHeight: 120,
    fontSize: FONT_SIZE.sm, color: COLORS.text,
  },
  charCount: { alignSelf: 'flex-end', fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 4 },

  bottomBar: {
    padding: SPACING.lg, backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
  },
  submitText: { color: '#FFF', fontSize: FONT_SIZE.lg, fontWeight: '700' },
});
