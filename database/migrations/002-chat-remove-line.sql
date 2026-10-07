-- 1) Removes LINE ID (contact now goes through phone + in-app chat)
-- 2) Adds chat: one conversation per accepted application, text or image messages
-- New databases get this from schema.sql; run database/migrate.sh on an existing one. Safe to run again.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sidejob;

-- MySQL has no DROP COLUMN IF EXISTS, so check information_schema first
SET @sql := (SELECT IF(COUNT(*) > 0, 'ALTER TABLE seeker_profiles DROP COLUMN line_id', 'DO 0')
             FROM information_schema.columns
             WHERE table_schema = 'sidejob' AND table_name = 'seeker_profiles' AND column_name = 'line_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) > 0, 'ALTER TABLE shops DROP COLUMN line_id', 'DO 0')
             FROM information_schema.columns
             WHERE table_schema = 'sidejob' AND table_name = 'shops' AND column_name = 'line_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS conversations (
  id                   INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  application_id       INT UNSIGNED    NOT NULL,
  seeker_user_id       INT UNSIGNED    NOT NULL,
  shop_user_id         INT UNSIGNED    NOT NULL,
  last_message_id      BIGINT UNSIGNED NULL,
  last_message_at      DATETIME        NULL,
  seeker_last_read_id  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  shop_last_read_id    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_conversations_application (application_id),
  KEY idx_conversations_seeker (seeker_user_id, last_message_at),
  KEY idx_conversations_shop (shop_user_id, last_message_at),
  CONSTRAINT fk_conversations_application FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE,
  CONSTRAINT fk_conversations_seeker      FOREIGN KEY (seeker_user_id) REFERENCES users (id),
  CONSTRAINT fk_conversations_shop        FOREIGN KEY (shop_user_id)   REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chat_messages (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id  INT UNSIGNED    NOT NULL,
  sender_user_id   INT UNSIGNED    NOT NULL,
  body             TEXT            NULL,
  image_file       VARCHAR(100)    NULL,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_messages_conversation (conversation_id, id),
  CONSTRAINT fk_chat_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_messages_sender       FOREIGN KEY (sender_user_id)  REFERENCES users (id),
  CONSTRAINT chk_chat_messages_content     CHECK (body IS NOT NULL OR image_file IS NOT NULL)
) ENGINE=InnoDB;

-- Applications accepted before chat existed get their conversation now
INSERT IGNORE INTO conversations (application_id, seeker_user_id, shop_user_id, created_at)
SELECT a.id, a.seeker_user_id, s.owner_user_id, COALESCE(a.decided_at, NOW())
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN shops s ON s.id = j.shop_id
WHERE a.status IN ('accepted', 'completed');
