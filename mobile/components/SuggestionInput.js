import { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saveInputHistory, getTopSuggestions } from '../utils/inputHistory';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants/theme';

/**
 * Props:
 *   fieldKey       — key lưu lịch sử (bắt buộc)
 *   value / onChangeText / onBlur — như TextInput bình thường
 *   style          — style cho TextInput (dùng khi không có containerStyle)
 *   containerStyle — style cho wrapper có border (thay thế inputWrapper bên ngoài)
 *   leftElement    — icon bên trái bên trong containerStyle
 *   ...rest        — props còn lại truyền thẳng vào TextInput
 *
 * Nếu truyền containerStyle: component tự render bordered wrapper + TextInput bên trong.
 * Nếu không: chỉ render TextInput với style, border do style quyết định.
 * Suggestions luôn render bên ngoài bordered wrapper, trong flow → không bị clip touch.
 */
export default function SuggestionInput({
  fieldKey, value, onChangeText, onBlur,
  style, containerStyle, leftElement,
  ...rest
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [visible, setVisible] = useState(false);
  const historyRef = useRef(null); // null = chưa load

  async function ensureLoaded() {
    if (historyRef.current === null) {
      historyRef.current = await getTopSuggestions(fieldKey, '', 20).catch(() => []);
    }
  }

  function filter(text) {
    const list = historyRef.current;
    if (!list?.length) { setVisible(false); return; }
    const lower = (text || '').toLowerCase();
    const filtered = list
      .filter(s => !lower || s.toLowerCase().includes(lower))
      .slice(0, 5);
    setSuggestions(filtered);
    setVisible(filtered.length > 0);
  }

  async function handleFocus() {
    await ensureLoaded();
    filter(value);
  }

  function handleChangeText(v) {
    onChangeText(v);
    if (historyRef.current) filter(v);
  }

  function handleBlur() {
    // Delay 300ms để onPress của gợi ý kịp chạy trước khi ẩn danh sách
    // (Android: onBlur có thể fire trước onPress khi TextInput nằm trong ScrollView)
    setTimeout(() => {
      setVisible(false);
      if (value?.trim()) {
        saveInputHistory(fieldKey, value.trim())
          .then(() => getTopSuggestions(fieldKey, '', 20))
          .then(list => { historyRef.current = list; })
          .catch(() => {});
      }
      onBlur?.();
    }, 300);
  }

  function selectSuggestion(s) {
    onChangeText(s);
    setVisible(false);
    saveInputHistory(fieldKey, s).catch(() => {});
  }

  const input = (
    <TextInput
      value={value}
      onChangeText={handleChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={containerStyle ? [styles.innerInput, style] : style}
      {...rest}
    />
  );

  return (
    <View>
      {containerStyle ? (
        <View style={containerStyle}>
          {leftElement}
          {input}
        </View>
      ) : input}

      {visible && (
        <View style={styles.box}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={s}
              style={[styles.item, i === suggestions.length - 1 && styles.itemLast]}
              onPress={() => selectSuggestion(s)}
            >
              <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.text} numberOfLines={1}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  innerInput: { flex: 1, marginLeft: SPACING.sm },
  box: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface, marginTop: 2,
    elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  itemLast: { borderBottomWidth: 0 },
  text: { fontSize: FONT_SIZE.sm, color: COLORS.text, flex: 1 },
});
