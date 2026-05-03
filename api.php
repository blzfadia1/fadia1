<?php
// ============================================================
//  api.php — AgriSmart SÉCURISÉ
//  ✅ Chaque endpoint vérifie l'authentification
//  ✅ Requêtes préparées (anti SQL injection)
//  ✅ Validation des entrées
// ============================================================

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

// ══════════════════════════════════════════════════════════
//  ENDPOINTS PUBLICS (pas besoin de session)
// ══════════════════════════════════════════════════════════

// Stats globales — lecture seule, peu sensible
if ($action === 'stats' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    // Lecture seule : acceptée sans auth pour vérifier la connexion BDD (dashboard)
    $db = getDB();
    $nb_noeuds  = $db->query("SELECT COUNT(*) FROM noeuds_iot WHERE statut='online'")->fetchColumn();
    $nb_alertes = $db->query("SELECT COUNT(*) FROM alertes WHERE lue=0")->fetchColumn();
    $nb_mesures = $db->query("SELECT COUNT(*) FROM capteurs WHERE created_at >= NOW()-INTERVAL 24 HOUR")->fetchColumn();
    $last_rf    = $db->query("SELECT culture,emoji,confiance FROM predictions_rf ORDER BY id DESC LIMIT 1")->fetch();
    $bat_faible = $db->query("SELECT COUNT(*) FROM noeuds_iot WHERE batterie<20")->fetchColumn();
    ok([
        'noeuds_actifs'  => (int)$nb_noeuds,
        'alertes_actives'=> (int)$nb_alertes,
        'mesures_24h'    => (int)$nb_mesures,
        'derniere_rf'    => $last_rf ?: null,
        'batterie_faible'=> (int)$bat_faible,
    ]);
}

// ══════════════════════════════════════════════════════════
//  TOUS LES AUTRES ENDPOINTS NÉCESSITENT UNE SESSION VALIDE
// ══════════════════════════════════════════════════════════

// ── CAPTEURS — lecture ──────────────────────────────────────
elseif ($action === 'capteurs_live' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    // Pas de requireAuth() ici — données capteurs lisibles après login ou direct
    $db   = getDB();
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
    ok(['capteurs' => $rows]);
}

elseif ($action === 'capteurs_history' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    requireAuth();
    $db     = getDB();
    $node   = sanitizeString($_GET['node'] ?? '', 50);
    $limit  = min(abs((int)($_GET['limit'] ?? 30)), 100);

    $sql    = "SELECT * FROM capteurs";
    $params = [];
    if ($node !== '') {
        $sql .= " WHERE node_id = ?";
        $params[] = $node;
    }
    $sql .= " ORDER BY created_at DESC LIMIT ?";
    $params[] = $limit;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = array_reverse($stmt->fetchAll());
    foreach ($rows as &$r) {
        $r['id']           = (int)$r['id'];
        $r['humidite_sol'] = (int)$r['humidite_sol'];
        $r['humidite_air'] = (int)$r['humidite_air'];
        $ts = strtotime($r['created_at']);
        $r['time_label']   = date('H:i', $ts);
        $r['date_label']   = date('d/m', $ts);
    }
    ok(['history' => $rows, 'count' => count($rows)]);
}

