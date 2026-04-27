import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'input_history_';

// Lưu giá trị vào lịch sử, tăng đếm số lần dùng
export async function saveInputHistory(fieldKey, value) {
  if (!value || !value.trim()) return;
  try {
    const raw = await AsyncStorage.getItem(PREFIX + fieldKey);
    const history = raw ? JSON.parse(raw) : {};
    const trimmed = value.trim();
    history[trimmed] = (history[trimmed] || 0) + 1;
    await AsyncStorage.setItem(PREFIX + fieldKey, JSON.stringify(history));
  } catch {}
}

// Lấy top N giá trị dùng nhiều nhất, có thể lọc theo text đang nhập
export async function getTopSuggestions(fieldKey, currentText = '', limit = 5) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + fieldKey);
    if (!raw) return [];
    const history = JSON.parse(raw);
    return Object.entries(history)
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => value)
      .filter(v => !currentText.trim() || v.toLowerCase().includes(currentText.toLowerCase()))
      .slice(0, limit);
  } catch {
    return [];
  }
}
