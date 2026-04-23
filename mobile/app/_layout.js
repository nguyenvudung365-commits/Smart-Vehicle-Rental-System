import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="vehicle/[id]"
          options={{ headerShown: true, title: 'Chi tiết xe', headerBackTitle: 'Quay lại' }}
        />
        <Stack.Screen
          name="booking/create"
          options={{ headerShown: true, title: 'Đặt xe', headerBackTitle: 'Quay lại' }}
        />
        <Stack.Screen
          name="kyc/submit"
          options={{ headerShown: true, title: 'Xác thực GPLX', headerBackTitle: 'Quay lại' }}
        />
        <Stack.Screen
          name="card/index"
          options={{ headerShown: true, title: 'Thẻ thanh toán', headerBackTitle: 'Quay lại' }}
        />
        <Stack.Screen
          name="trips/index"
          options={{ headerShown: true, title: 'Chuyến đi của tôi', headerBackTitle: 'Quay lại' }}
        />
        <Stack.Screen
          name="host/vehicles"
          options={{ headerShown: true, title: 'Xe của tôi', headerBackTitle: 'Quay lại' }}
        />
        <Stack.Screen
          name="host/add-vehicle"
          options={{ headerShown: true, title: 'Đăng ký xe', headerBackTitle: 'Quay lại' }}
        />
      </Stack>
      <Toast />
    </AuthProvider>
  );
}
