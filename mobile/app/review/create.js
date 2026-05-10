import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { reviewService } from '../../services/review.service';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function CreateReviewScreen() {
  const { bookingId, viewOnly, rating: initRating, comment: initComment } = useLocalSearchParams();
  const router = useRouter();
  const isViewOnly = viewOnly === '1';
  const [rating, setRating] = useState(Number(initRating) || 5);
  const [comment, setComment] = useState(initComment || '');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await reviewService.create({ bookingId, rating, comment: comment || '' });
      Alert.alert('Cảm ơn!', 'Đánh giá của bạn đã được ghi nhận.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch { Alert.alert('Lỗi', 'Không thể gửi đánh giá'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{isViewOnly ? 'Đánh giá của bạn' : 'Đánh giá chuyến đi'}</Text>

      <Text style={styles.label}>Số sao</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity key={s} onPress={() => !isViewOnly && setRating(s)} disabled={isViewOnly}>
            <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={36} color="#F59E0B" />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Nhận xét</Text>
      <TextInput
        style={[styles.input, isViewOnly && { backgroundColor: '#f5f5f5', color: '#555' }]}
        value={comment}
        onChangeText={setComment}
        placeholder="Chia sẻ trải nghiệm của bạn..."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        editable={!isViewOnly}
      />

      {!isViewOnly && (
        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Gửi đánh giá</Text>}
        </TouchableOpacity>
      )}
      {isViewOnly && (
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Đóng</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, color: '#555', marginBottom: 8, fontWeight: '500' },
  stars: { flexDirection: 'row', gap: 4, marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 14, height: 120, marginBottom: 24 },
  btn: { backgroundColor: '#13B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  backBtn: { backgroundColor: '#6B7280', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
