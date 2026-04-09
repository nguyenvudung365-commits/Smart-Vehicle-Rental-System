-- =====================================================================
-- MIOTO CLONE - PostgreSQL Database Schema
-- Môn: Phát triển ứng dụng đa nền tảng
-- Stack: React Native (Expo) + Node.js + PostgreSQL
-- =====================================================================

-- Extension cho UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables (theo thứ tự ngược FK) để có thể chạy lại nhiều lần
DROP TABLE IF EXISTS referral_usages CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS redemptions CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS point_history CASCADE;
DROP TABLE IF EXISTS loyalty_points CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payment_cards CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS vehicle_features CASCADE;
DROP TABLE IF EXISTS features CASCADE;
DROP TABLE IF EXISTS vehicle_images CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS kyc CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop ENUM types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS kyc_status CASCADE;
DROP TYPE IF EXISTS transmission_type CASCADE;
DROP TYPE IF EXISTS fuel_type CASCADE;
DROP TYPE IF EXISTS vehicle_status CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS cancelled_by_type CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS card_brand CASCADE;
DROP TYPE IF EXISTS discount_type CASCADE;
DROP TYPE IF EXISTS review_direction CASCADE;
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS point_type CASCADE;
DROP TYPE IF EXISTS redemption_status CASCADE;

-- =====================================================================
-- ENUM TYPES
-- =====================================================================

CREATE TYPE user_role          AS ENUM ('renter', 'host', 'admin');
CREATE TYPE kyc_status         AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE transmission_type  AS ENUM ('manual', 'automatic');
CREATE TYPE fuel_type          AS ENUM ('gasoline', 'diesel', 'electric', 'hybrid');
CREATE TYPE vehicle_status     AS ENUM ('draft', 'pending', 'approved', 'rejected', 'inactive');
CREATE TYPE booking_status     AS ENUM ('pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE cancelled_by_type  AS ENUM ('renter', 'host', 'system');
CREATE TYPE payment_status     AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE card_brand         AS ENUM ('visa', 'mastercard', 'jcb', 'amex');
CREATE TYPE discount_type      AS ENUM ('percent', 'fixed');
CREATE TYPE review_direction   AS ENUM ('renter_to_host', 'host_to_renter');
CREATE TYPE message_type       AS ENUM ('text', 'image', 'system');
CREATE TYPE notification_type  AS ENUM ('booking', 'kyc', 'message', 'vehicle', 'promotion', 'system');
CREATE TYPE point_type         AS ENUM ('earn_booking', 'earn_referral', 'redeem', 'expired');
CREATE TYPE redemption_status  AS ENUM ('active', 'used', 'expired');

-- =====================================================================
-- 1. PHÂN HỆ XÁC THỰC
-- =====================================================================

-- Bảng USERS - Người dùng (Khách thuê, Chủ xe, Admin)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(15)  NOT NULL UNIQUE,
    email           VARCHAR(100) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    avatar_url      VARCHAR(255),
    birthday        DATE,
    role            user_role    NOT NULL DEFAULT 'renter',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Tài khoản hệ thống: khách thuê, chủ xe, admin';

-- Bảng KYC - Xác thực giấy phép lái xe
CREATE TABLE kyc (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license_number      VARCHAR(20)  NOT NULL,
    full_name           VARCHAR(100) NOT NULL,
    dob                 DATE,
    front_image_url     VARCHAR(500) NOT NULL,
    front_image_key     VARCHAR(255) NOT NULL,
    back_image_url      VARCHAR(500) NOT NULL,
    back_image_key      VARCHAR(255) NOT NULL,
    status              kyc_status   NOT NULL DEFAULT 'pending',
    reject_reason       TEXT,
    submitted_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    reviewed_at         TIMESTAMP
);

COMMENT ON TABLE kyc IS 'Xác thực giấy phép lái xe của khách thuê';

-- =====================================================================
-- 2. PHÂN HỆ ĐỊA CHỈ & XE
-- =====================================================================

-- Bảng ADDRESSES - Địa chỉ
CREATE TABLE addresses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label       VARCHAR(50),
    province    VARCHAR(50)  NOT NULL,
    district    VARCHAR(50)  NOT NULL,
    ward        VARCHAR(50)  NOT NULL,
    detail      VARCHAR(255),
    latitude    DECIMAL(10, 7),
    longitude   DECIMAL(10, 7),
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE addresses IS 'Địa chỉ của user và vị trí xe';

-- Bảng VEHICLES - Xe cho thuê
CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    address_id      UUID NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
    brand           VARCHAR(50)       NOT NULL,
    model           VARCHAR(100)      NOT NULL,
    year            INT               NOT NULL,
    transmission    transmission_type NOT NULL,
    fuel_type       fuel_type         NOT NULL,
    seats           INT               NOT NULL,
    license_plate   VARCHAR(15)       NOT NULL UNIQUE,
    price_per_day   DECIMAL(12, 2)    NOT NULL,
    description     TEXT,
    status          vehicle_status    NOT NULL DEFAULT 'pending',
    reject_reason   TEXT,
    is_available    BOOLEAN           NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP         NOT NULL DEFAULT NOW(),
    approved_at     TIMESTAMP,
    CONSTRAINT chk_year_valid  CHECK (year BETWEEN 1990 AND EXTRACT(YEAR FROM NOW()) + 1),
    CONSTRAINT chk_seats_valid CHECK (seats BETWEEN 2 AND 50),
    CONSTRAINT chk_price_positive CHECK (price_per_day > 0)
);

