-- =========================================================
-- SMART CITY - Database Schema
-- =========================================================

DROP DATABASE IF EXISTS smart_city_db;
CREATE DATABASE smart_city_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_city_db;

CREATE TABLE users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  first_name      VARCHAR(50)  NOT NULL,
  last_name       VARCHAR(50)  NOT NULL,
  gender          ENUM('Male','Female','Other') DEFAULT NULL,
  mobile          VARCHAR(15)  DEFAULT NULL,
  username        VARCHAR(50)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  locality        VARCHAR(100) DEFAULT NULL,
  pincode         VARCHAR(10)  DEFAULT NULL,
  role            ENUM('citizen','admin') NOT NULL DEFAULT 'citizen',
  account_status  ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  last_login      DATETIME     DEFAULT NULL,
  last_seen       DATETIME     DEFAULT NULL,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_username (username),
  INDEX idx_users_last_seen (last_seen)
) ENGINE=InnoDB;

CREATE TABLE service_providers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  username        VARCHAR(50)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  category        ENUM('garbage','pothole','others','all') NOT NULL DEFAULT 'all',
  locality        VARCHAR(100) DEFAULT NULL,
  account_status  ENUM('active','inactive') NOT NULL DEFAULT 'active',
  last_login      DATETIME     DEFAULT NULL,
  last_seen       DATETIME     DEFAULT NULL,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_providers_username (username),
  INDEX idx_providers_status (account_status)
) ENGINE=InnoDB;

CREATE TABLE complaints (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id         VARCHAR(20)  NOT NULL UNIQUE,
  user_id              INT          NOT NULL,
  category             ENUM('garbage','pothole','others') NOT NULL,
  title                VARCHAR(150) NOT NULL,
  description          TEXT,
  image_path           VARCHAR(255) DEFAULT NULL,
  location             VARCHAR(150) DEFAULT NULL,
  locality             VARCHAR(100) DEFAULT NULL,
  pincode              VARCHAR(10)  DEFAULT NULL,
  nearby_address       VARCHAR(255) DEFAULT NULL,
  latitude             DECIMAL(10,7) DEFAULT NULL,
  longitude            DECIMAL(10,7) DEFAULT NULL,
  observation          ENUM('seen_daily','few_days','today_only') DEFAULT NULL,
  status               ENUM('submitted','in_review','in_progress','resolved') NOT NULL DEFAULT 'submitted',
  assigned_provider_id INT          DEFAULT NULL,
  submitted_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at          DATETIME     DEFAULT NULL,
  CONSTRAINT fk_complaints_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_complaints_provider
    FOREIGN KEY (assigned_provider_id) REFERENCES service_providers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_complaints_user (user_id),
  INDEX idx_complaints_category (category),
  INDEX idx_complaints_status (status),
  INDEX idx_complaints_provider (assigned_provider_id),
  INDEX idx_complaints_submitted (submitted_at)
) ENGINE=InnoDB;

CREATE TABLE complaint_status_history (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id      INT NOT NULL,
  status            ENUM('submitted','in_review','in_progress','resolved') NOT NULL,
  changed_by_id     INT DEFAULT NULL,
  changed_by_role   ENUM('citizen','admin','provider','system') NOT NULL,
  remarks           VARCHAR(255) DEFAULT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_complaint
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_history_complaint (complaint_id),
  INDEX idx_history_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE complaint_assignments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id      INT NOT NULL,
  provider_id       INT NOT NULL,
  assigned_by       INT NOT NULL,
  assigned_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assignment_status ENUM('assigned','completed') NOT NULL DEFAULT 'assigned',
  CONSTRAINT fk_assign_complaint
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_assign_provider
    FOREIGN KEY (provider_id) REFERENCES service_providers(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_assign_admin
    FOREIGN KEY (assigned_by) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_assign_complaint (complaint_id),
  INDEX idx_assign_provider (provider_id)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(150) NOT NULL,
  message         TEXT NOT NULL,
  sender_id       INT DEFAULT NULL,
  sender_role     ENUM('admin','provider','system') NOT NULL DEFAULT 'system',
  target_type     ENUM('all','citizen','provider','specific') NOT NULL DEFAULT 'all',
  target_user_id  INT DEFAULT NULL,
  complaint_id    INT DEFAULT NULL,
  category        VARCHAR(50) DEFAULT NULL,
  is_read         TINYINT(1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_complaint
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_notif_target_user (target_user_id),
  INDEX idx_notif_created (created_at),
  INDEX idx_notif_read (is_read)
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT DEFAULT NULL,
  user_role    ENUM('citizen','admin','provider') DEFAULT NULL,
  action       VARCHAR(100) NOT NULL,
  description  VARCHAR(255) DEFAULT NULL,
  ip_address   VARCHAR(45) DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_user (user_id),
  INDEX idx_activity_action (action),
  INDEX idx_activity_created (created_at)
) ENGINE=InnoDB;

SELECT 'Smart City database created successfully!' AS message;