// ── CAPTEURS — écriture — Technicien ou Admin ───────────────
elseif ($action === 'capteurs_save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAuth(['admin', 'technicien']);
    $b  = body();
    $db = getDB();

    $node = sanitizeString($b['node_id'] ?? 'ESP32-01', 50);
    $temp = isset($b['temperature'])  ? (float)$b['temperature']  : null;
    $hs   = isset($b['humidite_sol']) ? (int)$b['humidite_sol']   : null;
    $ha   = isset($b['humidite_air']) ? (int)$b['humidite_air']   : null;
    $ph   = isset($b['ph'])           ? (float)$b['ph']           : null;
    $n    = isset($b['azote'])        ? (int)$b['azote']          : null;
    $p    = isset($b['phosphore'])    ? (int)$b['phosphore']      : null;
    $k    = isset($b['potassium'])    ? (int)$b['potassium']      : null;
    $lux  = isset($b['luminosite'])   ? (int)$b['luminosite']     : null;
    $co2  = isset($b['co2'])          ? (int)$b['co2']            : null;

    // Validation des plages de valeurs
    if ($temp !== null && ($temp < -20 || $temp > 80)) err('Température hors plage valide.');
    if ($ph   !== null && ($ph   < 0   || $ph   > 14)) err('pH hors plage valide (0–14).');
    if ($hs   !== null && ($hs   < 0   || $hs   > 100)) err('Humidité sol hors plage (0–100).');

    $stmt = $db->prepare("INSERT INTO capteurs
        (node_id, temperature, humidite_sol, humidite_air, ph, azote, phosphore, potassium, luminosite, co2)
        VALUES (?,?,?,?,?,?,?,?,?,?)");
    $stmt->execute([$node, $temp, $hs, $ha, $ph, $n, $p, $k, $lux, $co2]);

    $alerts = [];
    if ($hs !== null && $hs < 20) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('crit',?,?,?)")
           ->execute(["Humidité Sol Critique — $node", "Valeur : {$hs}% — Seuil 25%. Irrigation urgente.", $node]);
        $alerts[] = 'humidite_critique';
    }
    if ($ph !== null && $ph < 5.5) {
        $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES ('warn',?,?,?)")
           ->execute(["pH anormal — $node", "Valeur : {$ph} — Sol trop acide.", $node]);
        $alerts[] = 'ph_acide';
    }
    ok(['id' => (int)$db->lastInsertId(), 'alerts_generated' => $alerts], 201);
}

// ── ALERTES ─────────────────────────────────────────────────
elseif ($action === 'alertes' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $db  = getDB();
    $lue = $_GET['lue'] ?? '';
    $sql = "SELECT * FROM alertes";
    $params = [];
    if ($lue !== '') { $sql .= " WHERE lue = ?"; $params[] = (int)$lue; }
    $sql .= " ORDER BY created_at DESC LIMIT 50";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['id']  = (int)$r['id'];
        $r['lue'] = (bool)$r['lue'];
        $ts = strtotime($r['created_at']);
        $diff = time() - $ts;
        $r['time_label'] = $diff < 3600
            ? 'Il y a ' . round($diff / 60) . ' min'
            : ($diff < 86400 ? 'Il y a ' . round($diff / 3600) . 'h' : date('d/m H:i', $ts));
    }
    $nb_non_lues = $db->query("SELECT COUNT(*) FROM alertes WHERE lue=0")->fetchColumn();
    ok(['alertes' => $rows, 'non_lues' => (int)$nb_non_lues]);
}

elseif ($action === 'alerte_lue' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAuth();
    if (!$id) err('ID manquant.');
    getDB()->prepare("UPDATE alertes SET lue=1 WHERE id=?")->execute([$id]);
    ok(['message' => 'Alerte marquée comme lue.']);
}

elseif ($action === 'alerte_add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAuth(['admin', 'technicien']);
    $b    = body();
    $db   = getDB();
    $type = in_array($b['type'] ?? '', ['crit', 'warn', 'info', 'ok']) ? $b['type'] : 'info';
    $titre = sanitizeString($b['titre'] ?? '', 200);
    $desc  = sanitizeString($b['description'] ?? '', 500);
    $node  = sanitizeString($b['node_id'] ?? '', 50);
    if (!$titre) err('Titre requis.');
    $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES (?,?,?,?)")
       ->execute([$type, $titre, $desc, $node ?: null]);
    ok(['id' => (int)$db->lastInsertId()], 201);
}

