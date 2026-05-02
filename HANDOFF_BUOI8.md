# HANDOFF BUỔI 8 — Mioto Clone

## IP WIFI HIỆN TẠI: 192.168.1.6
> Đổi mạng phải cập nhật `mobile/services/api.js` → `const API_URL = 'http://<IP_MỚI>:3000/api'`

## LỆNH CHẠY PROJECT
```bash
# Terminal 1
docker compose up -d

# Terminal 2 — quan trọng: restart để load Prisma client mới
cd backend && npx prisma generate && npm run dev

# Terminal 3 (cmd, không dùng PowerShell)
cd mobile && npx expo start --clear
```

---

## TỔNG KẾT ĐOẠN CHAT NÀY ĐÃ LÀM

### BUỔI 6 ✅ (đã làm trước)
| Thứ | File |
|-----|------|
| Review model + POST/GET /api/reviews | `review.service.js`, `review.routes.js` |
| Màn hình đánh giá xe | `mobile/app/review/create.js` |
| Hiện review thực trong chi tiết xe | `mobile/app/vehicle/[id].js` |

### BUỔI 7 ✅ (đã làm trước)
| Thứ | File |
|-----|------|
| PUT /api/auth/profile | `auth.service.js` |
| Notification + Admin APIs | `notification.service.js`, `admin.routes.js` |
| Màn hình sửa hồ sơ, thông báo, admin | mobile screens |

### ĐỢT 1 ✅ (đã làm trước)
| Tính năng | File |
|-----------|------|
| Thanh toán giả lập OTP | `mobile/app/booking/payment.js` |
| Favorite (yêu thích) | `favorite.service.js`, `favorites.js` |
| Address CRUD | `address.service.js`, `addresses.js` |
| Referral (giới thiệu bạn bè) | `auth.service.js`, `referral.js` |

---

### ĐỢT 2 ✅ MỚI XONG
| Tính năng | Backend | Mobile |
|-----------|---------|--------|
| **Chatbot Mia** — rule-based, 15 chủ đề | `src/services/chat.service.js`, `routes/chat.routes.js` | `app/chat/mia.js`, `services/chat.service.js` |
| **Điểm thưởng chi tiết** — tích/dùng điểm | `src/services/points.service.js`, `routes/points.routes.js` | `app/profile/points.js`, `services/points.service.js` |
| Hiện điểm thực trong header Khám phá | — | `app/(tabs)/index.js` |
| Nút "Điểm thưởng" trong profile | — | `app/(tabs)/profile.js` |
| Dùng điểm giảm giá khi đặt xe | booking.service.js (usePoints) | `app/booking/create.js` |
| Tích điểm sau booking (1pt/10k chi tiêu) | booking.service.js | — |

### ĐỢT 3 ✅ MỚI XONG
| Tính năng | Backend | Mobile |
|-----------|---------|--------|
| **Chat renter ↔ host** — polling 5s | `conversation.service.js`, `conversation.routes.js` | `app/chat/[conversationId].js`, `services/conversation.service.js` |
| Tab Tin nhắn (Thông báo + Hội thoại + Mia) | — | `app/(tabs)/messages.js` (viết lại) |
| Nút Chat trong chi tiết xe | — | `app/vehicle/[id].js` |
| **Push notification FCM** — Expo Notifications | notification.service.js gửi push | `contexts/AuthContext.js` đăng ký token |
| Schema mới: PointHistory, Conversation, Message, pushToken | `prisma/schema.prisma` | — |

---

## TRẠNG THÁI 22 TÍNH NĂNG

| # | Tính năng | Trạng thái |
|---|-----------|-----------|
| 1 | Đăng ký tài khoản | ✅ |
| 2 | Đăng nhập / Đăng xuất | ✅ |
| 3 | Xác thực GPLX (KYC) | ✅ |
| 4 | Tìm kiếm xe tự lái | ✅ |
| 5 | Bộ lọc nâng cao | ✅ |
| 6 | Xem chi tiết xe | ✅ |
| 7 | Đặt xe | ✅ |
| 8 | Huỷ đặt xe | ✅ |
| 9 | Quản lý chuyến đi | ✅ |
| 10 | Liên kết thẻ thanh toán | ✅ |
| 11 | Cổng thanh toán (giả lập OTP) | ✅ |
| 12 | Chat với chủ xe | ✅ |
| 13 | Chatbot Mia | ✅ |
| 14 | Đánh giá sau chuyến | ✅ |
| 15 | Quản lý hồ sơ cá nhân | ✅ |
| 16 | Xe yêu thích | ✅ |
| 17 | Quản lý địa chỉ | ✅ |
| 18 | Điểm thưởng & Quà tặng | ✅ |
| 19 | Giới thiệu bạn bè | ✅ |
| 20 | Đăng ký xe mới | ✅ |
| 21 | Quản lý xe | ✅ |
| 22 | Phê duyệt hệ thống (Admin) | ✅ |
| + | Thông báo in-app | ✅ |
| + | Push notification FCM | ✅ |
| + | Bản đồ GPS | ❌ Cần cài react-native-maps |

**Đã xong: 22/22** tính năng chính 🎉

---

## SCHEMA MỚI (cần restart backend sau khi generate)

```bash
cd backend
npx prisma generate   # regenerate client
npm run dev
```

Các bảng mới trong DB:
- `point_histories` — lịch sử điểm thưởng
- `conversations` — cuộc hội thoại renter ↔ host
- `messages` — tin nhắn trong conversation
- `users.push_token` — Expo push token

---

## API MỚI

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /api/chat/mia | Chatbot Mia (body: { message }) |
| GET | /api/points | Số dư + lịch sử điểm |
| POST | /api/conversations | Tạo/lấy conversation |
| GET | /api/conversations | Danh sách hội thoại của tôi |
| GET | /api/conversations/:id/messages | Lấy tin nhắn |
| POST | /api/conversations/:id/messages | Gửi tin nhắn |
| PUT | /api/auth/push-token | Đăng ký push token |

---

## ĐIỂM THƯỞNG — Quy tắc

- **Tích điểm**: 1 điểm mỗi 10.000đ chi tiêu (khi booking confirmed)
- **Dùng điểm**: 1 điểm = 1.000đ giảm giá, tối đa 30% giá trị đơn
- **Referral**: +50 điểm cho người giới thiệu, +30 điểm cho người được giới thiệu (đã có từ trước)

---

## CHAT — Cơ chế polling

- Mobile poll message mới mỗi **5 giây** khi đang mở màn hình chat
- Conversation được tạo tự động khi user nhấn "Chat với chủ xe" trong detail
- Unique constraint: 1 conversation duy nhất giữa mỗi cặp (renter, host)

---

## PUSH NOTIFICATION

- Dùng **Expo Notifications** (cần install nếu chưa có): `npx expo install expo-notifications expo-constants`
- AuthContext tự động xin quyền + đăng ký token sau login/register
- Backend gửi push qua `https://exp.host/--/api/v2/push/send` khi tạo notification

---

## BẢN ĐỒ GPS — Cài sau nếu cần

```bash
cd mobile
npx expo install react-native-maps expo-location
```

---

## TÀI KHOẢN TEST (password: 123456)
| Vai trò | SĐT |
|---------|-----|
| Admin | 0900000000 |
| Host HN | 0900000001 |
| Renter (KYC ok, có booking) | 0900000002 |
| Renter (KYC pending) | 0900000014 |