COMMENT ON TABLE vehicles IS 'Xe do chủ xe đăng ký, phải được admin duyệt';

-- Bảng VEHICLE_IMAGES - Ảnh xe
CREATE TABLE vehicle_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    image_url       VARCHAR(500) NOT NULL,
    storage_key     VARCHAR(255),
    is_cover        BOOLEAN      NOT NULL DEFAULT FALSE,
    display_order   INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE vehicle_images IS 'Ảnh xe (3-10 ảnh/xe), 1 ảnh đánh dấu là bìa';

-- Đảm bảo mỗi xe chỉ có 1 ảnh bìa
CREATE UNIQUE INDEX idx_vehicle_one_cover
    ON vehicle_images (vehicle_id) WHERE is_cover = TRUE;

-- Bảng FEATURES - Danh mục tính năng
CREATE TABLE features (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    icon        VARCHAR(100),
    category    VARCHAR(50)
);

COMMENT ON TABLE features IS 'Danh mục tính năng xe (Bluetooth, Camera lùi, GPS...)';

-- Bảng VEHICLE_FEATURES - Bảng nối N-N
CREATE TABLE vehicle_features (
    vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    feature_id  UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    PRIMARY KEY (vehicle_id, feature_id)
);

-- =====================================================================
-- 3. PHÂN HỆ ĐẶT XE & THANH TOÁN
-- =====================================================================

-- Bảng PROMOTIONS - Mã khuyến mãi
CREATE TABLE promotions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(20)    NOT NULL UNIQUE,
    title               VARCHAR(100)   NOT NULL,
    discount_type       discount_type  NOT NULL,
    discount_value      DECIMAL(12, 2) NOT NULL,
    max_discount        DECIMAL(12, 2),
    min_order_value     DECIMAL(12, 2),
    valid_from          TIMESTAMP      NOT NULL,
    valid_to            TIMESTAMP      NOT NULL,
    usage_limit         INT,
    used_count          INT            NOT NULL DEFAULT 0,
    is_active           BOOLEAN        NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_promo_dates CHECK (valid_to > valid_from),
    CONSTRAINT chk_discount_positive CHECK (discount_value > 0)
);

COMMENT ON TABLE promotions IS 'Mã khuyến mãi do admin tạo';

-- Bảng PAYMENT_CARDS - Thẻ thanh toán (chỉ lưu metadata)
CREATE TABLE payment_cards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_brand      card_brand   NOT NULL,
    last4           VARCHAR(4)   NOT NULL,
    holder_name     VARCHAR(100) NOT NULL,
    expiry_month    INT          NOT NULL,
    expiry_year     INT          NOT NULL,
    is_default      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_last4_format CHECK (last4 ~ '^[0-9]{4}$'),
    CONSTRAINT chk_expiry_month CHECK (expiry_month BETWEEN 1 AND 12),
    CONSTRAINT chk_expiry_year  CHECK (expiry_year >= 2024)
);

COMMENT ON TABLE payment_cards IS 'Thẻ thanh toán: chỉ lưu 4 số cuối, không lưu số thẻ đầy đủ';

-- Đảm bảo mỗi user chỉ có 1 thẻ default
CREATE UNIQUE INDEX idx_user_default_card
    ON payment_cards (user_id) WHERE is_default = TRUE;

