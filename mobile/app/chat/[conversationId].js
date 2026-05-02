import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { conversationService } from '../../services/conversation.service';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showError } from '../../utils/toast';

const POLL_INTERVAL = 5000;

function timeStr(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function dateSep(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hôm nay';
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function groupByDate(messages) {
  const result = [];
  let lastDate = null;
  messages.forEach(msg => {
    const d = new Date(msg.createdAt).toDateString();
    if (d !== lastDate) {
      result.push({ type: 'separator', id: 'sep-' + d, label: dateSep(msg.createdAt) });
      lastDate = d;
    }
    result.push({ ...msg, type: 'message' });
  });
  return result;
}

export default function ConversationScreen() {
  const { conversationId, otherName } = useLocalSearchParams();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef(null);
  const lastMsgId = useRef(null);
  const pollRef = useRef(null);

  const loadMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await conversationService.getMessages(conversationId);
      if (result.success) {
        const msgs = result.data;
        setMessages(msgs);
        if (msgs.length && msgs[msgs.length - 1].id !== lastMsgId.current) {
          lastMsgId.current = msgs[msgs.length - 1]?.id;
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: !loading }), 100);
        }
      }
    } catch {
      if (!silent) showError('Không tải được tin nhắn');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(() => loadMessages(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    // Optimistic update
    const optimistic = {
      id: 'opt-' + Date.now(),
      conversationId,
      senderId: user.id,
      text,
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: { id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl },
      type: 'message',
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      await conversationService.sendMessage(conversationId, text);
      await loadMessages(true);
    } catch {
      showError('Không gửi được tin nhắn');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  const items = groupByDate(messages);

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
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>{otherName || 'Cuộc trò chuyện'}</Text>
          <Text style={styles.headerSub}>Nhắn tin trực tiếp</Text>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ flex: 1, marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          ref={flatRef}
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.msgList}
          renderItem={({ item }) => {
            if (item.type === 'separator') {
              return (
                <View style={styles.dateSep}>
                  <View style={styles.dateLine} />
                  <Text style={styles.dateText}>{item.label}</Text>
                  <View style={styles.dateLine} />
                </View>
              );
            }
            const isMe = item.senderId === user?.id;
            return (
              <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                {!isMe && (
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={16} color={COLORS.primary} />
                  </View>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  {!isMe && (
                    <Text style={styles.senderName}>{item.sender?.fullName}</Text>
                  )}
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
                  <View style={styles.msgMeta}>
                    <Text style={[styles.msgTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
                      {timeStr(item.createdAt)}
                    </Text>
                    {isMe && (
                      <Ionicons
                        name={item.isRead ? 'checkmark-done' : 'checkmark'}
                        size={12}
                        color="rgba(255,255,255,0.7)"
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>Hãy gửi tin nhắn đầu tiên!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={COLORS.textTertiary}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFF" />
          )}
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
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  headerName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  msgList: { padding: SPACING.md, gap: SPACING.xs, paddingBottom: SPACING.lg },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.xs, marginBottom: SPACING.xs },
  msgRowMe: { flexDirection: 'row-reverse' },
  bubble: { maxWidth: '75%', borderRadius: RADIUS.lg, padding: SPACING.sm, paddingHorizontal: SPACING.md },
  bubbleOther: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  senderName: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  bubbleText: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 20 },
  bubbleTextMe: { color: '#FFF' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 },
  msgTime: { fontSize: 10, color: COLORS.textTertiary },

  dateSep: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginVertical: SPACING.md },
  dateLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dateText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, paddingHorizontal: SPACING.xs },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },

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
