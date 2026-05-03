<?php
/* ════════════════════════════════════════════════════════════════
   AgriSmart — api/iot_data.php
   Endpoint PUBLIC — pas de session requise
   Retourne les dernières données capteurs + nœuds IoT
   Utilisé par Dashboard, RF, LSTM, CNN pour données temps réel
════════════════════════════════════════════════════════════════ */
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Cache-Control: no-cache, no-store, must-revalidate");

function getDB() {
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO(
        'mysql:host=localhost;dbname=agrismart;charset=utf8mb4',
        'root', '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    return $pdo;
}

$action = $_GET['action'] ?? 'capteurs';

try {
    $db = getDB();

    if ($action === 'capteurs') {
        // Dernière mesure de chaque nœud
        $rows = $db->query("
            SELECT c.* FROM capteurs c
            INNER JOIN (
                SELECT node_id, MAX(id) AS max_id FROM capteurs GROUP BY node_id
            ) latest ON c.id = latest.max_id
            ORDER BY c.node_id
        ")->fetchAll();

        foreach ($rows as &$r) {
            $r['id']           = (int)$r['id'];
            $r['temperature']  = $r['temperature']  !== null ? (float)$r['temperature']  : null;
            $r['humidite_sol'] = $r['humidite_sol'] !== null ? (int)$r['humidite_sol']   : null;
            $r['humidite_air'] = $r['humidite_air'] !== null ? (int)$r['humidite_air']   : null;
            $r['ph']           = $r['ph']           !== null ? (float)$r['ph']           : null;
            $r['azote']        = $r['azote']        !== null ? (int)$r['azote']          : null;
            $r['phosphore']    = $r['phosphore']    !== null ? (int)$r['phosphore']      : null;
            $r['potassium']    = $r['potassium']    !== null ? (int)$r['potassium']      : null;
            $r['luminosite']   = $r['luminosite']   !== null ? (int)$r['luminosite']     : null;
            $r['co2']          = $r['co2']          !== null ? (int)$r['co2']            : null;
        }
        echo json_encode(['success' => true, 'capteurs' => $rows, 'count' => count($rows)], JSON_UNESCAPED_UNICODE);

    } elseif ($action === 'noeuds') {
        // Auto offline si pas de signal depuis 2 minutes (ESP32 envoie toutes les 30s → 4 ratés)
        $db->exec("UPDATE noeuds_iot SET statut='offline'
            WHERE statut='online' AND last_seen < NOW() - INTERVAL 2 MINUTE");
        $db->exec("UPDATE noeuds_iot SET statut='warn'
            WHERE statut='online' AND batterie < 20");

        $rows = $db->query("SELECT *,
            TIMESTAMPDIFF(SECOND, last_seen, NOW()) AS secondes_depuis,
            DATE_FORMAT(last_seen, '%d/%m/%Y %H:%i:%s') AS last_seen_label
            FROM noeuds_iot ORDER BY node_id")->fetchAll();
        foreach ($rows as &$r) {
            $r['id']              = (int)$r['id'];
            $r['batterie']        = (int)$r['batterie'];
            $sec                  = (int)$r['secondes_depuis'];
            $r['secondes_depuis'] = $sec;
            // Statut recalculé en temps réel
            if ($sec > 120) {
                $r['statut'] = 'offline';
                if ($sec < 3600) {
                    $mins = (int)($sec / 60);
                    $r['statut_detail'] = "Hors ligne depuis {$mins} min";
                } else {
                    $r['statut_detail'] = "Hors ligne (vérifiez ESP32)";
                }
            } elseif ($r['batterie'] < 20) {
                $r['statut'] = 'warn';
                $r['statut_detail'] = "Batterie faible ({$r['batterie']}%)";
            } else {
                $r['statut'] = 'online';
                $r['statut_detail'] = "En ligne · il y a {$sec}s";
            }
        }
        echo json_encode(['success' => true, 'noeuds' => $rows], JSON_UNESCAPED_UNICODE);

    } elseif ($action === 'stats') {
        $nb    = $db->query("SELECT COUNT(*) FROM noeuds_iot WHERE statut='online'")->fetchColumn();
        $mes   = $db->query("SELECT COUNT(*) FROM capteurs WHERE created_at >= NOW() - INTERVAL 24 HOUR")->fetchColumn();
        $last  = $db->query("SELECT MAX(created_at) FROM capteurs")->fetchColumn();
        echo json_encode([
            'success' => true,
            'noeuds_actifs' => (int)$nb,
            'mesures_24h'   => (int)$mes,
            'derniere_mesure' => $last,
        ], JSON_UNESCAPED_UNICODE);

    } else {
        echo json_encode(['success' => false, 'message' => 'Action inconnue']);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur: ' . $e->getMessage()]);
}
