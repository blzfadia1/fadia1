-- ============================================================
--  Nettoyage données fausses — phpMyAdmin → SQL
-- ============================================================

-- 1. Voir ce qu'il y a dans la table
SELECT id, node_id, temperature, humidite_sol, humidite_air, ph, azote, created_at
FROM capteurs ORDER BY created_at DESC LIMIT 20;

-- 2. Supprimer les enregistrements avec données fausses (sol, ph, azote non null)
--    Garder seulement les vrais (temperature + humidite_air seulement)
DELETE FROM capteurs
WHERE node_id = 'ESP32-DHT11'
  AND (humidite_sol IS NOT NULL OR ph IS NOT NULL OR azote IS NOT NULL);

-- 3. Vérifier le résultat
SELECT id, node_id, temperature, humidite_sol, humidite_air, ph, created_at
FROM capteurs ORDER BY created_at DESC LIMIT 10;
