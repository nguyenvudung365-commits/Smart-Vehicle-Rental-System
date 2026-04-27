// Format gia tien VND
export function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
}

// Format ngay tieng Viet
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('vi-VN');
}
