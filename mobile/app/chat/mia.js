import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chatService } from '../../services/chat.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';

const WELCOME = {
  id: 'welcome',
  from: 'mia',
  text: 'Xin chào! Mình là Mia 🌟, trợ lý ảo của Mioto. Mình có thể giúp bạn giải đáp mọi thắc mắc về thuê xe, thanh toán, bảo hiểm và nhiều hơn nữa!\n\nBạn có thể hỏi về:\n• Giá thuê xe\n• Cách đặt xe\n• Chính sách hủy\n• Bảo hiểm thuê xe\n• Điểm thưởng\n\nHãy gõ câu hỏi bên dưới 👇',
  createdAt: new Date().toISOString(),
};

const QUICK_QUESTIONS = [
  'Giá thuê xe bao nhiêu?',
  'Cách đặt xe như thế nào?',
  'Chính sách hủy xe?',
  'Bảo hiểm thuê xe',
];

function timeStr(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function MiaChatScreen() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef(null);

  const send = useCallback(async (text) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { id: Date.now().toString(), from: 'user', text: msg, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await chatService.sendToMia(msg);
      if (result.success) {
        const miaMsg = {
          id: (Date.now() + 1).toString(),
          from: 'mia',
          text: result.data.reply,
          createdAt: result.data.timestamp,
        };
        setMessages(prev => [...prev, miaMsg]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        from: 'mia',
        text: 'Xin lỗi, Mia đang gặp sự cố kết nối. Vui lòng thử lại sau nhé!',
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [loading]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.miaAvatar}>
            <Text style={styles.miaAvatarText}>M</Text>
          </View>
          <View>
            <Text style={styles.headerName}>Mia</Text>
            <Text style={styles.headerSub}>Trợ lý ảo Mioto • Luôn trực tuyến</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.from === 'user' && styles.msgRowUser]}>
            {item.from === 'mia' && (
              <View style={styles.miaAvatarSmall}>
                <Text style={styles.miaAvatarTextSm}>M</Text>
              </View>
            )}
            <View style={[styles.bubble, item.from === 'user' ? styles.bubbleUser : styles.bubbleMia]}>
              <Text style={[styles.bubbleText, item.from === 'user' && styles.bubbleTextUser]}>
                {item.text}
              </Text>
              <Text style={[styles.msgTime, item.from === 'user' && { color: 'rgba(255,255,255,0.7)' }]}>
                {timeStr(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Quick questions */}
      {messages.length <= 2 && (
        <View style={styles.quickWrap}>
          <Text style={styles.quickLabel}>Câu hỏi thường gặp:</Text>
          <View style={styles.quickRow}>
            {QUICK_QUESTIONS.map(q => (
              <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => send(q)}>
                <Text style={styles.quickBtnText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {loading && (
        <View style={styles.typingRow}>
          <View style={styles.miaAvatarSmall}>
            <Text style={styles.miaAvatarTextSm}>M</Text>
          </View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.typingText}>Mia đang trả lời...</Text>
          </View>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Hỏi Mia về thuê xe..."
          placeholderTextColor={COLORS.textTertiary}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => send(input)}
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
          onPress={() => send(input)}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingTop: 50, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  miaAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  miaAvatarText: { color: '#FFF', fontWeight: '700', fontSize: 18 },
  headerName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  msgList: { padding: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.xs, marginBottom: SPACING.xs },
  msgRowUser: { flexDirection: 'row-reverse' },
  miaAvatarSmall: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  miaAvatarTextSm: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  bubble: {
    maxWidth: '78%', borderRadius: RADIUS.lg, padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  bubbleMia: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 20 },
  bubbleTextUser: { color: '#FFF' },
  msgTime: { fontSize: 10, color: COLORS.textTertiary, marginTop: 4, textAlign: 'right' },

  quickWrap: { padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  quickLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  quickBtn: {
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
  },
  quickBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '600' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, marginBottom: SPACING.xs },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.sm, paddingHorizontal: SPACING.md,
  },
  typingText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm,
    padding: SPACING.md, backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  input: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    fontSize: FONT_SIZE.sm, color: COLORS.text, maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
});