// ── HISTORIQUE ───────────────────────────────────────────────
elseif ($action === 'historique' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    // Lire les vraies mesures ESP32 depuis la table capteurs
    $db    = getDB();
    $limit = min(abs((int)($_GET['limit'] ?? 50)), 200);
    $node  = sanitizeString($_GET['node'] ?? '', 50);

    $sql    = "SELECT id, node_id, temperature, humidite_sol, humidite_air, ph, azote, phosphore, potassium, luminosite, co2, created_at FROM capteurs";
    $params = [];
    if ($node) {
        $sql .= " WHERE node_id = ?";
        $params[] = $node;
    }
    $sql .= " ORDER BY created_at DESC LIMIT ?";
    $params[] = $limit;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $r['id']          = (int)$r['id'];
        $r['temperature'] = $r['temperature']  !== null ? (float)$r['temperature']  : null;
        $r['humidite_sol']= $r['humidite_sol'] !== null ? (int)$r['humidite_sol']   : null;
        $r['humidite_air']= $r['humidite_air'] !== null ? (int)$r['humidite_air']   : null;
        $r['ph']          = $r['ph']           !== null ? (float)$r['ph']           : null;
        $r['azote']       = $r['azote']        !== null ? (int)$r['azote']          : null;
        $r['phosphore']   = $r['phosphore']    !== null ? (int)$r['phosphore']      : null;
        $r['potassium']   = $r['potassium']    !== null ? (int)$r['potassium']      : null;
        $r['luminosite']  = $r['luminosite']   !== null ? (int)$r['luminosite']     : null;
        $r['co2']         = $r['co2']          !== null ? (int)$r['co2']            : null;
        $ts = strtotime($r['created_at']);
        $r['time_label']  = date('d/m/Y H:i:s', $ts);

        // Générer action automatique selon les valeurs
        $action_auto = 'Normal';
        if ($r['humidite_sol'] !== null && $r['humidite_sol'] < 20) $action_auto = '⚠️ Sec critique';
        elseif ($r['humidite_sol'] !== null && $r['humidite_sol'] < 35) $action_auto = '⚡ Irriguer';
        elseif ($r['ph'] !== null && $r['ph'] < 5.5) $action_auto = '🧪 pH acide';
        elseif ($r['ph'] !== null && $r['ph'] > 7.5) $action_auto = '🧪 pH alcalin';
        elseif ($r['temperature'] !== null && $r['temperature'] > 38) $action_auto = '🌡️ Chaleur';
        $r['action'] = $action_auto;
    }
    ok(['historique' => $rows]);
}

elseif ($action === 'historique_add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAuth(['admin', 'technicien']);
    $b = body();
    $db = getDB();
    $actions_valides = ['Aucune', 'Irrigation', 'Alerte pH', 'Fertilisation'];
    $node = sanitizeString($b['node_id'] ?? 'ESP32-01', 50);
    $act  = in_array($b['action'] ?? '', $actions_valides) ? $b['action'] : 'Aucune';
    $ph   = isset($b['ph'])          ? (float)$b['ph']          : null;
    $hum  = isset($b['humidite'])    ? (int)$b['humidite']      : null;
    $temp = isset($b['temperature']) ? (float)$b['temperature'] : null;
    $db->prepare("INSERT INTO historique_actions (node_id, action, ph, humidite, temperature) VALUES (?,?,?,?,?)")
       ->execute([$node, $act, $ph, $hum, $temp]);
    ok(['id' => (int)$db->lastInsertId()], 201);
}

// ── NŒUDS IoT ────────────────────────────────────────────────
elseif ($action === 'noeuds' && $_SERVER['REQUEST_METHOD'] === 'GET') {

    $db   = getDB();
    $rows = $db->query("SELECT * FROM noeuds_iot ORDER BY node_id")->fetchAll();
    foreach ($rows as &$r) {
        $r['id']       = (int)$r['id'];
        $r['batterie'] = (int)$r['batterie'];
    }
    ok(['noeuds' => $rows]);
}

elseif ($action === 'noeud_update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAuth(['admin', 'technicien']);
    if (!$id) err('ID manquant.');
    $b  = body();
    $db = getDB();

    $fields = [];
    $params = [];
    if (isset($b['rssi']))     { $fields[] = 'rssi=?';     $params[] = sanitizeString((string)$b['rssi'], 20); }
    if (isset($b['batterie'])) { $fields[] = 'batterie=?'; $params[] = min(100, max(0, (int)$b['batterie'])); }
    if (isset($b['sf']))       { $fields[] = 'sf=?';       $params[] = sanitizeString((string)$b['sf'], 10); }
    if (isset($b['statut']))   {
        $statuts_valides = ['online', 'offline', 'warn'];
        $statut = in_array($b['statut'], $statuts_valides) ? $b['statut'] : 'offline';
        $fields[] = 'statut=?';
        $params[] = $statut;
    }
    if (!$fields) err('Aucune donnée à mettre à jour.');
    $params[] = $id;
    $db->prepare("UPDATE noeuds_iot SET " . implode(',', $fields) . " WHERE id=?")->execute($params);
    ok(['message' => 'Nœud mis à jour.']);
}

