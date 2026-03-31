<?php
// ============================================================
//  api.php — API AgriSmart (toutes les routes)
//  http://localhost/agrismart/api/api.php?action=XXX
//
//  GET  ?action=capteurs_live     → dernières mesures par nœud
//  GET  ?action=capteurs_history  → historique mesures
//  POST ?action=capteurs_save     → sauvegarder une mesure
//  GET  ?action=alertes           → liste alertes
//  POST ?action=alerte_lue&id=X   → marquer lue
//  POST ?action=alerte_add        → ajouter alerte
//  GET  ?action=historique        → historique actions
//  POST ?action=historique_add    → ajouter action
//  GET  ?action=noeuds            → état nœuds IoT
//  POST ?action=noeud_update&id=X → mettre à jour nœud
//  GET  ?action=timeline          → timeline récente
//  POST ?action=timeline_add      → ajouter évènement
//  GET  ?action=rf_history        → historique prédictions RF
//  POST ?action=rf_save           → sauvegarder prédiction RF
//  GET  ?action=stats             → statistiques globales
// ============================================================

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

// ═══════════════════════════════════════════════════════════
//  CAPTEURS — Dernières mesures (1 par nœud)
// ═══════════════════════════════════════════════════════════
if ($action === 'capteurs_live' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $db = getDB();
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
        $r['humidite_sol'] = (int)$r['humidite_sol'];
        $r['humidite_air'] = (int)$r['humidite_air'];
        $r['azote']        = (int)$r['azote'];
        $r['phosphore']    = (int)$r['phosphore'];
        $r['potassium']    = (int)$r['potassium'];
        $r['luminosite']   = (int)$r['luminosite'];
        $r['co2']          = (int)$r['co2'];
    }
    ok(['capteurs' => $rows]);
}

// ═══════════════════════════════════════════════════════════
//  CAPTEURS — Historique complet (pour graphiques)
// ═══════════════════════════════════════════════════════════
elseif ($action === 'capteurs_history' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $db     = getDB();
    $node   = $_GET['node'] ?? '';
    $limit  = min((int)($_GET['limit'] ?? 30), 100);

    $sql    = "SELECT * FROM capteurs";
    $params = [];
    if ($node) { $sql .= " WHERE node_id = ?"; $params[] = $node; }
    $sql .= " ORDER BY created_at DESC LIMIT $limit";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Renverser pour ordre chronologique
    $rows = array_reverse($rows);
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

// ═══════════════════════════════════════════════════════════
//  CAPTEURS — Sauvegarder une mesure (ESP32 → BDD)
// ═══════════════════════════════════════════════════════════
elseif ($action === 'capteurs_save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $b = body();
    $db = getDB();

    $node   = trim($b['node_id'] ?? 'ESP32-01');
    $temp   = isset($b['temperature'])  ? (float)$b['temperature']  : null;
    $hs     = isset($b['humidite_sol']) ? (int)$b['humidite_sol']   : null;
    $ha     = isset($b['humidite_air']) ? (int)$b['humidite_air']   : null;
    $ph     = isset($b['ph'])           ? (float)$b['ph']           : null;
    $n      = isset($b['azote'])        ? (int)$b['azote']          : null;
    $p      = isset($b['phosphore'])    ? (int)$b['phosphore']      : null;
    $k      = isset($b['potassium'])    ? (int)$b['potassium']      : null;
    $lux    = isset($b['luminosite'])   ? (int)$b['luminosite']     : null;
    $co2    = isset($b['co2'])          ? (int)$b['co2']            : null;

    $stmt = $db->prepare("INSERT INTO capteurs
        (node_id, temperature, humidite_sol, humidite_air, ph, azote, phosphore, potassium, luminosite, co2)
        VALUES (?,?,?,?,?,?,?,?,?,?)");
    $stmt->execute([$node,$temp,$hs,$ha,$ph,$n,$p,$k,$lux,$co2]);

    // Générer alertes automatiques
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

// ═══════════════════════════════════════════════════════════
//  ALERTES
// ═══════════════════════════════════════════════════════════
elseif ($action === 'alertes' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $db = getDB();
    $lue = $_GET['lue'] ?? ''; // '' = toutes, '0' = non lues, '1' = lues

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
            ? 'Il y a '.round($diff/60).' min'
            : ($diff < 86400 ? 'Il y a '.round($diff/3600).'h' : date('d/m H:i', $ts));
    }
    $nb_non_lues = $db->query("SELECT COUNT(*) FROM alertes WHERE lue=0")->fetchColumn();
    ok(['alertes' => $rows, 'non_lues' => (int)$nb_non_lues]);
}

elseif ($action === 'alerte_lue' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$id) err('ID manquant.');
    getDB()->prepare("UPDATE alertes SET lue=1 WHERE id=?")->execute([$id]);
    ok(['message' => 'Alerte marquée comme lue.']);
}

elseif ($action === 'alerte_add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $b = body();
    $db = getDB();
    $type   = in_array($b['type']??'', ['crit','warn','info','ok']) ? $b['type'] : 'info';
    $titre  = trim($b['titre'] ?? '');
    $desc   = trim($b['description'] ?? '');
    $node   = trim($b['node_id'] ?? '');
    if (!$titre) err('Titre requis.');
    $db->prepare("INSERT INTO alertes (type,titre,description,node_id) VALUES (?,?,?,?)")
       ->execute([$type,$titre,$desc,$node?:null]);
    ok(['id' => (int)$db->lastInsertId()], 201);
}

// ═══════════════════════════════════════════════════════════
//  HISTORIQUE DES ACTIONS
// ═══════════════════════════════════════════════════════════
elseif ($action === 'historique' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $db     = getDB();
    $filter = $_GET['action_filter'] ?? '';
    $limit  = min((int)($_GET['limit'] ?? 20), 100);

    $sql    = "SELECT * FROM historique_actions";
    $params = [];
    if ($filter && $filter !== 'Toutes') {
        $sql .= " WHERE action = ?";
        $params[] = $filter;
    }
    $sql .= " ORDER BY created_at DESC LIMIT $limit";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $r['id']          = (int)$r['id'];
        $r['humidite']    = (int)$r['humidite'];
        $ts = strtotime($r['created_at']);
        $r['time_label']  = date('d/m/Y H:i', $ts);
    }
    ok(['historique' => $rows]);
}

