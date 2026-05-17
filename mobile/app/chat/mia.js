import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const GEMINI_API_KEY = 'AIzaSyDfdaGc7e1B8c9mjx0o_CIOb26MXAG4TY8';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Bạn là Mia, trợ lý ảo của ứng dụng Mioto Clone — ứng dụng cho thuê xe tự lái tại Việt Nam.
Nhiệm vụ của bạn là hỗ trợ người dùng về:
- Cách đặt xe, hủy đơn, thanh toán
- Xác thực KYC (bằng lái xe / CCCD)
- Điểm thưởng (1 điểm = 10.000đ, dùng giảm tối đa 30% đơn hàng)
- Đăng ký xe cho thuê (dành cho chủ xe)
- Các tính năng GPS, chat với chủ xe, yêu thích xe
- Chính sách và quy định thuê xe

Trả lời ngắn gọn, thân thiện, bằng tiếng Việt. Nếu câu hỏi ngoài phạm vi ứng dụng thì lịch sự từ chối và hướng người dùng về các chủ đề liên quan đến thuê xe.`;

const QUICK_QUESTIONS = [
  'Cách đặt xe?',
  'Xác thực KYC',
  'Điểm thưởng',
  'Hủy đơn thuê',
  'Thanh toán',
  'Đăng ký xe',
];

export default function MiaScreen() {
  const router = useRouter();
  const listRef = useRef(null);
  const [kavKey, setKavKey] = useState(0);
  const [messages, setMessages] = useState([
    { id: '0', from: 'bot', text: 'Xin chào! Mình là Mia 👋 Trợ lý ảo của Mioto Clone. Mình có thể giúp gì cho bạn?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const historyRef = useRef([]);

  useFocusEffect(useCallback(() => {
    setKavKey(k => k + 1);
  }, []));

  const send = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');

    const userMsg = { id: Date.now().toString(), from: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    historyRef.current.push({ role: 'user', parts: [{ text: userText }] });

    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: historyRef.current,
        }),
      });
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
        || 'Xin lỗi, mình chưa hiểu câu đó. Bạn thử hỏi lại nhé!';

      historyRef.current.push({ role: 'model', parts: [{ text: reply }] });
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), from: 'bot', text: reply }]);
    } catch {
      historyRef.current.pop();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        from: 'bot',
        text: 'Xin lỗi, mình đang gặp sự cố kết nối. Bạn vui lòng thử lại sau nhé!',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={{flex:1}}>
      <KeyboardAvoidingView
      key={kavKey}
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View>
            <Text style={styles.headerName}>Mia — Trợ lý ảo</Text>
            <Text style={styles.headerSub}>Powered by Gemini AI</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.msgList}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.from === 'user' ? styles.userBubble : styles.botBubble]}>
            <Text style={[styles.bubbleText, item.from === 'user' && styles.userText]}>
              {item.text}
            </Text>
          </View>
        )}
        ListFooterComponent={loading ? (
          <View style={styles.typingRow}>
            <View style={styles.botBubble}>
              <ActivityIndicator size="small" color="#13B981" />
            </View>
          </View>
        ) : null}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Quick questions */}
      <View style={styles.quickWrap}>
        <FlatList
          horizontal
          data={QUICK_QUESTIONS}
          keyExtractor={q => q}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.quickBtn} onPress={() => send(item)}>
              <Text style={styles.quickText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Nhập câu hỏi cho Mia..."
          returnKeyType="send"
          onSubmitEditing={() => send()}
          editable={!loading}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={() => send()} disabled={loading}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
  },
  backBtn: { padding: 4 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#13B981', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  headerName: { fontSize: 15, fontWeight: '700', color: '#111' },
  headerSub: { fontSize: 12, color: '#13B981' },
  msgList: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#13B981' },
  bubbleText: { fontSize: 14, color: '#111', lineHeight: 20 },
  userText: { color: '#fff' },
  typingRow: { paddingHorizontal: 16, paddingBottom: 8 },
  quickWrap: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  quickRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  quickBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#f0fdf4', borderRadius: 20,
    borderWidth: 1, borderColor: '#13B981',
  },
  quickText: { fontSize: 12, color: '#13B981', fontWeight: '500' },
  inputRow: {
    flexDirection: 'row', gap: 8, padding: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 8, fontSize: 14,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#13B981', justifyContent: 'center', alignItems: 'center',
  },
});
