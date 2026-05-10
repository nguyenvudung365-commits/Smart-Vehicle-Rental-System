import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cardService } from '../../services/card.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';


// Định dạng số thẻ thành nhóm 4 chữ số: "4111111111111111" → "4111 1111 1111 1111"
function formatCardDisplay(raw) {
  return raw.replace(/(.{4})/g, '$1 ').trim();
}

const BRAND_ICON = { visa: 'card', mastercard: 'card', jcb: 'card', amex: 'card' };

export default function CardScreen() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadCards = useCallback(async () => {
    try {
      const result = await cardService.getMyCards();
      if (result.success) setCards(result.data);
    } catch {
      showError('Không tải được danh sách thẻ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await cardService.deleteCard(deleteTarget);
      showSuccess('Đã xóa thẻ');
      loadCards();
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleSetDefault(id) {
    try {
      await cardService.setDefault(id);
      showSuccess('Đã đặt thẻ mặc định');
      loadCards();
    } catch {
      showError('Thao tác thất bại');
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.lg }}
        ListEmptyComponent={
          <Text style={styles.empty}>Chưa có thẻ nào. Thêm thẻ để thanh toán khi đặt xe.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.brandRow}>
                <Ionicons name="card-outline" size={20} color={COLORS.primary} />
                <Text style={styles.brandText}>{item.brand.toUpperCase()}</Text>
              </View>
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Mặc định</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardNumber}>**** **** **** {item.last4}</Text>
            <Text style={styles.holderName}>{item.holderName}</Text>
            <Text style={styles.expiry}>Hết hạn: {String(item.expiryMonth).padStart(2,'0')}/{item.expiryYear}</Text>
            <View style={styles.cardActions}>
              {!item.isDefault && (
                <TouchableOpacity onPress={() => handleSetDefault(item.id)}>
                  <Text style={styles.actionText}>Đặt mặc định</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setDeleteTarget(item.id)}>
                <Text style={[styles.actionText, { color: COLORS.error }]}>Xóa thẻ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.addBtnText}>Thêm thẻ mới</Text>
      </TouchableOpacity>

      <AddCardModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={() => { setShowAdd(false); loadCards(); }}
      />

      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Xóa thẻ</Text>
            <Text style={styles.confirmMsg}>Bạn có chắc muốn xóa thẻ này?</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.confirmCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOk} onPress={confirmDelete}>
                <Text style={styles.confirmOkText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function AddCardModal({ visible, onClose, onAdded }) {
  const [form, setForm] = useState({ cardNumber: '', holderName: '', expiryMonth: '', expiryYear: '', cvv: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  function validateField(field, value) {
    const e = { ...errors };
    switch (field) {
      case 'cardNumber':
        if (!value) e.cardNumber = 'Vui lòng nhập số thẻ';
        else if (value.length < 13) e.cardNumber = 'Số thẻ phải có từ 13 đến 19 chữ số';
        else delete e.cardNumber;
        break;
      case 'holderName':
        if (!value.trim()) e.holderName = 'Vui lòng nhập tên chủ thẻ';
        else delete e.holderName;
        break;
      case 'expiryMonth':
        if (!value || parseInt(value) < 1 || parseInt(value) > 12)
          e.expiryMonth = 'Tháng từ 01 đến 12';
        else delete e.expiryMonth;
        break;
      case 'expiryYear':
        if (!value || value.length < 4) e.expiryYear = 'Năm gồm 4 chữ số';
        else if (parseInt(value) < new Date().getFullYear()) e.expiryYear = 'Thẻ đã hết hạn';
        else delete e.expiryYear;
        break;
      case 'cvv':
        if (!value || value.length < 3) e.cvv = 'CVV gồm 3–4 chữ số';
        else delete e.cvv;
        break;
    }
    setErrors(e);
  }

  function updateField(key, value) {
    setForm(p => ({ ...p, [key]: value }));
    if (errors[key]) validateField(key, value);
  }

  function validateAll() {
    ['cardNumber', 'holderName', 'expiryMonth', 'expiryYear', 'cvv'].forEach(f =>
      validateField(f, form[f])
    );
    return form.cardNumber.length >= 13 && form.holderName.trim()
      && form.expiryMonth && form.expiryYear && form.cvv?.length >= 3;
  }

  async function handleAdd() {
    if (!validateAll()) return;
    setSubmitting(true);
    try {
      const result = await cardService.addCard({
        ...form,
        expiryMonth: parseInt(form.expiryMonth),
        expiryYear: parseInt(form.expiryYear),
      });
      if (result.success) {
        showSuccess('Đã thêm thẻ thành công');
        setForm({ cardNumber: '', holderName: '', expiryMonth: '', expiryYear: '', cvv: '' });
        setErrors({});
        onAdded();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Thêm thẻ thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setForm({ cardNumber: '', holderName: '', expiryMonth: '', expiryYear: '', cvv: '' });
    setErrors({});
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thêm thẻ mới</Text>
            <TouchableOpacity onPress={reset}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Số thẻ */}
            <Text style={styles.label}>Số thẻ *</Text>
            <TextInput
              style={[styles.input, styles.cardInput, errors.cardNumber && styles.inputError]}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={COLORS.textTertiary}
              value={formatCardDisplay(form.cardNumber)}
              onChangeText={v => updateField('cardNumber', v.replace(/\D/g, '').slice(0, 19))}
              onBlur={() => validateField('cardNumber', form.cardNumber)}
              keyboardType="number-pad"
              maxLength={23}
            />
            {errors.cardNumber
              ? <Text style={styles.errorText}>{errors.cardNumber}</Text>
              : <Text style={styles.hintText}>Nhập 13–19 chữ số trên mặt trước thẻ</Text>
            }

            {/* Tên chủ thẻ */}
            <Text style={styles.label}>Tên chủ thẻ *</Text>
            <TextInput
              style={[styles.input, errors.holderName && styles.inputError]}
              placeholder="NGUYEN VAN A"
              placeholderTextColor={COLORS.textTertiary}
              value={form.holderName}
              onChangeText={v => updateField('holderName', v.toUpperCase())}
              onBlur={() => validateField('holderName', form.holderName)}
              autoCapitalize="characters"
            />
            {errors.holderName && <Text style={styles.errorText}>{errors.holderName}</Text>}

            {/* Ngày hết hạn + CVV */}
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Tháng *</Text>
                <TextInput
                  style={[styles.input, errors.expiryMonth && styles.inputError]}
                  placeholder="MM"
                  placeholderTextColor={COLORS.textTertiary}
                  value={form.expiryMonth}
                  onChangeText={v => updateField('expiryMonth', v)}
                  onBlur={() => validateField('expiryMonth', form.expiryMonth)}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                {errors.expiryMonth && <Text style={styles.errorText}>{errors.expiryMonth}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Năm *</Text>
                <TextInput
                  style={[styles.input, errors.expiryYear && styles.inputError]}
                  placeholder="YYYY"
                  placeholderTextColor={COLORS.textTertiary}
                  value={form.expiryYear}
                  onChangeText={v => updateField('expiryYear', v)}
                  onBlur={() => validateField('expiryYear', form.expiryYear)}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                {errors.expiryYear && <Text style={styles.errorText}>{errors.expiryYear}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>CVV *</Text>
                <TextInput
                  style={[styles.input, errors.cvv && styles.inputError]}
                  placeholder="•••"
                  placeholderTextColor={COLORS.textTertiary}
                  value={form.cvv}
                  onChangeText={v => updateField('cvv', v)}
                  onBlur={() => validateField('cvv', form.cvv)}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                />
                {errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.submitBtnText}>Thêm thẻ</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.xl, lineHeight: 22 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  brandText: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.primary },
  defaultBadge: {
    backgroundColor: '#E6F7F1', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm,
  },
  defaultBadgeText: { fontSize: FONT_SIZE.xs, color: COLORS.success, fontWeight: '600' },
  cardNumber: { fontSize: FONT_SIZE.lg, color: COLORS.text, letterSpacing: 3, marginBottom: SPACING.xs, fontVariant: ['tabular-nums'] },
  holderName: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  expiry: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  cardActions: {
    flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm,
  },
  actionText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT_SIZE.sm },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, padding: SPACING.md, margin: SPACING.lg, borderRadius: RADIUS.md,
  },
  addBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: 'bold', color: COLORS.text },

  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONT_SIZE.md, backgroundColor: COLORS.surface,
    color: COLORS.text,
  },
  cardInput: { fontSize: FONT_SIZE.lg, letterSpacing: 4, fontVariant: ['tabular-nums'] },
  inputError: { borderColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.xs, marginTop: 2 },
  hintText: { color: COLORS.textTertiary, fontSize: FONT_SIZE.xs, marginTop: 2 },

  submitBtn: {
    backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: RADIUS.md,
    alignItems: 'center', marginTop: SPACING.lg, marginBottom: SPACING.md,
  },
  submitBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '600' },

  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '80%' },
  confirmTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.sm },
  confirmMsg: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md },
  confirmCancel: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  confirmCancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmOk: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.error },
  confirmOkText: { color: '#FFF', fontWeight: '600' },
});