elseif ($action === 'historique_add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $b = body();
    $db = getDB();
    $actions_valides = ['Aucune','Irrigation','Alerte pH','Fertilisation'];
    $node   = trim($b['node_id'] ?? 'ESP32-01');
    $act    = in_array($b['action']??'', $actions_valides) ? $b['action'] : 'Aucune';
    $ph     = isset($b['ph'])          ? (float)$b['ph']       : null;
    $hum    = isset($b['humidite'])    ? (int)$b['humidite']   : null;
    $temp   = isset($b['temperature']) ? (float)$b['temperature'] : null;

    $db->prepare("INSERT INTO historique_actions (node_id, action, ph, humidite, temperature) VALUES (?,?,?,?,?)")
       ->execute([$node, $act, $ph, $hum, $temp]);
    ok(['id' => (int)$db->lastInsertId()], 201);
}

// ═══════════════════════════════════════════════════════════
//  NŒUDS IoT
// ═══════════════════════════════════════════════════════════
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
    if (!$id) err('ID manquant.');
    $b  = body();
    $db = getDB();

    $fields = [];
    $params = [];
    if (isset($b['rssi']))    { $fields[] = 'rssi=?';    $params[] = $b['rssi']; }
    if (isset($b['batterie'])){ $fields[] = 'batterie=?';$params[] = (int)$b['batterie']; }
    if (isset($b['sf']))      { $fields[] = 'sf=?';      $params[] = $b['sf']; }
    if (isset($b['statut']))  { $fields[] = 'statut=?';  $params[] = $b['statut']; }
    if (!$fields) err('Aucune donnée à mettre à jour.');

    $params[] = $id;
    $db->prepare("UPDATE noeuds_iot SET ".implode(',',$fields)." WHERE id=?")->execute($params);
    ok(['message' => 'Nœud mis à jour.']);
}

// ═══════════════════════════════════════════════════════════
//  TIMELINE
// ═══════════════════════════════════════════════════════════
elseif ($action === 'timeline' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $db   = getDB();
    $rows = $db->query("SELECT * FROM timeline ORDER BY created_at DESC LIMIT 10")->fetchAll();
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $ts = strtotime($r['created_at']);
        $diff = time() - $ts;
        $r['time_label'] = $diff < 3600
            ? round($diff/60).'min'
            : ($diff < 86400 ? round($diff/3600).'h' : date('d/m', $ts));
    }
    ok(['timeline' => $rows]);
}