-- Bảng BOOKINGS - Đơn đặt xe
CREATE TABLE bookings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    renter_id           UUID            NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    vehicle_id          UUID            NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    promotion_id        UUID            REFERENCES promotions(id) ON DELETE SET NULL,
    pickup_address_id   UUID            REFERENCES addresses(id) ON DELETE SET NULL,
    start_date          TIMESTAMP       NOT NULL,
    end_date            TIMESTAMP       NOT NULL,
    actual_start        TIMESTAMP,
    actual_end          TIMESTAMP,
    rental_days         INT             NOT NULL,
    price_per_day       DECIMAL(12, 2)  NOT NULL,
    subtotal            DECIMAL(12, 2)  NOT NULL,
    discount_amount     DECIMAL(12, 2)  NOT NULL DEFAULT 0,
    total_amount        DECIMAL(12, 2)  NOT NULL,
    status              booking_status  NOT NULL DEFAULT 'pending_payment',
    cancel_reason       TEXT,
    cancelled_by        cancelled_by_type,
    card_last4          VARCHAR(4),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    confirmed_at        TIMESTAMP,
    CONSTRAINT chk_booking_dates  CHECK (end_date > start_date),
    CONSTRAINT chk_rental_days    CHECK (rental_days > 0),
    CONSTRAINT chk_total_positive CHECK (total_amount >= 0)
);

COMMENT ON TABLE bookings IS 'Đơn đặt xe của khách thuê';

-- Bảng PAYMENTS - Thanh toán (1-1 với booking)
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID            NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    card_id         UUID            REFERENCES payment_cards(id) ON DELETE SET NULL,
    amount          DECIMAL(12, 2)  NOT NULL,
    status          payment_status  NOT NULL DEFAULT 'pending',
    transaction_ref VARCHAR(100),
    paid_at         TIMESTAMP,
    refunded_at     TIMESTAMP
);

COMMENT ON TABLE payments IS 'Thanh toán cho booking (chỉ lưu metadata, không tích hợp cổng thật)';

-- =====================================================================
-- 4. PHÂN HỆ ĐÁNH GIÁ & YÊU THÍCH
-- =====================================================================

-- Bảng REVIEWS - Đánh giá 2 chiều
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID              NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reviewer_id     UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id      UUID              REFERENCES vehicles(id) ON DELETE CASCADE,
    target_user_id  UUID              REFERENCES users(id) ON DELETE CASCADE,
    direction       review_direction  NOT NULL,
    rating          INT               NOT NULL,
    tags            VARCHAR(255),
    comment         TEXT,
    created_at      TIMESTAMP         NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT uniq_review_per_direction UNIQUE (booking_id, direction)
);

COMMENT ON TABLE reviews IS 'Đánh giá 2 chiều: khách-chủ xe và ngược lại';

-- Bảng FAVORITES - Xe yêu thích (N-N)
CREATE TABLE favorites (
    user_id     UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id  UUID      NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, vehicle_id)
);

-- =====================================================================
-- 5. PHÂN HỆ CHAT & THÔNG BÁO
-- =====================================================================

-- Bảng CONVERSATIONS - Hội thoại chat
CREATE TABLE conversations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    renter_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id          UUID         NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    last_message        VARCHAR(255),
    last_message_at     TIMESTAMP,
    renter_unread       INT          NOT NULL DEFAULT 0,
    host_unread         INT          NOT NULL DEFAULT 0,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uniq_conversation UNIQUE (renter_id, host_id, vehicle_id)
);

-- Bảng MESSAGES - Tin nhắn
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT         NOT NULL,
    message_type    message_type NOT NULL DEFAULT 'text',
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Bảng NOTIFICATIONS - Thông báo trong app
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200)      NOT NULL,
    body            TEXT              NOT NULL,
    type            notification_type NOT NULL,
    reference_id    UUID,
    is_read         BOOLEAN           NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP         NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 6. PHÂN HỆ LOYALTY & REFERRAL
-- =====================================================================

-- Bảng LOYALTY_POINTS - Ví điểm
CREATE TABLE loyalty_points (
    user_id             UUID      PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance             INT       NOT NULL DEFAULT 0,
    lifetime_earned     INT       NOT NULL DEFAULT 0,
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_balance_non_negative CHECK (balance >= 0)
);

-- Bảng POINT_HISTORY - Lịch sử biến động điểm
CREATE TABLE point_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          INT          NOT NULL,
    type            point_type   NOT NULL,
    description     VARCHAR(255),
    reference_id    UUID,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Bảng REWARDS - Catalog quà tặng
