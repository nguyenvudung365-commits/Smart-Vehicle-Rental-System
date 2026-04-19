import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
          options={{
            headerShown: true,
            title: 'Chi tiết xe',
            headerBackTitle: 'Quay lại',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
