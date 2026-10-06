-- Adds optional sample photos for jobs (max 5 per job, enforced by the API).
-- New databases get this from schema.sql; run database/migrate.sh on an existing one.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sidejob;

CREATE TABLE IF NOT EXISTS job_images (
  id          INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  job_id      INT UNSIGNED      NOT NULL,
  file_name   VARCHAR(100)      NOT NULL,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_job_images_job (job_id, sort_order),
  CONSTRAINT fk_job_images_job FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB;
