-- ============================================================
--  AgriSmart — Setup DHT11 ESP32
--  Coller dans phpMyAdmin → base agrismart → onglet SQL
--  Exécuter une seule fois après avoir flashé l'ESP32
-- ============================================================

-- ── Créer les tables si elles n'existent pas ─────────────
CREATE TABLE IF NOT EXISTS capteurs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  node_id       VARCHAR(50)        NOT NULL DEFAULT 'ESP32-DHT11',
  temperature   DECIMAL(5,2),
  humidite_sol  TINYINT UNSIGNED,
  humidite_air  TINYINT UNSIGNED,
  ph            DECIMAL(4,2),
  azote         SMALLINT UNSIGNED,
  phosphore     SMALLINT UNSIGNED,
  potassium     SMALLINT UNSIGNED,
  luminosite    MEDIUMINT UNSIGNED,
  co2           SMALLINT UNSIGNED,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_node      (node_id),
  INDEX idx_time      (created_at),
  INDEX idx_node_time (node_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS noeuds_iot (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  node_id    VARCHAR(50)  NOT NULL UNIQUE,
  zone       VARCHAR(100) NOT NULL DEFAULT 'Zone A',
  rssi       VARCHAR(20)  NOT NULL DEFAULT '-85 dBm',
  batterie   TINYINT UNSIGNED NOT NULL DEFAULT 100,
  sf         VARCHAR(10)  NOT NULL DEFAULT 'WiFi',
  statut     ENUM('online','warn','offline') NOT NULL DEFAULT 'offline',
  last_seen  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS alertes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  type        ENUM('crit','warn','info','ok') NOT NULL DEFAULT 'info',
  titre       VARCHAR(200) NOT NULL,
  description TEXT,
  node_id     VARCHAR(50),
  lue         TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS timeline (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  icone       VARCHAR(10) NOT NULL DEFAULT '📡',
  couleur_bg  VARCHAR(20) NOT NULL DEFAULT '#e0f2fe',
  titre       VARCHAR(200) NOT NULL,
  sous_titre  VARCHAR(200),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS historique_actions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  node_id     VARCHAR(50) NOT NULL DEFAULT 'ESP32-DHT11',
  action      ENUM('Aucune','Irrigation','Alerte pH','Fertilisation') NOT NULL DEFAULT 'Aucune',
  ph          DECIMAL(4,2),
  humidite    TINYINT UNSIGNED,
  temperature DECIMAL(5,2),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS predictions_rf (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  culture        VARCHAR(100) NOT NULL,
  emoji          VARCHAR(10),
  confiance      TINYINT UNSIGNED,
  ph             DECIMAL(4,2),
  humidite_sol   TINYINT UNSIGNED,
  azote          SMALLINT UNSIGNED,
  temperature    DECIMAL(5,2),
  precipitations SMALLINT UNSIGNED,
  humidite_air   TINYINT UNSIGNED,
  phosphore      SMALLINT UNSIGNED,
  potassium      SMALLINT UNSIGNED,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Insérer votre nœud ESP32-DHT11 ──────────────────────
INSERT INTO noeuds_iot (node_id, zone, rssi, batterie, sf, statut)
VALUES ('ESP32-DHT11', 'Zone Test — DHT11', 'WiFi', 100, 'WiFi', 'offline')
ON DUPLICATE KEY UPDATE
  zone    = 'Zone Test — DHT11',
  sf      = 'WiFi',
  statut  = 'offline';

-- ── Données de test initiales (température + humidité) ──
INSERT INTO capteurs (node_id, temperature, humidite_air)
VALUES 
  ('ESP32-DHT11', 24.5, 62),
  ('ESP32-DHT11', 24.8, 61),
  ('ESP32-DHT11', 25.0, 63);

SELECT 'Setup DHT11 terminé !' AS status;
SELECT node_id, zone, statut FROM noeuds_iot;
