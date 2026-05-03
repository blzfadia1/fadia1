<?php
/* ════════════════════════════════════════════════════════════════
   AgriSmart — iot_receive.php
   ✅ Compatible ESP32 + DHT11 (température + humidité air uniquement)
   ✅ Les autres champs (ph, azote...) acceptent NULL sans erreur
════════════════════════════════════════════════════════════════ */
ob_start();
@error_reporting(0);
@ini_set('display_errors', '0');
ob_end_clean();
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

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

function jsOk($data,$code=201){ ob_clean(); http_response_code($code); die(json_encode(['success'=>true]+$data,JSON_UNESCAPED_UNICODE)); }
function jsErr($msg,$code=400){ ob_clean(); http_response_code($code); die(json_encode(['success'=>false,'message'=>$msg],JSON_UNESCAPED_UNICODE)); }

function ensureTables($db) {
    $db->exec("CREATE TABLE IF NOT EXISTS capteurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        node_id VARCHAR(50) NOT NULL DEFAULT 'ESP32-DHT11',
        temperature DECIMAL(5,2),
        humidite_sol TINYINT UNSIGNED,
        humidite_air TINYINT UNSIGNED,
        ph DECIMAL(4,2),
        azote SMALLINT UNSIGNED,
        phosphore SMALLINT UNSIGNED,
        potassium SMALLINT UNSIGNED,
        luminosite MEDIUMINT UNSIGNED,
        co2 SMALLINT UNSIGNED,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_node(node_id), INDEX idx_time(created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS alertes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('crit','warn','info','ok') NOT NULL DEFAULT 'info',
        titre VARCHAR(200) NOT NULL,
        description TEXT,
        node_id VARCHAR(50) DEFAULT NULL,
        lue TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS noeuds_iot (
        id INT AUTO_INCREMENT PRIMARY KEY,
        node_id VARCHAR(50) NOT NULL UNIQUE,
        zone VARCHAR(100) DEFAULT '',
        rssi VARCHAR(20) DEFAULT 'WiFi',
        batterie TINYINT UNSIGNED DEFAULT 100,
        sf VARCHAR(10) DEFAULT 'WiFi',
        statut ENUM('online','warn','offline') DEFAULT 'online',
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    // Ajouter last_seen si table existante sans cette colonne
    try {
        $db->exec("ALTER TABLE noeuds_iot ADD COLUMN IF NOT EXISTS last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    } catch(Exception $e) {}
    try {
        $db->exec("ALTER TABLE noeuds_iot ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    } catch(Exception $e) {}
}

// Lire JSON (POST) ou GET pour tests navigateur
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $b = [
        'node_id'      => $_GET['node_id']      ?? 'ESP32-DHT11',
        'temperature'  => $_GET['temperature']  ?? null,
        'humidite_air' => $_GET['humidite_air'] ?? null,
        'humidite_sol' => $_GET['humidite_sol'] ?? null,
        'ph'           => $_GET['ph']           ?? null,
        'azote'        => $_GET['azote']        ?? null,
        'phosphore'    => $_GET['phosphore']    ?? null,
        'potassium'    => $_GET['potassium']    ?? null,
        'luminosite'   => $_GET['luminosite']   ?? null,
        'co2'          => $_GET['co2']          ?? null,
    ];
} else {
    $b = json_decode(file_get_contents('php://input'), true);
    if (!$b) jsErr('JSON invalide');
}

try {
    $db = getDB();
    ensureTables($db);

    $node = trim($b['node_id'] ?? 'ESP32-DHT11');

    // Tous les champs optionnels — NULL si absent ou vide
    $temp = isset($b['temperature'])  && $b['temperature']  !== '' && $b['temperature']  !== null ? (float)$b['temperature']  : null;
    $ha   = isset($b['humidite_air']) && $b['humidite_air'] !== '' && $b['humidite_air'] !== null ? (int)$b['humidite_air']   : null;
    $hs   = isset($b['humidite_sol']) && $b['humidite_sol'] !== '' && $b['humidite_sol'] !== null ? (int)$b['humidite_sol']   : null;
    $ph   = isset($b['ph'])           && $b['ph']           !== '' && $b['ph']           !== null ? (float)$b['ph']           : null;
    $n    = isset($b['azote'])        && $b['azote']        !== '' && $b['azote']        !== null ? (int)$b['azote']          : null;
    $p    = isset($b['phosphore'])    && $b['phosphore']    !== '' && $b['phosphore']    !== null ? (int)$b['phosphore']      : null;
    $k    = isset($b['potassium'])    && $b['potassium']    !== '' && $b['potassium']    !== null ? (int)$b['potassium']      : null;
    $lux  = isset($b['luminosite'])   && $b['luminosite']   !== '' && $b['luminosite']   !== null ? (int)$b['luminosite']     : null;
    $co2  = isset($b['co2'])          && $b['co2']          !== '' && $b['co2']          !== null ? (int)$b['co2']            : null;
    $rssi = trim($b['rssi'] ?? 'WiFi');
    $bat  = isset($b['batterie']) ? (int)$b['batterie'] : 100;

    // Insérer mesure
    $db->prepare("INSERT INTO capteurs
        (node_id,temperature,humidite_sol,humidite_air,ph,azote,phosphore,potassium,luminosite,co2)
        VALUES (?,?,?,?,?,?,?,?,?,?)")
       ->execute([$node,$temp,$hs,$ha,$ph,$n,$p,$k,$lux,$co2]);
    $newId = (int)$db->lastInsertId();

    // Zone label depuis le code Arduino (optionnel)
    $zone = trim($b['zone'] ?? '');
    if (empty($zone)) {
        // Zone par défaut basée sur NODE_ID
        $zone = 'Zone ' . $node;
    }

    // Mettre à jour nœud (créer si n'existe pas)
    $db->prepare("INSERT INTO noeuds_iot (node_id,zone,rssi,batterie,sf,statut,last_seen)
        VALUES (?,?,?,?,'WiFi','online',NOW())
        ON DUPLICATE KEY UPDATE
            zone=IF(LENGTH(VALUES(zone))>0,VALUES(zone),zone),
            rssi=VALUES(rssi),
            batterie=VALUES(batterie),
            sf='WiFi',
            statut='online',
            last_seen=NOW()")
       ->execute([$node, $zone, $rssi, $bat]);

    // Alertes automatiques
    $alerts = [];
    if ($temp !== null && $temp > 38) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('warn',?,?,?)")
           ->execute(["🌡️ Température élevée — $node", "Température : {$temp}°C (seuil: 38°C)", $node]);
        $alerts[] = 'temperature_elevee';
    }
    if ($ha !== null && $ha < 20) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('warn',?,?,?)")
           ->execute(["💧 Humidité air très basse — $node", "Humidité air : $ha% (très sec)", $node]);
        $alerts[] = 'humidite_air_basse';
    }
    if ($hs !== null && $hs < 20) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('crit',?,?,?)")
           ->execute(["💧 Humidité sol critique — $node", "Sol très sec : $hs% (seuil: 20%)", $node]);
        $alerts[] = 'humidite_sol_critique';
    }
    if ($ph !== null && $ph < 5.5) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('warn',?,?,?)")
           ->execute(["🧪 Sol acide — $node", "pH bas : $ph (optimal: 6.0–7.0)", $node]);
        $alerts[] = 'ph_acide';
    }
    if ($bat < 20) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('warn',?,?,?)")
           ->execute(["🔋 Batterie faible — $node", "Batterie : $bat%", $node]);
        $alerts[] = 'batterie_faible';
    }

    jsOk([
        'id'               => $newId,
        'node_id'          => $node,
        'temperature'      => $temp,
        'humidite_air'     => $ha,
        'message'          => 'Données reçues et sauvegardées ✅',
        'alerts_generated' => $alerts,
        'timestamp'        => date('Y-m-d H:i:s'),
    ], 201);

} catch (PDOException $e) {
    jsErr('Erreur MySQL: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    jsErr('Erreur: ' . $e->getMessage(), 500);
}
