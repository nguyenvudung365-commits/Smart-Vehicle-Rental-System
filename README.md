# 🚗 Mioto Clone

Đồ án môn **Phát triển ứng dụng đa nền tảng** - Clone các tính năng cốt lõi của app thuê xe [Mioto](https://mioto.vn).

**GVHD**: ThS. Lê Văn Minh
**Trưởng nhóm**: Nguyễn Vũ Dũng (MSSV 0205968)

## 🛠️ Công nghệ

- **Mobile**: React Native + Expo SDK 54 + Expo Router
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: PostgreSQL 16 (Docker)
- **Auth**: JWT + bcrypt

## 📱 Demo

**Tài khoản test**: `0900000001` / `123456` (chủ xe)

## 🚀 Cài đặt nhanh

### Yêu cầu
- Docker Desktop
- Node.js 20+
- Expo Go trên điện thoại (Android/iOS)

### Các bước

**1. Clone repo**
```bash
git clone https://github.com/<your-username>/mioto-clone.git
cd mioto-clone
```

**2. Khởi động database**
```bash
docker compose up -d
```

**3. Cài backend**
```bash
cd backend
npm install
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
npx prisma generate
node prisma/seed.js
npm run dev
```

Server chạy tại: http://localhost:3000

**4. Cài mobile (mở CMD mới)**
```bash
cd mobile
npm install --legacy-peer-deps
npx expo start -c
```

Scan QR bằng Expo Go.

### Lưu ý

- **Thiết bị thật**: Sửa `apiUrl` trong `mobile/app.json` thành `http://<IP-máy>:3000/api`
- **Android Emulator**: Dùng `http://10.0.2.2:3000/api`
- **Windows Firewall**: Mở port 3000 bằng PowerShell admin:
  ```powershell
  New-NetFirewallRule -DisplayName "Mioto Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
  ```

## 📊 Tính năng đã có (Buổi 4)

| Mã | Chức năng | Trạng thái |
|---|---|---|
| FR-01 | Đăng ký tài khoản | ✅ |
| FR-02 | Đăng nhập / Đăng xuất + JWT refresh | ✅ |
| FR-04 | Tìm kiếm xe | ✅ |
| FR-05 | Bộ lọc nâng cao | ✅ |
| FR-06 | Xem chi tiết xe | ✅ |

## 📁 Cấu trúc dự án

```
mioto-clone/
├── backend/          # Node.js + Express API
├── mobile/           # React Native app
├── docker-compose.yml
├── mioto_schema.sql  # PostgreSQL schema (22 tables)
└── README.md
```

## 👥 Nhóm phát triển

| Thành viên | Vai trò |
|---|---|
| Nguyễn Vũ Dũng (0205968) | Trưởng nhóm - Backend & DevOps |
| [Tên SV 2] ([MSSV]) | Mobile Developer |
| [Tên SV 3] ([MSSV]) | UI/UX & Tester |

## 📄 License

This project is for educational purposes only.