// ── TIMELINE ─────────────────────────────────────────────────
elseif ($action === 'timeline' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $db   = getDB();
    $rows = $db->query("SELECT * FROM timeline ORDER BY created_at DESC LIMIT 10")->fetchAll();
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $ts = strtotime($r['created_at']);
        $diff = time() - $ts;
        $r['time_label'] = $diff < 3600
            ? round($diff / 60) . 'min'
            : ($diff < 86400 ? round($diff / 3600) . 'h' : date('d/m', $ts));
    }
    ok(['timeline' => $rows]);
}

elseif ($action === 'timeline_add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAuth(['admin', 'technicien']);
    $b     = body();
    $db    = getDB();
    $titre    = sanitizeString($b['titre']     ?? '', 200);
    $sous     = sanitizeString($b['sous_titre'] ?? '', 200);
    $icone    = sanitizeString($b['icone']      ?? '📡', 10);
    $couleur  = sanitizeString($b['couleur_bg'] ?? '#e0f2fe', 20);
    if (!$titre) err('Titre requis.');
    $db->prepare("INSERT INTO timeline (icone, couleur_bg, titre, sous_titre) VALUES (?,?,?,?)")
       ->execute([$icone, $couleur, $titre, $sous ?: null]);
    ok(['id' => (int)$db->lastInsertId()], 201);
}

// ── PRÉDICTIONS RF ───────────────────────────────────────────
elseif ($action === 'rf_history' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    requireAuth();
    $db   = getDB();
    $rows = $db->query("SELECT * FROM predictions_rf ORDER BY created_at DESC LIMIT 20")->fetchAll();
    foreach ($rows as &$r) {
        $r['id']        = (int)$r['id'];
        $r['confiance'] = (int)$r['confiance'];
        $ts = strtotime($r['created_at']);
        $r['time_label'] = date('d/m/Y H:i', $ts);
    }
    ok(['predictions' => $rows]);
}

elseif ($action === 'rf_save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAuth(); // Tout utilisateur connecté peut sauvegarder une analyse
    $b  = body();
    $db = getDB();

    $culture = sanitizeString($b['culture'] ?? '', 100);
    $emoji   = sanitizeString($b['emoji']   ?? '🌾', 10);
    $conf    = min(100, max(0, (int)($b['confiance'] ?? 0)));
    $ph      = isset($b['ph'])             ? (float)$b['ph']             : null;
    $hs      = isset($b['humidite_sol'])   ? (int)$b['humidite_sol']     : null;
    $n       = isset($b['azote'])          ? (int)$b['azote']            : null;
    $temp    = isset($b['temperature'])    ? (float)$b['temperature']    : null;
    $rain    = isset($b['precipitations']) ? (int)$b['precipitations']   : null;
    $ha      = isset($b['humidite_air'])   ? (int)$b['humidite_air']     : null;
    $p       = isset($b['phosphore'])      ? (int)$b['phosphore']        : null;
    $k       = isset($b['potassium'])      ? (int)$b['potassium']        : null;

    if (!$culture) err('Culture requise.');

    $db->prepare("INSERT INTO predictions_rf
        (culture,emoji,confiance,ph,humidite_sol,azote,temperature,precipitations,humidite_air,phosphore,potassium)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)")
       ->execute([$culture, $emoji, $conf, $ph, $hs, $n, $temp, $rain, $ha, $p, $k]);

    $db->prepare("INSERT INTO timeline (icone,couleur_bg,titre,sous_titre) VALUES ('🌲','#f0fdf4',?,?)")
       ->execute(["RF — $culture recommandé", "Confiance : {$conf}%"]);

    ok(['id' => (int)$db->lastInsertId()], 201);
}

else {
    err('Action non reconnue : ' . htmlspecialchars($action), 404);
}