CREATE TABLE rewards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    image_url       VARCHAR(255),
    point_cost      INT          NOT NULL,
    category        VARCHAR(50),
    stock           INT          NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_point_cost_positive CHECK (point_cost > 0),
    CONSTRAINT chk_stock_non_negative CHECK (stock >= 0)
);

-- Bảng REDEMPTIONS - Lịch sử đổi quà
CREATE TABLE redemptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id       UUID                NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
    point_cost      INT                 NOT NULL,
    voucher_code    VARCHAR(50)         NOT NULL UNIQUE,
    status          redemption_status   NOT NULL DEFAULT 'active',
    expires_at      TIMESTAMP,
    redeemed_at     TIMESTAMP           NOT NULL DEFAULT NOW(),
    used_at         TIMESTAMP
);

-- Bảng REFERRALS - Mã giới thiệu của user
CREATE TABLE referrals (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id             UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code                    VARCHAR(20)  NOT NULL UNIQUE,
    total_signups           INT          NOT NULL DEFAULT 0,
    total_points_earned     INT          NOT NULL DEFAULT 0,
    created_at              TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Bảng REFERRAL_USAGES - Lịch sử sử dụng mã giới thiệu
CREATE TABLE referral_usages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id         UUID         NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    referred_user_id    UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    points_awarded      INT          NOT NULL DEFAULT 0,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- INDEXES - Tối ưu truy vấn
-- =====================================================================

-- Users
CREATE INDEX idx_users_role            ON users(role);
CREATE INDEX idx_users_created_at      ON users(created_at DESC);

-- Vehicles
CREATE INDEX idx_vehicles_status       ON vehicles(status, is_available);
CREATE INDEX idx_vehicles_owner        ON vehicles(owner_id);
CREATE INDEX idx_vehicles_address      ON vehicles(address_id);
CREATE INDEX idx_vehicles_price        ON vehicles(price_per_day);
CREATE INDEX idx_vehicles_brand_model  ON vehicles(brand, model);

-- Bookings
CREATE INDEX idx_bookings_renter         ON bookings(renter_id, status);
CREATE INDEX idx_bookings_vehicle_dates  ON bookings(vehicle_id, start_date, end_date);
CREATE INDEX idx_bookings_status         ON bookings(status);
CREATE INDEX idx_bookings_created_at     ON bookings(created_at DESC);

-- Payments
CREATE INDEX idx_payments_status       ON payments(status);

-- Reviews
CREATE INDEX idx_reviews_vehicle       ON reviews(vehicle_id);
CREATE INDEX idx_reviews_target_user   ON reviews(target_user_id);

-- Messages & Notifications
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_notifications_user    ON notifications(user_id, is_read, created_at DESC);

-- Conversations
CREATE INDEX idx_conversations_renter  ON conversations(renter_id, last_message_at DESC);
CREATE INDEX idx_conversations_host    ON conversations(host_id, last_message_at DESC);

-- KYC
CREATE INDEX idx_kyc_status            ON kyc(status);

-- Loyalty
CREATE INDEX idx_point_history_user    ON point_history(user_id, created_at DESC);
CREATE INDEX idx_redemptions_user      ON redemptions(user_id, status);

-- =====================================================================
-- TRIGGERS - Tự động cập nhật updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- =====================================================================
-- SEED DATA - Dữ liệu mẫu cho features (tùy chọn)
-- =====================================================================

INSERT INTO features (name, icon, category) VALUES
    ('Bluetooth',           'bluetooth',     'entertainment'),
    ('Camera lùi',          'camera',        'safety'),
    ('Cảm biến lùi',        'sensor',        'safety'),
    ('GPS',                 'gps',           'safety'),
    ('Cảm biến va chạm',    'collision',     'safety'),
    ('Túi khí an toàn',     'airbag',        'safety'),
    ('Khe cắm USB',         'usb',           'entertainment'),
    ('Màn hình DVD',        'dvd',           'entertainment'),
    ('Camera hành trình',   'dashcam',       'safety'),
    ('ETC',                 'etc',           'comfort'),
    ('Lốp dự phòng',        'tire',          'comfort'),
    ('Định vị GPS',         'navigation',    'comfort');

-- =====================================================================
-- HOÀN TẤT
-- =====================================================================
-- Tổng cộng: 22 bảng, 15 ENUM types, 18+ indexes
-- Để xem ERD: dùng pgAdmin (Tools → ERD Tool) hoặc DBeaver (View Diagram)
-- =====================================================================
