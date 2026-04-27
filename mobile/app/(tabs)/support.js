import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Modal, Dimensions,
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';

const HOTLINE = '19009217';

// Nội dung các màn hình thông tin (placeholder — bạn gửi nội dung sau)
const INFO_CONTENT = {
  company:   { title: 'Thông tin công ty',          body: 'Nội dung sẽ được cập nhật.' },
  policy:    { title: 'Chính sách và quy định',     body: 'Nội dung sẽ được cập nhật.' },
  rating:    { title: 'Đánh giá Mioto',             body: 'Nội dung sẽ được cập nhật.' },
  fanpage:   { title: 'Fanpage Facebook Mioto',     body: 'Nội dung sẽ được cập nhật.' },
  faq:       { title: 'Hỏi và trả lời',             body: 'Nội dung sẽ được cập nhật.' },
  charter:   { title: 'Quy chế hoạt động',         body: 'Nội dung sẽ được cập nhật.' },
  privacy:   { title: 'Bảo mật thông tin',          body: 'Nội dung sẽ được cập nhật.' },
  dispute:   { title: 'Giải quyết tranh chấp',      body: 'Nội dung sẽ được cập nhật.' },
};

const GUIDE_CARDS = [
  { id: 'g1', title: 'Chuẩn bị trước\nchuyến đi',   bg: '#E6F7F0', icon: 'bag-handle-outline' },
  { id: 'g2', title: 'Quy trình\nnhận xe',           bg: '#E8F4FD', icon: 'car-outline' },
  { id: 'g3', title: 'Xử lý sự cố\nkhi thuê xe',    bg: '#FEF3C7', icon: 'warning-outline' },
  { id: 'g4', title: 'Hướng dẫn\nthanh toán',        bg: '#F3E8FF', icon: 'card-outline' },
];

const INFO_GRID = [
  { key: 'company', icon: 'business-outline',       label: 'Thông tin\ncông ty' },
  { key: 'policy',  icon: 'document-text-outline',  label: 'Chính sách\nvà quy định' },
  { key: 'rating',  icon: 'logo-google-playstore',  label: 'Đánh giá Mioto\ntrên Google Play' },
  { key: 'fanpage', icon: 'logo-facebook',           label: 'Fanpage\nFacebook Mioto' },
  { key: 'faq',     icon: 'help-circle-outline',    label: 'Hỏi và\ntrả lời' },
  { key: 'charter', icon: 'newspaper-outline',      label: 'Quy chế\nhoạt động' },
  { key: 'privacy', icon: 'lock-closed-outline',    label: 'Bảo mật\nthông tin' },
  { key: 'dispute', icon: 'shield-checkmark-outline', label: 'Giải quyết\ntranh chấp' },
];

const INSURANCE = [
  { id: 'mic', label: 'MIC',           color: '#D32F2F', hotline: '19005588' },
  { id: 'pvi', label: 'PVI Insurance', color: '#1565C0', hotline: '18001585' },
  { id: 'dbv', label: 'DBV Insurance', color: '#2E7D32', hotline: '19009696' },
];