elseif ($action === 'timeline_add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $b = body();
    $db = getDB();
    $titre     = trim($b['titre'] ?? '');
    $sous      = trim($b['sous_titre'] ?? '');
    $icone     = trim($b['icone'] ?? '📡');
    $couleur   = trim($b['couleur_bg'] ?? '#e0f2fe');
    if (!$titre) err('Titre requis.');
    $db->prepare("INSERT INTO timeline (icone, couleur_bg, titre, sous_titre) VALUES (?,?,?,?)")
       ->execute([$icone, $couleur, $titre, $sous?:null]);
    ok(['id' => (int)$db->lastInsertId()], 201);
}

// ═══════════════════════════════════════════════════════════
//  PRÉDICTIONS RF
// ═══════════════════════════════════════════════════════════
elseif ($action === 'rf_history' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $db   = getDB();
    $rows = $db->query("SELECT * FROM predictions_rf ORDER BY created_at DESC LIMIT 20")->fetchAll();
    foreach ($rows as &$r) {
        $r['id']        = (int)$r['id'];
        $r['confiance'] = (int)$r['confiance'];
        $ts = strtotime($r['created_at']);
        $r['time_label']= date('d/m/Y H:i', $ts);
    }
    ok(['predictions' => $rows]);
}

elseif ($action === 'rf_save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $b  = body();
    $db = getDB();

    $culture = trim($b['culture'] ?? ''); $emoji = trim($b['emoji'] ?? '🌾');
    $conf    = (int)($b['confiance'] ?? 0);
    $ph      = isset($b['ph'])            ? (float)$b['ph']             : null;
    $hs      = isset($b['humidite_sol'])  ? (int)$b['humidite_sol']     : null;
    $n       = isset($b['azote'])         ? (int)$b['azote']            : null;
    $temp    = isset($b['temperature'])   ? (float)$b['temperature']    : null;
    $rain    = isset($b['precipitations'])? (int)$b['precipitations']   : null;
    $ha      = isset($b['humidite_air'])  ? (int)$b['humidite_air']     : null;
    $p       = isset($b['phosphore'])     ? (int)$b['phosphore']        : null;
    $k       = isset($b['potassium'])     ? (int)$b['potassium']        : null;

    if (!$culture) err('Culture requise.');

    $db->prepare("INSERT INTO predictions_rf
        (culture,emoji,confiance,ph,humidite_sol,azote,temperature,precipitations,humidite_air,phosphore,potassium)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)")
       ->execute([$culture,$emoji,$conf,$ph,$hs,$n,$temp,$rain,$ha,$p,$k]);

    // Ajouter dans la timeline
    $db->prepare("INSERT INTO timeline (icone,couleur_bg,titre,sous_titre) VALUES ('🌲','#f0fdf4',?,?)")
       ->execute(["RF — $culture recommandé", "Confiance : {$conf}%"]);

    ok(['id' => (int)$db->lastInsertId()], 201);
}

// ═══════════════════════════════════════════════════════════
//  STATISTIQUES GLOBALES
// ═══════════════════════════════════════════════════════════
elseif ($action === 'stats' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $db = getDB();
    $nb_noeuds    = $db->query("SELECT COUNT(*) FROM noeuds_iot WHERE statut='online'")->fetchColumn();
    $nb_alertes   = $db->query("SELECT COUNT(*) FROM alertes WHERE lue=0")->fetchColumn();
    $nb_mesures   = $db->query("SELECT COUNT(*) FROM capteurs WHERE created_at >= NOW()-INTERVAL 24 HOUR")->fetchColumn();
    $last_rf      = $db->query("SELECT culture,emoji,confiance FROM predictions_rf ORDER BY id DESC LIMIT 1")->fetch();
    $bat_faible   = $db->query("SELECT COUNT(*) FROM noeuds_iot WHERE batterie<20")->fetchColumn();

    ok([
        'noeuds_actifs' => (int)$nb_noeuds,
        'alertes_actives'=> (int)$nb_alertes,
        'mesures_24h'   => (int)$nb_mesures,
        'derniere_rf'   => $last_rf ?: null,
        'batterie_faible'=> (int)$bat_faible,
    ]);
}

else {
    err('Action non reconnue: '.$action, 404);
}
