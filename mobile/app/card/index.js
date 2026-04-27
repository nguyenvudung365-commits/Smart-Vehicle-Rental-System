// FR-10: Man hinh quan ly the thanh toan
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cardService } from '../../services/card.service';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';

export default function CardScreen() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadCards = useCallback(async () => {
    try {
      const result = await cardService.getMyCards();
      if (result.success) setCards(result.data);
    } catch (err) {
      showError('Khong tai duoc danh sach the');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await cardService.deleteCard(deleteTarget);
      showSuccess('Da xoa the');
      loadCards();
    } catch (err) {
      showError(err.response?.data?.message || 'Xoa that bai');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleSetDefault(id) {
    try {
      await cardService.setDefault(id);
      showSuccess('Da dat the mac dinh');
      loadCards();
    } catch (err) {
      showError('Thao tac that bai');
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.lg }}
        ListEmptyComponent={
          <Text style={styles.empty}>Chua co the nao. Them the de thanh toan khi dat xe.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.brandText}>{item.brand.toUpperCase()}</Text>
              {item.isDefault && <Text style={styles.defaultBadge}>Mac dinh</Text>}
            </View>
            <Text style={styles.cardNumber}>**** **** **** {item.last4}</Text>
            <Text style={styles.holderName}>{item.holderName}</Text>
            <Text style={styles.expiry}>Het han: {item.expiryMonth}/{item.expiryYear}</Text>
            <View style={styles.cardActions}>
              {!item.isDefault && (
                <TouchableOpacity onPress={() => handleSetDefault(item.id)}>
                  <Text style={styles.actionText}>Dat mac dinh</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setDeleteTarget(item.id)}>
                <Text style={[styles.actionText, { color: COLORS.error }]}>Xoa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.addBtnText}>Them the moi</Text>
      </TouchableOpacity>

      <AddCardModal visible={showAdd} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); loadCards(); }} />

      {/* Modal xac nhan xoa — thay Alert.alert */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Xoa the</Text>
            <Text style={styles.confirmMsg}>Ban co chac muon xoa the nay?</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.confirmCancelText}>Huy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOk} onPress={confirmDelete}>
                <Text style={styles.confirmOkText}>Xoa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
        if (!value) e.cardNumber = 'Vui long nhap so the';
        else if (value.length < 13) e.cardNumber = 'So the phai co 13-19 so';
        else delete e.cardNumber;
        break;
      case 'holderName':
        if (!value) e.holderName = 'Vui long nhap ten chu the';
        else delete e.holderName;
        break;
      case 'expiryMonth':
        if (!value || parseInt(value) < 1 || parseInt(value) > 12) e.expiryMonth = 'Thang 01-12';
        else delete e.expiryMonth;
        break;
      case 'expiryYear':
        if (!value || value.length < 4) e.expiryYear = 'Nam 4 so';
        else if (parseInt(value) < new Date().getFullYear()) e.expiryYear = 'The da het han';
        else delete e.expiryYear;
        break;
      case 'cvv':
        if (!value || value.length < 3) e.cvv = '3-4 so';
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
    validateField('cardNumber', form.cardNumber);
    validateField('holderName', form.holderName);
    validateField('expiryMonth', form.expiryMonth);
    validateField('expiryYear', form.expiryYear);
    validateField('cvv', form.cvv);
    return form.cardNumber.length >= 13 && form.holderName
      && form.expiryMonth && form.expiryYear && form.cvv?.length >= 3;
  }

  async function handleAdd() {
    if (!validateAll()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        expiryMonth: parseInt(form.expiryMonth),
        expiryYear: parseInt(form.expiryYear),
      };
      const result = await cardService.addCard(payload);
      if (result.success) {
        showSuccess('Da them the');
        setForm({ cardNumber: '', holderName: '', expiryMonth: '', expiryYear: '', cvv: '' });
        setErrors({});
        onAdded();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Them the that bai');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Them the moi</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={styles.label}>So the (dung so the test: 4111111111111111)</Text>
            <TextInput style={[styles.input, errors.cardNumber && styles.inputError]} placeholder="4111 1111 1111 1111" value={form.cardNumber}
              onChangeText={v => updateField('cardNumber', v.replace(/\D/g, ''))}
              onBlur={() => validateField('cardNumber', form.cardNumber)}
              keyboardType="number-pad" maxLength={19} />
            {errors.cardNumber && <Text style={styles.errorText}>{errors.cardNumber}</Text>}

            <Text style={styles.label}>Ten chu the</Text>
            <TextInput style={[styles.input, errors.holderName && styles.inputError]} placeholder="NGUYEN VAN A" value={form.holderName}
              onChangeText={v => updateField('holderName', v.toUpperCase())}
              onBlur={() => validateField('holderName', form.holderName)}
              autoCapitalize="characters" />
            {errors.holderName && <Text style={styles.errorText}>{errors.holderName}</Text>}

            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Thang</Text>
                <TextInput style={[styles.input, errors.expiryMonth && styles.inputError]} placeholder="MM" value={form.expiryMonth}
                  onChangeText={v => updateField('expiryMonth', v)}
                  onBlur={() => validateField('expiryMonth', form.expiryMonth)}
                  keyboardType="number-pad" maxLength={2} />
                {errors.expiryMonth && <Text style={styles.errorText}>{errors.expiryMonth}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Nam</Text>
                <TextInput style={[styles.input, errors.expiryYear && styles.inputError]} placeholder="YYYY" value={form.expiryYear}
                  onChangeText={v => updateField('expiryYear', v)}
                  onBlur={() => validateField('expiryYear', form.expiryYear)}
                  keyboardType="number-pad" maxLength={4} />
                {errors.expiryYear && <Text style={styles.errorText}>{errors.expiryYear}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>CVV</Text>
                <TextInput style={[styles.input, errors.cvv && styles.inputError]} placeholder="123" value={form.cvv}
                  onChangeText={v => updateField('cvv', v)}
                  onBlur={() => validateField('cvv', form.cvv)}
                  keyboardType="number-pad" maxLength={4} secureTextEntry />
                {errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
              </View>
            </View>

            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleAdd} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Them the</Text>}
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
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  brandText: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.primary },
  defaultBadge: {
    fontSize: FONT_SIZE.xs, color: COLORS.success, fontWeight: '600',
    backgroundColor: '#E6F7F1', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm,
  },
  cardNumber: { fontSize: FONT_SIZE.lg, color: COLORS.text, letterSpacing: 2, marginBottom: SPACING.xs },
  holderName: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  expiry: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  actionText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT_SIZE.sm },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, padding: SPACING.md, margin: SPACING.lg, borderRadius: RADIUS.md,
  },
  addBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: 'bold', color: COLORS.text },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONT_SIZE.md, backgroundColor: COLORS.surface,
  },
  submitBtn: { backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.lg },
  submitBtnText: { color: '#FFF', fontSize: FONT_SIZE.md, fontWeight: '600' },
  inputError: { borderColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.xs, marginTop: 2 },
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