export default function SupportScreen() {
  const [modal, setModal] = useState(null); // key hoặc null

  function openInfo(key) {
    if (key === 'fanpage') {
      Linking.openURL('https://facebook.com').catch(() => {});
      return;
    }
    if (key === 'rating') {
      Linking.openURL('https://play.google.com/store').catch(() => {});
      return;
    }
    setModal(key);
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner minh hoạ */}
        <View style={styles.banner}>
          <View style={styles.bannerIllustration}>
            <View style={styles.bannerIconBubble}>
              <Ionicons name="headset" size={32} color="#FFF" />
            </View>
            <View style={styles.bannerIconBubble2}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
            </View>
            <View style={styles.bannerIconBubble3}>
              <Ionicons name="help-circle" size={20} color="#FFF" />
            </View>
          </View>
          <Text style={styles.bannerTitle}>Trung tâm{'\n'}hỗ trợ Mioto</Text>
        </View>

        {/* Card liên hệ */}
        <View style={styles.contactCard}>
          <Text style={styles.contactText}>
            Cần hỗ trợ nhanh, vui lòng gọi <Text style={styles.contactBold}>1900 9217</Text> (7AM - 10PM) hoặc gửi tin nhắn vào Mioto Fanpage.
          </Text>
          <View style={styles.contactBtns}>
            <TouchableOpacity
              style={styles.btnCall}
              onPress={() => Linking.openURL(`tel:${HOTLINE}`)}
            >
              <Ionicons name="call-outline" size={18} color={COLORS.primary} />
              <Text style={styles.btnCallText}>Gọi điện</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnMsg}
              onPress={() => Linking.openURL('https://facebook.com').catch(() => {})}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
              <Text style={styles.btnMsgText}>Gửi tin nhắn</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.btnChatbot}
            onPress={() => router.push('/chat/mia')}
          >
            <Ionicons name="sparkles-outline" size={18} color="#F59E0B" />
            <Text style={styles.btnChatbotText}>Chatbot Mia</Text>
          </TouchableOpacity>
        </View>

        {/* Hotline bảo hiểm */}
        <Text style={styles.sectionTitle}>Hotline bảo hiểm</Text>
        <View style={styles.insuranceRow}>
          {INSURANCE.map(ins => (
            <TouchableOpacity
              key={ins.id}
              style={styles.insuranceCard}
              onPress={() => Linking.openURL(`tel:${ins.hotline}`)}
            >
              <Text style={[styles.insuranceLabel, { color: ins.color }]}>{ins.label}</Text>
              <Text style={styles.insuranceHotline}>{ins.hotline}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hướng dẫn */}
        <Text style={styles.sectionTitle}>Hướng dẫn</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guideScroll}>
          {GUIDE_CARDS.map(card => (
            <TouchableOpacity key={card.id} style={[styles.guideCard, { backgroundColor: card.bg }]}>
              <Ionicons name={card.icon} size={36} color={COLORS.primary} style={{ marginBottom: SPACING.sm }} />
              <Text style={styles.guideTitle}>{card.title}</Text>
              <Ionicons name="chevron-forward-outline" size={16} color={COLORS.primary} style={{ marginTop: 4 }} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Thông tin */}
        <Text style={styles.sectionTitle}>Thông tin</Text>
        <View style={styles.infoGrid}>
          {INFO_GRID.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.infoCell}
              onPress={() => openInfo(item.key)}
              activeOpacity={0.7}
            >
              <View style={styles.infoIconWrap}>
                <Ionicons name={item.icon} size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.infoLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <Text style={styles.version}>Phiên bản 1.0.0 (1)</Text>
      </ScrollView>

      {/* Modal nội dung thông tin */}
      <Modal visible={!!modal} animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModal(null)} style={styles.modalBack}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{modal ? INFO_CONTENT[modal]?.title : ''}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.modalText}>{modal ? INFO_CONTENT[modal]?.body : ''}</Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },

  // Banner
  banner: {
    backgroundColor: '#E6F7F0', flexDirection: 'row', alignItems: 'center',
    padding: SPACING.xl, paddingTop: 50, gap: SPACING.lg,
  },
  bannerIllustration: { width: 80, height: 80, position: 'relative' },
  bannerIconBubble: {
    position: 'absolute', top: 0, left: 0,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  bannerIconBubble2: {
    position: 'absolute', bottom: 0, right: 0,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center',
  },
  bannerIconBubble3: {
    position: 'absolute', top: 4, right: 4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text, lineHeight: 28 },

  // Contact card
  contactCard: {
    backgroundColor: COLORS.background, margin: SPACING.lg, marginTop: -SPACING.md,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
  },
  contactText: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 22, marginBottom: SPACING.md },
  contactBold: { fontWeight: '700', color: COLORS.primary },
  contactBtns: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  btnCall: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  btnCallText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.sm },
  btnMsg: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
  },
  btnMsgText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZE.sm },
  btnChatbot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: '#F59E0B', backgroundColor: '#FFFBEB',
  },
  btnChatbotText: { color: '#F59E0B', fontWeight: '700', fontSize: FONT_SIZE.sm },

  sectionTitle: {
    fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text,
    paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },

  // Insurance
  insuranceRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  insuranceCard: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center',
  },
  insuranceLabel: { fontSize: FONT_SIZE.md, fontWeight: '800', marginBottom: 4 },
  insuranceHotline: { fontSize: 10, color: COLORS.textSecondary },

  // Guide
  guideScroll: { paddingHorizontal: SPACING.lg, gap: SPACING.md, paddingBottom: 4 },
  guideCard: {
    width: 160, borderRadius: RADIUS.lg, padding: SPACING.lg,
    alignItems: 'flex-start', justifyContent: 'center', minHeight: 140,
  },
  guideTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, lineHeight: 20 },

  // Info grid — 2 ô 1 hàng, dùng width pixel tránh overflow với gap
  infoGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: COLORS.border,
    gap: 1,
  },
  infoCell: {
    width: (SCREEN_W - 1) / 2,  // (màn hình - 1px gap dọc giữa) / 2
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    padding: SPACING.lg, gap: SPACING.sm, minHeight: 110,
  },
  infoIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  infoLabel: {
    fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text,
    textAlign: 'center', lineHeight: 20,
  },

  version: {
    textAlign: 'center', fontSize: FONT_SIZE.xs, color: COLORS.textTertiary,
    paddingVertical: SPACING.xl,
  },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalBack: { width: 40, height: 40, justifyContent: 'center' },
  modalTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  modalBody: { padding: SPACING.xl },
  modalText: { fontSize: FONT_SIZE.md, color: COLORS.text, lineHeight: 26 },
});
