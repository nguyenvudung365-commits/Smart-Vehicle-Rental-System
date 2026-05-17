import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { pointsService } from '../../services/points.service';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function PointsScreen() {
  const [data, setData] = useState({ balance: 0, history: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pointsService.getHistory()
      .then(res => setData(res.data?.data || { balance: 0, history: [] }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#13B981" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Điểm thưởng hiện tại</Text>
        <Text style={styles.balance}>{data.balance} điểm</Text>
        <Text style={styles.hint}>= {(data.balance * 1000).toLocaleString('vi-VN')}đ</Text>
      </View>
      <Text style={styles.histTitle}>Lịch sử điểm</Text>
      <FlatList
        data={data.history}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.desc}>{item.description}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
            </View>
            <Text style={[styles.pts, { color: item.points > 0 ? '#13B981' : '#EF4444' }]}>
              {item.points > 0 ? '+' : ''}{item.points}đ
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có giao dịch điểm nào</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  balanceCard: { backgroundColor: '#13B981', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  balance: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 4 },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  histTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8 },
  desc: { fontSize: 14, fontWeight: '500' },
  date: { color: '#888', fontSize: 12, marginTop: 2 },
  pts: { fontSize: 16, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
