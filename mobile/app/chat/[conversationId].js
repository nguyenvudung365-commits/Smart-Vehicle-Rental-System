import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chatService } from '../../services/chat.service';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function ChatScreen() {
  const { conversationId, otherName } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherIsActive, setOtherIsActive] = useState(true);
  const [kavKey, setKavKey] = useState(0);
  const listRef = useRef(null);

  // Force KAV remount mỗi khi quay lại màn hình — tránh offset sai sau navigate
  useFocusEffect(useCallback(() => {
    setKavKey(k => k + 1);
  }, []));

  const load = async () => {
    try {
      const res = await chatService.getMessages(conversationId);
      const data = res.data?.data;
      if (data && typeof data === 'object' && 'messages' in data) {
        setMessages(data.messages || []);
        setOtherIsActive(data.otherIsActive ?? true);
      } else {
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [conversationId]);

  const send = async () => {
    if (!text.trim() || !otherIsActive) return;
    const content = text.trim();
    setText('');
    try {
      const res = await chatService.send(conversationId, content);
      if (res.data?.data) {
        setMessages(prev => [...prev, res.data.data]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch { }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#13B981" />;

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
            <Ionicons name="person" size={20} color="#fff" />
          </View>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherName || 'Chủ xe'}
          </Text>
        </View>
      </View>

      {!otherIsActive && (
        <View style={styles.disabledBanner}>
          <Ionicons name="ban-outline" size={16} color="#92400E" />
          <Text style={styles.disabledBannerText}>
            Tài khoản này đã bị vô hiệu hóa. Bạn không thể gửi tin nhắn.
          </Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.msgText, mine && styles.myText]}>{item.text}</Text>
            </View>
          );
        }}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.inputRow, !otherIsActive && styles.inputRowDisabled]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={otherIsActive ? 'Nhập tin nhắn...' : 'Không thể nhắn tin'}
          placeholderTextColor={otherIsActive ? undefined : '#999'}
          multiline
          maxHeight={100}
          returnKeyType="default"
          editable={otherIsActive}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !otherIsActive && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!otherIsActive}
        >
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
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
  },
  backBtn: { padding: 4 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#13B981', justifyContent: 'center', alignItems: 'center',
  },
  headerName: { fontSize: 15, fontWeight: '700', color: '#111', flex: 1 },
  msgList: { padding: 12, gap: 8 },
  bubble: { maxWidth: '75%', padding: 10, borderRadius: 16, marginBottom: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#13B981' },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  msgText: { color: '#111', fontSize: 14, lineHeight: 20 },
  myText: { color: '#fff' },
  disabledBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#FCD34D',
  },
  disabledBannerText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  inputRow: {
    flexDirection: 'row', padding: 8, gap: 8,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  inputRowDisabled: { backgroundColor: '#F9FAFB' },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#13B981', justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
});
