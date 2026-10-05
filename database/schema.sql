-- SideJob database schema
-- Charset utf8mb4 / utf8mb4_unicode_ci, timezone +07:00 (set on the MySQL server)

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+07:00';

CREATE DATABASE IF NOT EXISTS sidejob
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sidejob;

-- ---------------------------------------------------------------------------
-- Geography (imported from database/thai-geo, read-only for the app)
-- ---------------------------------------------------------------------------

CREATE TABLE regions (
  id       TINYINT UNSIGNED NOT NULL,
  name_th  VARCHAR(100)     NOT NULL,
  name_en  VARCHAR(100)     NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE provinces (
  id         SMALLINT UNSIGNED NOT NULL,
  region_id  TINYINT UNSIGNED  NOT NULL,
  name_th    VARCHAR(100)      NOT NULL,
  name_en    VARCHAR(100)      NOT NULL,
  PRIMARY KEY (id),
  KEY idx_provinces_region (region_id),
  CONSTRAINT fk_provinces_region FOREIGN KEY (region_id) REFERENCES regions (id)
) ENGINE=InnoDB;

-- Bangkok (province_id = 1) districts are "เขต", all others are "อำเภอ"
CREATE TABLE districts (
  id           SMALLINT UNSIGNED NOT NULL,
  province_id  SMALLINT UNSIGNED NOT NULL,
  name_th      VARCHAR(100)      NOT NULL,
  name_en      VARCHAR(100)      NOT NULL,
  PRIMARY KEY (id),
  KEY idx_districts_province (province_id),
  CONSTRAINT fk_districts_province FOREIGN KEY (province_id) REFERENCES provinces (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Users and profiles
-- ---------------------------------------------------------------------------

-- Login only. role is NULL until the user picks one during onboarding.
CREATE TABLE users (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email              VARCHAR(255) NOT NULL,
  password_hash      VARCHAR(255) NULL,          -- NULL for Google-only accounts
  google_id          VARCHAR(64)  NULL,
  role               ENUM('seeker', 'shop', 'admin') NULL,
  status             ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  profile_completed  TINYINT(1)   NOT NULL DEFAULT 0,
  pdpa_accepted_at   DATETIME     NULL,          -- NULL = not accepted yet
  last_login_at      DATETIME     NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),             -- case-insensitive via collation
  UNIQUE KEY uq_users_google_id (google_id),
  KEY idx_users_role_status (role, status, created_at)
) ENGINE=InnoDB;

CREATE TABLE seeker_profiles (
  user_id      INT UNSIGNED NOT NULL,
  full_name    VARCHAR(150) NOT NULL,
  birth_date   DATE         NULL,
  phone        VARCHAR(20)  NULL,
  line_id      VARCHAR(50)  NULL,
  skills       VARCHAR(500) NULL,
  bio          TEXT         NULL,
  avatar_file  VARCHAR(100) NULL,                -- random file name in uploads/public
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_seeker_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Areas of interest. district_id NULL = whole province.
CREATE TABLE seeker_areas (
  id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED      NOT NULL,
  province_id  SMALLINT UNSIGNED NOT NULL,
  district_id  SMALLINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seeker_areas (user_id, province_id, district_id),
  CONSTRAINT fk_seeker_areas_user     FOREIGN KEY (user_id)     REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_seeker_areas_province FOREIGN KEY (province_id) REFERENCES provinces (id),
  CONSTRAINT fk_seeker_areas_district FOREIGN KEY (district_id) REFERENCES districts (id)
) ENGINE=InnoDB;

-- One shop per user. 'unsubmitted' = verification document not uploaded yet.
CREATE TABLE shops (
  id                   INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  owner_user_id        INT UNSIGNED      NOT NULL,
  name                 VARCHAR(150)      NOT NULL,
  description          TEXT              NULL,
  address              VARCHAR(500)      NOT NULL,
  province_id          SMALLINT UNSIGNED NOT NULL,
  district_id          SMALLINT UNSIGNED NOT NULL,
  phone                VARCHAR(20)       NULL,
  line_id              VARCHAR(50)       NULL,
  image_file           VARCHAR(100)      NULL,   -- uploads/public
  verify_doc_file      VARCHAR(100)      NULL,   -- uploads/private (admin API only)
  verify_status        ENUM('unsubmitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'unsubmitted',
  reject_reason        VARCHAR(500)      NULL,
  verify_submitted_at  DATETIME          NULL,
  verified_at          DATETIME          NULL,
  created_at           DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_shops_owner (owner_user_id),
  KEY idx_shops_verify (verify_status, verify_submitted_at),
  CONSTRAINT fk_shops_owner    FOREIGN KEY (owner_user_id) REFERENCES users (id),
  CONSTRAINT fk_shops_province FOREIGN KEY (province_id)   REFERENCES provinces (id),
  CONSTRAINT fk_shops_district FOREIGN KEY (district_id)   REFERENCES districts (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------

CREATE TABLE categories (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)      NOT NULL,
  icon        VARCHAR(50)       NULL,          -- ionicons name
  sort_order  SMALLINT          NOT NULL DEFAULT 0,
  is_active   TINYINT(1)        NOT NULL DEFAULT 1,
  created_at  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB;

-- Schedule supports two shapes:
--   'dates'  : one-off work between start_date and end_date
--   'weekly' : recurring on work_days
-- Both use start_time / end_time (end_time < start_time means an overnight shift).
CREATE TABLE jobs (
  id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  shop_id       INT UNSIGNED      NOT NULL,
  category_id   SMALLINT UNSIGNED NOT NULL,
  title         VARCHAR(150)      NOT NULL,
  description   TEXT              NOT NULL,
  province_id   SMALLINT UNSIGNED NOT NULL,
  district_id   SMALLINT UNSIGNED NOT NULL,
  wage          DECIMAL(10, 2)    NOT NULL,
  wage_unit     ENUM('hour', 'day', 'job') NOT NULL,
  schedule_type ENUM('dates', 'weekly')    NOT NULL,
  start_date    DATE              NULL,
  end_date      DATE              NULL,
  work_days     SET('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun') NULL,
  start_time    TIME              NOT NULL,
  end_time      TIME              NOT NULL,
  min_age       TINYINT UNSIGNED  NULL,
  expires_on    DATE              NOT NULL,     -- closed by the Scheduled flow after this date
  status        ENUM('open', 'closed', 'hidden') NOT NULL DEFAULT 'open',
  created_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_jobs_search   (status, province_id, district_id, created_at),
  KEY idx_jobs_category (status, category_id, created_at),
  KEY idx_jobs_expiry   (status, expires_on),
  KEY idx_jobs_shop     (shop_id, status, created_at),
  CONSTRAINT fk_jobs_shop     FOREIGN KEY (shop_id)     REFERENCES shops (id),
  CONSTRAINT fk_jobs_category FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT fk_jobs_province FOREIGN KEY (province_id) REFERENCES provinces (id),
  CONSTRAINT fk_jobs_district FOREIGN KEY (district_id) REFERENCES districts (id),
  CONSTRAINT chk_jobs_wage     CHECK (wage > 0),
  CONSTRAINT chk_jobs_schedule CHECK (
    (schedule_type = 'dates'  AND start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
    OR
    (schedule_type = 'weekly' AND work_days IS NOT NULL AND work_days <> '')
  )
) ENGINE=InnoDB;

CREATE TABLE saved_jobs (
  user_id     INT UNSIGNED NOT NULL,
  job_id      INT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, job_id),
  KEY idx_saved_jobs_user (user_id, created_at),
  CONSTRAINT fk_saved_jobs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_jobs_job  FOREIGN KEY (job_id)  REFERENCES jobs (id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- pending -> accepted -> completed, or rejected / cancelled.
-- Re-applying after 'cancelled' reuses the same row (back to 'pending').
CREATE TABLE applications (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id          INT UNSIGNED NOT NULL,
  seeker_user_id  INT UNSIGNED NOT NULL,
  status          ENUM('pending', 'accepted', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
  applied_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at      DATETIME     NULL,             -- accepted / rejected
  cancelled_at    DATETIME     NULL,
  completed_at    DATETIME     NULL,             -- starts the 14-day review window
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_applications_job_seeker (job_id, seeker_user_id),
  KEY idx_applications_job    (job_id, status, applied_at),
  KEY idx_applications_seeker (seeker_user_id, status, applied_at),
  CONSTRAINT fk_applications_job    FOREIGN KEY (job_id)         REFERENCES jobs (id),
  CONSTRAINT fk_applications_seeker FOREIGN KEY (seeker_user_id) REFERENCES users (id)
) ENGINE=InnoDB;

-- One review per side per application. Shop reviews target the shop owner's user id.
CREATE TABLE reviews (
  id                INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  application_id    INT UNSIGNED     NOT NULL,
  reviewer_user_id  INT UNSIGNED     NOT NULL,
  reviewee_user_id  INT UNSIGNED     NOT NULL,
  rating            TINYINT UNSIGNED NOT NULL,
  comment           TEXT             NULL,
  is_hidden         TINYINT(1)       NOT NULL DEFAULT 0,
  created_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_application_reviewer (application_id, reviewer_user_id),
  KEY idx_reviews_reviewee (reviewee_user_id, is_hidden, created_at),
  CONSTRAINT fk_reviews_application FOREIGN KEY (application_id)   REFERENCES applications (id),
  CONSTRAINT fk_reviews_reviewer    FOREIGN KEY (reviewer_user_id) REFERENCES users (id),
  CONSTRAINT fk_reviews_reviewee    FOREIGN KEY (reviewee_user_id) REFERENCES users (id),
  CONSTRAINT chk_reviews_rating     CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_reviews_not_self   CHECK (reviewer_user_id <> reviewee_user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Moderation, notifications, audit
-- ---------------------------------------------------------------------------

-- Polymorphic target (job or review): no FK, existence checked by the API.
CREATE TABLE reports (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_user_id  INT UNSIGNED NOT NULL,
  target_type       ENUM('job', 'review') NOT NULL,
  target_id         INT UNSIGNED NOT NULL,
  reason            VARCHAR(500) NOT NULL,
  status            ENUM('open', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
  resolved_by       INT UNSIGNED NULL,
  resolved_at       DATETIME     NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reports_reporter_target (reporter_user_id, target_type, target_id),
  KEY idx_reports_status (status, created_at),
  KEY idx_reports_target (target_type, target_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users (id),
  CONSTRAINT fk_reports_resolver FOREIGN KEY (resolved_by)      REFERENCES users (id)
) ENGINE=InnoDB;

-- type is a free string so new kinds (and FCM push later) need no schema change.
CREATE TABLE notifications (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NOT NULL,
  type        VARCHAR(50)     NOT NULL,
  message     VARCHAR(500)    NOT NULL,
  link        VARCHAR(255)    NULL,            -- in-app route, e.g. /shop/applicants/12
  is_read     TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Append-only: the app DB user gets SELECT/INSERT only on this table.
CREATE TABLE admin_logs (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id  INT UNSIGNED    NOT NULL,
  action         VARCHAR(50)     NOT NULL,     -- e.g. shop.verify, user.suspend, job.hide
  target_type    VARCHAR(30)     NOT NULL,     -- shop, user, job, report, review, category
  target_id      INT UNSIGNED    NOT NULL,
  reason         VARCHAR(500)    NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_logs_created (created_at),
  KEY idx_admin_logs_admin   (admin_user_id, created_at),
  KEY idx_admin_logs_action  (action, created_at),
  CONSTRAINT fk_admin_logs_admin FOREIGN KEY (admin_user_id) REFERENCES users (id)
) ENGINE=InnoDB;
