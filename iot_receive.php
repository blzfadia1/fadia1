<?php
/* ════════════════════════════════════════════════════════════════
   AgriSmart — iot_receive.php
   Endpoint dédié ESP32/Arduino → reçoit JSON → sauvegarde MySQL
   
   URL : http://VOTRE_IP/agrismart/api/iot_receive.php
   Méthode : POST
   Content-Type : application/json
   
   Placer dans : C:/xampp/htdocs/agrismart/api/iot_receive.php
════════════════════════════════════════════════════════════════ */

// Supprimer tout output parasite avant les headers
ob_start();
@error_reporting(0);
@ini_set('display_errors', '0');
ob_end_clean();
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); exit;
}

// ── Connexion MySQL ───────────────────────────────────────────
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

function jsOk($data, $code=201){ ob_clean(); http_response_code($code); die(json_encode(['success'=>true]+$data,JSON_UNESCAPED_UNICODE)); }
function jsErr($msg, $code=400){ ob_clean(); http_response_code($code); die(json_encode(['success'=>false,'message'=>$msg],JSON_UNESCAPED_UNICODE)); }

// ── Créer les tables si elles n'existent pas ─────────────────
function ensureTables($db) {
    $db->exec("CREATE TABLE IF NOT EXISTS capteurs (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        node_id       VARCHAR(50) NOT NULL DEFAULT 'ESP32-01',
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
        INDEX idx_node(node_id),
        INDEX idx_time(created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS alertes (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        type        ENUM('crit','warn','info','ok') NOT NULL DEFAULT 'info',
        titre       VARCHAR(200) NOT NULL,
        description TEXT,
        node_id     VARCHAR(50) DEFAULT NULL,
        lue         TINYINT(1) NOT NULL DEFAULT 0,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS noeuds_iot (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        node_id   VARCHAR(50) NOT NULL UNIQUE,
        zone      VARCHAR(100) DEFAULT '',
        rssi      VARCHAR(20) DEFAULT '-90 dBm',
        batterie  TINYINT UNSIGNED DEFAULT 100,
        sf        VARCHAR(10) DEFAULT 'SF7',
        statut    ENUM('online','warn','offline') DEFAULT 'online',
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

// ── Lire le corps JSON ────────────────────────────────────────
$raw = file_get_contents('php://input');

// Support GET pour tests navigateur
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $b = [
        'node_id'      => $_GET['node_id']      ?? 'ESP32-TEST',
        'temperature'  => $_GET['temperature']  ?? null,
        'humidite_sol' => $_GET['humidite_sol'] ?? null,
        'humidite_air' => $_GET['humidite_air'] ?? null,
        'ph'           => $_GET['ph']           ?? null,
        'azote'        => $_GET['azote']        ?? null,
        'phosphore'    => $_GET['phosphore']    ?? null,
        'potassium'    => $_GET['potassium']    ?? null,
        'luminosite'   => $_GET['luminosite']   ?? null,
        'co2'          => $_GET['co2']          ?? null,
    ];
} else {
    $b = json_decode($raw, true);
    if (!$b) jsErr('JSON invalide — vérifiez Content-Type: application/json');
}

try {
    $db = getDB();
    ensureTables($db);

    // ── Extraire et valider les champs ────────────────────────
    $node = trim($b['node_id']     ?? 'ESP32-01');
    $temp = isset($b['temperature'])  && $b['temperature'] !== '' ? (float)$b['temperature']  : null;
    $hs   = isset($b['humidite_sol']) && $b['humidite_sol'] !== '' ? (int)$b['humidite_sol']   : null;
    $ha   = isset($b['humidite_air']) && $b['humidite_air'] !== '' ? (int)$b['humidite_air']   : null;
    $ph   = isset($b['ph'])           && $b['ph'] !== ''           ? (float)$b['ph']           : null;
    $n    = isset($b['azote'])        && $b['azote'] !== ''        ? (int)$b['azote']          : null;
    $p    = isset($b['phosphore'])    && $b['phosphore'] !== ''    ? (int)$b['phosphore']      : null;
    $k    = isset($b['potassium'])    && $b['potassium'] !== ''    ? (int)$b['potassium']      : null;
    $lux  = isset($b['luminosite'])   && $b['luminosite'] !== ''   ? (int)$b['luminosite']     : null;
    $co2  = isset($b['co2'])          && $b['co2'] !== ''          ? (int)$b['co2']            : null;
    $rssi = trim($b['rssi']       ?? '-90 dBm');
    $bat  = isset($b['batterie'])     ? (int)$b['batterie']        : 100;

    // ── Insérer la mesure ─────────────────────────────────────
    $db->prepare("INSERT INTO capteurs
        (node_id,temperature,humidite_sol,humidite_air,ph,azote,phosphore,potassium,luminosite,co2)
        VALUES (?,?,?,?,?,?,?,?,?,?)")
       ->execute([$node,$temp,$hs,$ha,$ph,$n,$p,$k,$lux,$co2]);
    $newId = (int)$db->lastInsertId();

    // ── Mettre à jour l'état du nœud (dernière vue) ──────────
    $db->prepare("INSERT INTO noeuds_iot (node_id,rssi,batterie,statut,last_seen)
        VALUES (?,?,?,'online',NOW())
        ON DUPLICATE KEY UPDATE rssi=VALUES(rssi),batterie=VALUES(batterie),statut='online',last_seen=NOW()")
       ->execute([$node, $rssi, $bat]);

    // ── Générer alertes automatiques ─────────────────────────
    $alerts = [];

    if ($hs !== null && $hs < 20) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('crit',?,?,?)")
           ->execute(["💧 Humidité critique — $node", "Sol très sec : $hs% (seuil: 20%)", $node]);
        $alerts[] = 'humidite_critique';
    } elseif ($hs !== null && $hs < 30) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('warn',?,?,?)")
           ->execute(["💧 Humidité basse — $node", "Sol sec : $hs% (seuil: 30%)", $node]);
        $alerts[] = 'humidite_basse';
    }

    if ($ph !== null && $ph < 5.5) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('warn',?,?,?)")
           ->execute(["🧪 Sol acide — $node", "pH bas : $ph (optimal: 6.0–7.0)", $node]);
        $alerts[] = 'ph_acide';
    } elseif ($ph !== null && $ph > 8.0) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('warn',?,?,?)")
           ->execute(["🧪 Sol alcalin — $node", "pH élevé : $ph (optimal: 6.0–7.0)", $node]);
        $alerts[] = 'ph_alcalin';
    }

    if ($temp !== null && $temp > 38) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('warn',?,?,?)")
           ->execute(["🌡️ Stress thermique — $node", "Température : {$temp}°C (seuil: 38°C)", $node]);
        $alerts[] = 'temperature_elevee';
    }

    if ($bat < 20) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('warn',?,?,?)")
           ->execute(["🔋 Batterie faible — $node", "Batterie : $bat% (remplacer bientôt)", $node]);
        $alerts[] = 'batterie_faible';
    }

    // ── Réponse succès ────────────────────────────────────────
    jsOk([
        'id'               => $newId,
        'node_id'          => $node,
        'message'          => 'Données reçues et sauvegardées',
        'alerts_generated' => $alerts,
        'timestamp'        => date('Y-m-d H:i:s'),
    ], 201);

} catch (PDOException $e) {
    jsErr('Erreur MySQL: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    jsErr('Erreur serveur: ' . $e->getMessage(), 500);
}
