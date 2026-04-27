import Toast from 'react-native-toast-message';

// Helper hien thi toast thay Alert.alert (yeu cau cua thay)
export function showSuccess(message) {
  Toast.show({ type: 'success', text1: message, visibilityTime: 2500 });
}

export function showError(message) {
  Toast.show({ type: 'error', text1: 'Loi', text2: message, visibilityTime: 3000 });
}

export function showInfo(message) {
  Toast.show({ type: 'info', text1: message, visibilityTime: 2500 });
}
