-- ============================================================
--  AgriSmart — Nettoyage des nœuds fictifs
--  Coller dans phpMyAdmin → base agrismart → onglet SQL
-- ============================================================

-- 1. Supprimer les nœuds fictifs (pas de vraies mesures)
DELETE FROM noeuds_iot 
WHERE node_id IN ('ESP32-01','ESP32-02','ESP32-03','ESP32-04','ESP32-05','ESP32-06','ARD-01')
  AND node_id != 'ESP32-DHT11';

-- 2. Remettre ESP32-DHT11 en ligne si il a envoyé des données récemment
UPDATE noeuds_iot 
SET statut = 'online', zone = 'Mon champ — Nord', sf = 'WiFi'
WHERE node_id = 'ESP32-DHT11'
  AND last_seen >= NOW() - INTERVAL 10 MINUTE;

-- 3. Mettre offline si pas de signal depuis plus de 3 minutes
UPDATE noeuds_iot 
SET statut = 'offline'
WHERE statut = 'online' AND last_seen < NOW() - INTERVAL 3 MINUTE;

-- 4. Vérifier le résultat
SELECT node_id, zone, rssi, batterie, sf, statut, last_seen FROM noeuds_iot;

-- 5. Vérifier les dernières mesures de l'ESP32
SELECT node_id, temperature, humidite_air, created_at 
FROM capteurs 
WHERE node_id = 'ESP32-DHT11'
ORDER BY created_at DESC LIMIT 5;
