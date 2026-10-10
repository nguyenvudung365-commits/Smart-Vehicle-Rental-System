# 🚗 Smart Vehicle Rental System (Mioto Clone)

Ứng dụng **thuê xe tự lái đa nền tảng** (Android / iOS) lấy cảm hứng từ Mioto. Hệ thống kết nối **chủ xe (host)** và **khách thuê (renter)**, có quản trị viên (**admin**) kiểm duyệt xe và giấy phép lái xe.

- **Mobile:** React Native + Expo (Expo Router)
- **Backend:** Node.js + Express 5 + Prisma ORM
- **Database:** PostgreSQL 16
- **Lưu trữ ảnh:** MinIO (tương thích S3), ảnh được nén sang WebP bằng `sharp`
- **Trợ lý ảo:** Mia, chatbot dùng Google Gemini

---

## Mục lục

1. [Tính năng](#-tính-năng)
2. [Ảnh minh họa](#-ảnh-minh-họa)
3. [Kiến trúc & công nghệ](#-kiến-trúc--công-nghệ)
4. [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
5. [Cài đặt & chạy](#-cài-đặt--chạy)
6. [Biến môi trường](#-biến-môi-trường)
7. [Tài khoản demo](#-tài-khoản-demo)
8. [Quy trình nghiệp vụ](#-quy-trình-nghiệp-vụ)
9. [Mô hình dữ liệu](#-mô-hình-dữ-liệu)
10. [API](#-api)
11. [Bảo mật](#-bảo-mật)
12. [Lưu ý & hạn chế](#-lưu-ý--hạn-chế)

---

## ✨ Tính năng

### Khách thuê (Renter)
- Đăng ký / đăng nhập (số điện thoại + mật khẩu), JWT access token + refresh token tự động làm mới.
- **Tìm kiếm xe** theo tỉnh/quận/phường, khoảng giá, số chỗ, loại hộp số, nhiên liệu, tiện nghi; sắp xếp theo giá, năm sản xuất, ngày đăng; có phân trang.
- Xem chi tiết xe, ảnh, tiện nghi, đánh giá, lịch đã được đặt (`booked-dates`).
- Xe yêu thích, xe xem gần đây, chọn địa chỉ trên bản đồ (Google Maps).
- **Xác thực GPLX (KYC)** bằng ảnh bằng lái (CCCD là tuỳ chọn). Phải được duyệt mới được đặt xe.
- Đặt xe, thanh toán bằng thẻ đã lưu (chỉ lưu 4 số cuối), xác nhận bằng OTP.
- Dùng **điểm thưởng** và **voucher** để giảm giá.
- Theo dõi chuyến đi, chụp ảnh khi nhận / trả xe, hủy đơn, đánh giá xe sau chuyến đi.
- Nhắn tin trực tiếp với chủ xe, nhận thông báo trong ứng dụng.
- Quản lý sổ địa chỉ, thẻ thanh toán, đổi mật khẩu, mã giới thiệu, yêu cầu xóa tài khoản.

### Chủ xe (Host)
- Đăng ký xe (tối đa 10 ảnh), kiểm tra **định dạng biển số** (`51A-12345` hoặc `51A1-2345`) và báo lỗi khi biển số đã tồn tại, gửi duyệt, chỉnh sửa, bật / tắt trạng thái sẵn sàng.
- Quản lý đơn thuê: xác nhận / từ chối, **bàn giao xe**, **xác nhận nhận xe trả về** (kèm ảnh).
- Lịch xe (calendar), thống kê doanh thu (tổng, tháng này, tháng trước, sau khi trừ phí nền tảng).
- **Đánh giá khách thuê** và **chặn khách** không mong muốn.

### Quản trị viên (Admin)
- Duyệt / từ chối **KYC** và **xe** (kèm lý do từ chối).
- Quản lý người dùng (khóa / mở tài khoản), duyệt yêu cầu xóa tài khoản.
- Quản lý **voucher** (tạo, bật / tắt, xóa).
- Xem thống kê tổng quan, cấu hình hệ thống (ví dụ phí nền tảng).

### Khác
- **Mia** là chatbot (Gemini `gemini-3.5-flash`) hỗ trợ người dùng về đặt xe, KYC, điểm thưởng, v.v.
- App tự **chuẩn hóa URL ảnh** từ MinIO (đổi `localhost` / IP LAN cũ sang host của `apiUrl`), nên ảnh vẫn hiển thị khi đổi mạng.
- Chương trình **giới thiệu bạn bè**: người giới thiệu nhận 50 điểm khi có người đăng ký bằng mã của họ.

---

## 📸 Ảnh minh họa

> Ảnh chụp từ app chạy thật trên điện thoại (dữ liệu seed).

**Người thuê xe**

| Bộ lọc tìm xe | Bộ lọc nâng cao | Bộ lọc (tiếp) |
|:--:|:--:|:--:|
| <img src="docs/screenshots/filter-1.jpg" width="220"> | <img src="docs/screenshots/filter-2.jpg" width="220"> | <img src="docs/screenshots/filter-3.jpg" width="220"> |

| Đặt xe thành công | Đang thuê | Trả xe, chờ chủ xe xác nhận |
|:--:|:--:|:--:|
| <img src="docs/screenshots/booking-success.jpg" width="220"> | <img src="docs/screenshots/trip-in-progress.jpg" width="220"> | <img src="docs/screenshots/trip-return-pending.jpg" width="220"> |

**Thêm thẻ thanh toán (thẻ giả lập)**

<img src="docs/screenshots/add-card.jpg" width="560">

**Admin**

| Thống kê hệ thống | Quản lý người dùng |
|:--:|:--:|
| <img src="docs/screenshots/admin-dashboard.jpg" width="260"> | <img src="docs/screenshots/admin-users.jpg" width="260"> |

---

## 🏗 Kiến trúc & công nghệ

```
┌──────────────────────┐        HTTPS/JSON         ┌───────────────────────┐
│  Mobile (Expo / RN)  │ ────────────────────────► │  Backend (Express 5)  │
│  - Expo Router       │   Bearer JWT (axios)      │  routes → controllers │
│  - SecureStore       │                           │  → services → Prisma  │
│  - Mia (Gemini API)  │                           └──────┬───────────┬────┘
└──────────────────────┘                                  │           │
                                                          ▼           ▼
                                                 ┌────────────┐ ┌──────────────┐
                                                 │ PostgreSQL │ │ MinIO (S3)   │
                                                 │  16        │ │ bucket ảnh   │
                                                 └────────────┘ └──────────────┘
```

| Lớp | Công nghệ |
|---|---|
| Mobile | Expo ~55, React Native 0.83, React 19, Expo Router, Axios, `expo-secure-store`, `expo-location`, `expo-image-picker`, `react-native-toast-message` |
| Backend | Express 5, Prisma 6, Zod (validate), JWT (`jsonwebtoken`), `bcrypt`, `helmet`, `cors`, `express-rate-limit`, `morgan`, `multer`, `sharp`, AWS SDK S3 |
| Hạ tầng | Docker Compose: PostgreSQL, pgAdmin, MinIO |
| AI | Google Gemini (`@google/generative-ai`, gọi từ app mobile) |

Backend theo mô hình phân lớp **routes → controllers → services**. Logic nghiệp vụ nằm ở `services`, xử lý lỗi dùng `err.status` / `err.code` rồi chuyển qua error handler chung.

---

## 📁 Cấu trúc thư mục

```
Mioto/
├── docker-compose.yml        # PostgreSQL + pgAdmin + MinIO (+ khởi tạo bucket)
├── mioto_schema.sql          # Schema SQL khởi tạo DB lần đầu (mount vào Postgres)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Mô hình dữ liệu Prisma
│   │   └── seed.js           # Dữ liệu demo (user, xe, booking, voucher, chat...)
│   └── src/
│       ├── server.js         # Điểm vào: middleware, mount routes, error handler
│       ├── config/           # prisma.js, s3.js (MinIO)
│       ├── controllers/      # auth, booking, card, kyc, notification, review, vehicle
│       ├── routes/           # 15 nhóm route (auth, vehicles, bookings, admin, host...)
│       ├── services/         # Logic nghiệp vụ
│       ├── middlewares/      # auth (JWT), upload (multer), validate (Zod)
│       ├── validators/       # Schema Zod
│       └── utils/            # jwt.js, response.js
└── mobile/
    ├── app.json              # Cấu hình Expo (apiUrl, scheme, quyền vị trí...)
    ├── app/                  # Màn hình (file-based routing của Expo Router)
    │   ├── (auth)/           # login, register
    │   ├── (tabs)/           # Khám phá, Tin nhắn, Chuyến đi, Hỗ trợ, Cá nhân
    │   ├── vehicle/ booking/ kyc/ card/ trips/ review/ chat/ profile/
    │   ├── host/             # Màn hình chủ xe
    │   └── admin/            # Màn hình quản trị
    ├── components/           # VehicleCard, MapPickerModal, SuggestionInput
    ├── contexts/             # AuthContext
    ├── services/             # Lớp gọi API (axios), một file cho mỗi nhóm
    ├── constants/ utils/     # theme, format, toast, lịch sử nhập/xem
    └── assets/
```

---

## 🚀 Cài đặt & chạy

### Yêu cầu
- Node.js 18+ và npm
- Docker + Docker Compose
- Ứng dụng **Expo Go** trên điện thoại, hoặc Android Studio / Xcode (emulator)
- Điện thoại và máy tính **cùng mạng Wi-Fi**

### 1. Khởi động hạ tầng (PostgreSQL, pgAdmin, MinIO)

```bash
docker compose up -d
```

| Dịch vụ | Địa chỉ | Ghi chú |
|---|---|---|
| PostgreSQL | `localhost:5432` | DB `mioto_clone`, schema tự nạp từ `mioto_schema.sql` |
| pgAdmin | http://localhost:5050 | Quản trị DB |
| MinIO API | http://localhost:9000 | Backend gọi S3 qua đây |
| MinIO Console | http://localhost:9001 | Xem ảnh đã upload |

Service `minio-init` tự tạo bucket `mioto-images` với quyền đọc công khai.

> Thông tin đăng nhập mặc định của các dịch vụ nằm trong `docker-compose.yml` (chỉ dùng cho môi trường phát triển).

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # rồi bổ sung biến MinIO, xem phần "Biến môi trường"
npx prisma generate
npx prisma db push          # đồng bộ schema Prisma lên DB
npm run seed                # (tuỳ chọn) nạp dữ liệu demo
npm run dev                 # chạy với nodemon, mặc định cổng 3000
```

Kiểm tra: http://localhost:3000/api/health trả về `{ "status": "ok", ... }`.

| Script | Tác dụng |
|---|---|
| `npm run dev` | Chạy server với nodemon |
| `npm start` | Chạy server production |
| `npm run seed` | Xóa sạch và nạp lại dữ liệu demo |
| `npm run db:generate` / `db:push` / `db:pull` | Lệnh Prisma |
| `npm run db:studio` | Mở Prisma Studio |
| `npm run lint` / `npm run format` | ESLint / Prettier |

> ⚠️ `npm run seed` **xóa toàn bộ dữ liệu hiện có** trước khi nạp dữ liệu mới.

### 3. Mobile

```bash
cd mobile
npm install
```

Mở `mobile/app.json` và sửa `expo.extra.apiUrl` thành **IP LAN của máy chạy backend**, ví dụ `http://192.168.1.10:3000/api`. (Không dùng `localhost`, vì điện thoại sẽ không truy cập được.)

Điền thêm `expo.extra.geminiApiKey` (cho chatbot Mia) và `expo.android.config.googleMaps.apiKey` (cho bản đồ) bằng key của bạn.

```bash
npm start            # mở Expo, quét QR bằng Expo Go
npm run android      # hoặc chạy trên emulator Android
npm run ios          # hoặc iOS simulator (macOS)
```

---

## 🔧 Biến môi trường

### Backend (`backend/.env`)

| Biến | Mô tả | Mặc định / ví dụ |
|---|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | `postgresql://mioto_admin:...@localhost:5432/mioto_clone?schema=public` |
| `PORT` | Cổng server | `3000` |
| `NODE_ENV` | Môi trường | `development` |
| `JWT_ACCESS_SECRET` | Khóa ký access token | **đổi khi triển khai** |
| `JWT_REFRESH_SECRET` | Khóa ký refresh token | **đổi khi triển khai** |
| `JWT_ACCESS_EXPIRES_IN` | Hạn access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Hạn refresh token | `30d` |
| `CORS_ORIGIN` | Origin được phép | `*` |
| `RATE_LIMIT_WINDOW_MS` | Cửa sổ rate limit | `60000` |
| `RATE_LIMIT_MAX` | Số request tối đa / cửa sổ / IP | `100` |
| `MINIO_ENDPOINT` | Endpoint S3 mà backend gọi | `http://localhost:9000` |
| `MINIO_PUBLIC_ENDPOINT` | Endpoint công khai trả về cho mobile | `http://<IP-LAN>:9000` |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | Khóa truy cập MinIO | khớp `docker-compose.yml` |
| `MINIO_BUCKET` | Tên bucket | `mioto-images` |
| `MINIO_REGION` | Region | `us-east-1` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Có trong `.env.example` nhưng **backend chưa dùng**; Mia hiện gọi Gemini trực tiếp từ app | `gemini-3-flash-preview` |

> `backend/.env.example` hiện **chưa có** các biến `MINIO_*` (file `.env` thật thì có). Cần tự thêm vào `.env`, nếu không upload ảnh (KYC, ảnh xe, avatar) sẽ lỗi.

### Mobile (`mobile/app.json` → `expo.extra`)

| Khóa | Mô tả |
|---|---|
| `apiUrl` | URL API backend, ví dụ `http://192.168.1.10:3000/api` |
| `geminiApiKey` | API key Google Gemini cho chatbot Mia |

Thư mục `backend/uploads/` (avatars, kyc, vehicles) là thư mục cũ, hiện ảnh được lưu trên MinIO.

---

## 👤 Tài khoản demo

Sau khi chạy `npm run seed`, mật khẩu của **mọi tài khoản là `123456`**.

| Vai trò | Số điện thoại | Họ tên | Ghi chú |
|---|---|---|---|
| Admin | `0900000000` | Admin Mioto | Duyệt xe và KYC |
| Host | `0900000001` | Nguyễn Văn Hùng | 8 xe, nhiều đơn thuê và hội thoại |
| Renter | `0900000002` | Trần Thị Lan | KYC đã duyệt, 6 đơn, 320 điểm thưởng |
| Host 2 | `0900000003` | Trần Minh Tuấn | Đã chặn một khách |
| Renter | `0900000005` | Lê Văn Bình | |
| Renter | `0900000006` | Nguyễn Thị Mai | Bị host 2 chặn |
| Renter | `0900000014` / `0900000015` | Nguyễn Minh Tùng / Đỗ Thị Linh | KYC đang chờ duyệt |

**Voucher mẫu:** `WELCOME100K` (giảm 100.000đ, đơn từ 500K), `SUMMER20` (giảm 20%, tối đa 300K, đơn từ 1 triệu), `VIP500K` (giảm 500.000đ, đơn từ 3 triệu), `EXPIRED10` (đã hết hạn, để test).

Dữ liệu seed còn có 3 xe đang chờ duyệt (BMW 320i, Mercedes GLC, Kia EV6) để demo chức năng của admin.

---

## 🔄 Quy trình nghiệp vụ

### Vòng đời đơn thuê (`BookingStatus`)

```
pending_payment ──(thanh toán OTP + host xác nhận)──► confirmed
confirmed ──(host bàn giao xe + ảnh)──► host_handover
host_handover ──(khách xác nhận nhận xe + ảnh)──► in_progress
in_progress ──(khách trả xe + ảnh)──► renter_return
renter_return ──(host xác nhận nhận lại xe + ảnh)──► completed

pending_payment | confirmed ──(khách hủy / host từ chối)──► cancelled
```

Mỗi bước chuyển trạng thái đều gửi **thông báo** cho bên còn lại. Ảnh bàn giao / nhận / trả được lưu làm bằng chứng.

### Quy tắc đặt xe
- Khách phải có **KYC đã được duyệt**.
- Xe phải ở trạng thái `approved` và đang `isAvailable`; không được tự đặt xe của mình; không được đặt xe của chủ xe đã chặn mình.
- **Chống trùng lịch:** từ chối nếu có đơn `pending_payment` / `confirmed` / `in_progress` chồng khoảng thời gian.
- Số ngày thuê **làm tròn lên** (thuê dưới 24 giờ vẫn tính 1 ngày).
- Toàn bộ quá trình tạo đơn chạy trong **một transaction** để đảm bảo nhất quán.

### Tính tiền

```
subtotal       = số_ngày × giá_mỗi_ngày
giảm_điểm      = min(điểm_dùng × 1.000đ, 30% × subtotal)
giảm_voucher   = percent: min(subtotal × %, maxDiscount) | fixed: min(giá_trị, subtotal)
totalAmount    = max(0, subtotal − giảm_điểm − giảm_voucher)
```

### Điểm thưởng
- **Tích điểm:** 1 điểm cho mỗi 10.000đ của tổng đơn, cộng ngay khi đặt.
- **Dùng điểm:** 1 điểm = 1.000đ, giảm tối đa 30% giá trị đơn.
- **Giới thiệu:** người giới thiệu nhận 50 điểm khi có người đăng ký bằng mã của họ.
- Mọi biến động được ghi vào lịch sử điểm (`point_histories`).

### Phí nền tảng
Mặc định **20%**, có thể đổi qua bảng `system_config` (khóa `platform_fee_rate`). Thống kê doanh thu của host hiển thị cả tổng gộp và số thực nhận sau phí.

### Duyệt xe
`draft` → (host gửi duyệt) `pending` → (admin) `approved` hoặc `rejected` (kèm lý do). Xe `inactive` không hiển thị.

---

## 🗄 Mô hình dữ liệu

Định nghĩa đầy đủ trong [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

| Bảng | Mô tả |
|---|---|
| `users` | Tài khoản (role: `renter` / `host` / `admin`), điểm thưởng, mã giới thiệu, push token |
| `kyc` | Hồ sơ GPLX (và CCCD tuỳ chọn), trạng thái duyệt |
| `vehicles`, `vehicle_images`, `features`, `vehicle_features` | Xe, ảnh, tiện nghi |
| `addresses` | Địa chỉ kèm tọa độ |
| `bookings` | Đơn thuê, giá, giảm giá, trạng thái, ảnh bàn giao / trả xe, OTP |
| `payment_cards` | Thẻ (chỉ lưu 4 số cuối, thương hiệu, hạn) |
| `reviews`, `host_reviews` | Đánh giá hai chiều (khách → xe, chủ xe → khách) |
| `favorites` | Xe yêu thích |
| `conversations`, `messages` | Hội thoại giữa khách và chủ xe |
| `notifications` | Thông báo |
| `point_histories` | Lịch sử điểm thưởng |
| `vouchers` | Mã giảm giá |
| `blocked_renters` | Danh sách khách bị host chặn |
| `system_config` | Cấu hình hệ thống dạng key-value |

> `mioto_schema.sql` (nạp tự động khi Postgres khởi tạo) là phiên bản SQL ban đầu, có một số bảng khác với Prisma schema (ví dụ `promotions`, `payments`, `rewards`, `referrals`). Prisma schema là nguồn chuẩn cho backend; chạy `npx prisma db push` để đồng bộ.

---

## 📡 API

Base URL: `http://<host>:3000/api`. Các route yêu cầu đăng nhập dùng header `Authorization: Bearer <accessToken>`. Rate limit: 100 request / phút / IP.

| Nhóm | Prefix | Endpoint chính |
|---|---|---|
| Hệ thống | | `GET /api/health` |
| Xác thực | `/auth` | `POST /register`, `POST /login`, `POST /refresh`, `GET /me`, `PUT /profile`, `PUT /avatar`, `PUT /change-password`, `PUT /push-token`, `POST /logout`, `DELETE /account` |
| Xe | `/vehicles` | `GET /search`, `GET /features`, `GET /mine`, `GET /:id`, `GET /:id/booked-dates`, `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/availability`, `POST /:id/submit`, `POST /:id/images`, `DELETE /:id/images/:imageId` |
| Đơn thuê | `/bookings` | `POST /`, `GET /`, `GET /:id`, `PATCH /:id/confirm-payment`, `PATCH /:id/cancel`, `GET /host`, `GET /host/stats`, `PATCH /:id/host-confirm`, `host-reject`, `host-handover`, `renter-received`, `renter-return`, `host-received` |
| KYC | `/kyc` | gửi hồ sơ, xem hồ sơ của tôi |
| Thẻ | `/cards` | `GET /`, `POST /`, `DELETE /:id`, `PATCH /:id/default` |
| Đánh giá | `/reviews` | `POST /`, `GET /vehicle/:vehicleId` |
| Thông báo | `/notifications` | `GET /`, `PATCH /:id/read`, `PATCH /read-all` |
| Yêu thích | `/favorites` | `GET /`, `GET /:vehicleId/check`, `POST /:vehicleId` (bật / tắt) |
| Địa chỉ | `/addresses` | CRUD, `PATCH /:id/default` |
| Điểm | `/points` | số dư và lịch sử |
| Voucher | `/vouchers` | `GET /check` kiểm tra mã |
| Hội thoại | `/conversations` | `GET /`, `POST /`, `GET /:id/messages`, `POST /:id/messages` |
| Chatbot | `/chat` | `POST /mia` |
| Host | `/host` | đánh giá khách (`POST /reviews`, `GET /renter-reviews/:renterId`), chặn khách (`/blocked`), lịch (`/calendar`, `/vehicle-calendar/:vehicleId`) |
| Admin | `/admin` | `/kyc`, `/vehicles`, `/users`, `/vouchers`, `/stats`, `/dashboard`, `/config`, `/delete-requests` |

---

## 🔒 Bảo mật

- Mật khẩu băm bằng **bcrypt**; token lưu trên thiết bị bằng **`expo-secure-store`**.
- Access token sống ngắn (15 phút) kèm refresh token (30 ngày); mobile tự refresh khi gặp 401.
- Tài khoản bị khóa nhận mã lỗi `ACCOUNT_DISABLED`, app tự đăng xuất.
- `helmet` bảo vệ HTTP header, `express-rate-limit` chống spam, **Zod** kiểm tra dữ liệu đầu vào.
- Upload ảnh: chỉ nhận JPEG / PNG / WebP / HEIC, tối đa 10MB / ảnh, xử lý trong RAM rồi nén WebP.
- Không lưu số thẻ đầy đủ, chỉ lưu 4 số cuối.

---

## ⚠️ Lưu ý & hạn chế

Đây là dự án học tập / demo, một số phần chưa sẵn sàng cho production:

- **Thanh toán là giả lập:** mã OTP cố định `000000`, không tích hợp cổng thanh toán thật.
- **Khóa API đang nằm trong `mobile/app.json`** (Google Maps, Gemini) và được commit lên repo. Nên **thu hồi và tạo lại key**, đặt giới hạn theo ứng dụng, rồi dùng biến môi trường / EAS secrets. Gọi Gemini nên đi qua backend (endpoint `/api/chat/mia` đã có sẵn) thay vì gọi trực tiếp từ app.
- Mật khẩu mặc định trong `docker-compose.yml` và `.env.example` chỉ dùng cho phát triển; đổi hết khi triển khai.
- `CORS_ORIGIN=*` nên giới hạn lại ở production.
- `apiUrl` trong `app.json` đang là IP LAN cố định, cần đổi theo máy của bạn.
- Chưa có kiểm thử tự động.
- `docker-compose.yml` chưa chứa service backend; backend chạy riêng bằng Node.

---

## 📄 Giấy phép

Chưa khai báo giấy phép. Hãy thêm file `LICENSE` nếu muốn công khai dự án.
