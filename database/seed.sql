-- Base data required for the app to run.
-- Demo shops / jobs for presentation are added in Phase 8.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sidejob;

INSERT INTO categories (name, icon, sort_order) VALUES
  ('ร้านอาหาร / คาเฟ่',       'restaurant-outline', 10),
  ('ขายของหน้าร้าน',           'storefront-outline', 20),
  ('ส่งของ / ขับรถ',           'bicycle-outline',    30),
  ('อีเวนต์ / พีซี / โปรโมชัน', 'megaphone-outline',  40),
  ('คลังสินค้า / แพ็กของ',     'cube-outline',       50),
  ('ทำความสะอาด',             'sparkles-outline',   60),
  ('ติวเตอร์ / สอนพิเศษ',      'school-outline',     70),
  ('งานออฟฟิศ / ธุรการ',       'briefcase-outline',  80),
  ('ออนไลน์ / ฟรีแลนซ์',       'laptop-outline',     90),
  ('อื่น ๆ',                  'ellipsis-horizontal-outline', 999);

-- Admin account (email/password login only).
-- DEV password: Admin@1234  -> change it before any real deployment.
INSERT INTO users (email, password_hash, role, status, profile_completed, pdpa_accepted_at) VALUES
  ('admin@sidejob.local', '$2a$10$yB7M4jf05igPaH9/ALKFdupMHrsLzl4NYEkL0v94TNs9Azwf6/OO2', 'admin', 'active', 1, NOW());
