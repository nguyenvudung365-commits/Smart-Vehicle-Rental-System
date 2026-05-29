// Format gia tien VND co chu "d" — dung de hien thi tinh
export function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
}

// Format so tien trong o input
// Dung cho value= cua TextInput de nguoi dung doc duoc khi go
export function formatInputPrice(rawNumber) {
  if (!rawNumber && rawNumber !== 0) return '';
  return Number(rawNumber).toLocaleString('vi-VN');
}

// Lay so nguyen tu chuoi co dau cham ngan cach — dung trong onChangeText
export function parseInputPrice(text) {
  return text.replace(/\./g, '').replace(/\D/g, '');
}

// Format ngay tieng Viet
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('vi-VN');
}
