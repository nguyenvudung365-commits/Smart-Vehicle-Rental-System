import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function ReferralScreen() {
  const { user } = useAuth();
  const code = user?.id?.slice(0, 8).toUpperCase() || 'MIOTO2026';

  const share = async () => {
    await Share.share({ message: `Dùng mã giới thiệu ${code} để nhận 50.000đ khi đăng ký Mioto Clone!` });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Giới thiệu bạn bè</Text>
      <Text style={styles.desc}>Chia sẻ mã giới thiệu của bạn. Mỗi người đăng ký thành công, bạn nhận 50 điểm thưởng.</Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>Mã của bạn</Text>
        <Text style={styles.code}>{code}</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={share}>
        <Text style={styles.btnText}>Chia sẻ ngay</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  desc: { color: '#555', lineHeight: 22, marginBottom: 32 },
  codeBox: { alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 16, padding: 24, marginBottom: 24 },
  codeLabel: { color: '#555', marginBottom: 8 },
  code: { fontSize: 32, fontWeight: '800', letterSpacing: 4, color: '#13B981' },
  btn: { backgroundColor: '#13B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
