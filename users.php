<?php
// ============================================================
// users.php — AUTONOME (pas de require config.php)
// ============================================================
ob_start();
@error_reporting(0);
@ini_set('display_errors','0');
@ini_set('display_startup_errors','0');

// Vider TOUT avant d'écrire les headers
ob_end_clean();
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); exit;
}

// ── Connexion PDO locale ──────────────────────────────────
function getConn() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $pdo = new PDO(
        'mysql:host=localhost;dbname=agrismart;charset=utf8mb4',
        'root', '',
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    return $pdo;
}

// ── Helpers JSON ──────────────────────────────────────────
function jsOk(array $extra = [], int $code = 200): void {
    ob_clean();
    http_response_code($code);
    die(json_encode(['success' => true] + $extra, JSON_UNESCAPED_UNICODE));
}
function jsErr(string $msg, int $code = 400): void {
    ob_clean();
    http_response_code($code);
    die(json_encode(['success' => false, 'message' => $msg], JSON_UNESCAPED_UNICODE));
}
function getBody(): array {
    $raw = file_get_contents('php://input');
    $dec = json_decode($raw, true);
    return is_array($dec) ? $dec : [];
}

// ── Créer la table si elle n'existe pas ───────────────────
function ensureTables(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS utilisateurs (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        prenom        VARCHAR(100) NOT NULL,
        nom           VARCHAR(100) NOT NULL DEFAULT '',
        login         VARCHAR(100) NOT NULL UNIQUE,
        mot_de_passe  VARCHAR(255) NOT NULL,
        role          ENUM('Admin','Agriculteur','Technicien') NOT NULL DEFAULT 'Agriculteur',
        zone          VARCHAR(200) NOT NULL DEFAULT '',
        telephone     VARCHAR(50)  NOT NULL DEFAULT '',
        statut        ENUM('Actif','Inactif','Suspendu') NOT NULL DEFAULT 'Actif',
        date_creation DATE         NOT NULL DEFAULT (CURDATE()),
        updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");

    $db->exec("CREATE TABLE IF NOT EXISTS journal_systeme (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        type       VARCHAR(10) DEFAULT 'info',
        message    TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");

    // Insérer les comptes par défaut si la table est vide
    $nb = (int)$db->query("SELECT COUNT(*) FROM utilisateurs")->fetchColumn();
    if ($nb === 0) {
        $h = password_hash('1234', PASSWORD_BCRYPT);
        $stmt = $db->prepare("INSERT INTO utilisateurs
            (prenom,nom,login,mot_de_passe,role,zone,telephone,statut,date_creation)
            VALUES (?,?,?,?,?,?,?,?,?)");
        $rows = [
            ['Ahmed',  'Benali',  'ahmed',       $h, 'Agriculteur', 'Zone A-B',    '+213 550 12 34 56', 'Actif',   '2024-01-10'],
            ['Karim',  'Hadj',    'technicien',  $h, 'Technicien',  'Tout le site','+213 661 98 76 54', 'Actif',   '2024-01-12'],
            ['Sara',   'Amrani',  'sara',        $h, 'Agriculteur', 'Zone C',      '+213 770 45 67 89', 'Actif',   '2024-02-03'],
            ['Youcef', 'Kader',   'youcef',      $h, 'Agriculteur', 'Zone D-E',    '+213 555 22 11 00', 'Inactif', '2024-02-14'],
            ['Nadia',  'Rahmani', 'nadia',       $h, 'Technicien',  'Zone B-C',    '+213 660 33 44 55', 'Actif',   '2024-03-01'],
            ['Admin',  '',        'admin',       $h, 'Admin',       'Tout',        '+213 700 00 00 01', 'Actif',   '2024-01-01'],
        ];
        foreach ($rows as $r) $stmt->execute($r);
    }
}

function addLog(PDO $db, string $type, string $msg): void {
    try {
        $db->prepare("INSERT INTO journal_systeme (type,message) VALUES (?,?)")->execute([$type,$msg]);
    } catch (Exception $e) {}
}

// ── Main ──────────────────────────────────────────────────
try {
    $db     = getConn();
    ensureTables($db);

    $action = isset($_GET['action']) ? trim((string)$_GET['action']) : '';
    $id     = isset($_GET['id'])     ? (int)$_GET['id']             : 0;
    $method = $_SERVER['REQUEST_METHOD'];

    // STATS
    if ($action === 'stats') {
        jsOk([
            'total'        => (int)$db->query("SELECT COUNT(*) FROM utilisateurs")->fetchColumn(),
            'agriculteurs' => (int)$db->query("SELECT COUNT(*) FROM utilisateurs WHERE role='Agriculteur'")->fetchColumn(),
            'techniciens'  => (int)$db->query("SELECT COUNT(*) FROM utilisateurs WHERE role='Technicien'")->fetchColumn(),
            'admins'       => (int)$db->query("SELECT COUNT(*) FROM utilisateurs WHERE role='Admin'")->fetchColumn(),
            'actifs'       => (int)$db->query("SELECT COUNT(*) FROM utilisateurs WHERE statut='Actif'")->fetchColumn(),
            'inactifs'     => (int)$db->query("SELECT COUNT(*) FROM utilisateurs WHERE statut='Inactif'")->fetchColumn(),
            'suspendus'    => (int)$db->query("SELECT COUNT(*) FROM utilisateurs WHERE statut='Suspendu'")->fetchColumn(),
        ]);
    }

    // LIST
    elseif ($action === 'list') {
        $role  = isset($_GET['role']) ? trim((string)$_GET['role']) : '';
        $q     = isset($_GET['q'])    ? trim((string)$_GET['q'])    : '';
        $sql   = "SELECT id,prenom,nom,login,role,zone,telephone,statut,date_creation FROM utilisateurs";
        $w = []; $p = [];
        if ($role !== '' && $role !== 'tous') { $w[] = 'role=?'; $p[] = $role; }
        if ($q !== '') {
            $like = '%'.$q.'%';
            $w[] = '(prenom LIKE ? OR nom LIKE ? OR login LIKE ? OR zone LIKE ?)';
            $p   = array_merge($p, [$like,$like,$like,$like]);
        }
        if ($w) $sql .= ' WHERE '.implode(' AND ',$w);
        $sql .= ' ORDER BY id ASC';
        $s = $db->prepare($sql); $s->execute($p);
        $rows = $s->fetchAll();
        foreach ($rows as &$r) $r['id'] = (int)$r['id'];
        $total = (int)$db->query("SELECT COUNT(*) FROM utilisateurs")->fetchColumn();
        jsOk(['utilisateurs' => $rows, 'total' => $total]);
    }

    // LOGIN
    elseif ($action === 'login' && $method === 'POST') {
        $b     = getBody();
        $login = strtolower(trim((string)($b['login'] ?? '')));
        $pass  = (string)($b['mot_de_passe'] ?? '');
        if ($login === '' || $pass === '') jsErr('Login et mot de passe requis.');

        $s = $db->prepare("SELECT id,prenom,nom,login,mot_de_passe,role,statut FROM utilisateurs WHERE LOWER(login)=?");
        $s->execute([$login]);
        $u = $s->fetch();

        if (!$u) jsErr('Identifiant ou mot de passe incorrect.');
        if (!password_verify($pass, $u['mot_de_passe'])) jsErr('Identifiant ou mot de passe incorrect.');
        if ($u['statut'] === 'Inactif')  jsErr('Compte desactive. Contactez l\'administrateur.');
        if ($u['statut'] === 'Suspendu') jsErr('Compte suspendu. Contactez l\'administrateur.');

        $mapRole = ['Admin'=>'admin','Agriculteur'=>'agriculteur','Technicien'=>'technicien'];
        $roleJS  = $mapRole[$u['role']] ?? 'agriculteur';
        $mapBadge = [
            'admin'       => ['badge-admin','ADMIN'],
            'agriculteur' => ['badge-agri','AGRICULTEUR'],
            'technicien'  => ['badge-tech','TECHNICIEN'],
        ];
        [$bc,$bl] = $mapBadge[$roleJS];

        addLog($db, 'ok', 'Connexion: '.$u['prenom'].' '.$u['nom'].' ('.$u['role'].')');

        jsOk(['user' => [
            'id'         => (int)$u['id'],
            'login'      => $u['login'],
            'nom'        => trim($u['prenom'].' '.$u['nom']),
            'prenom'     => $u['prenom'],
            'role'       => $roleJS,
            'role_label' => $u['role'],
            'avatar'     => mb_strtoupper(mb_substr($u['prenom'],0,1)),
            'badgeClass' => $bc,
            'badgeLabel' => $bl,
        ]]);
    }

    // CREATE
    elseif ($action === 'create' && $method === 'POST') {
        $b      = getBody();
        $prenom = trim((string)($b['prenom']       ?? ''));
        $nom    = trim((string)($b['nom']           ?? ''));
        $login  = trim((string)($b['login']         ?? ''));
        $pass   = (string)($b['mot_de_passe']       ?? '');
        $role   = in_array($b['role']??'',['Admin','Agriculteur','Technicien']) ? $b['role'] : 'Agriculteur';
        $zone   = trim((string)($b['zone']          ?? ''));
        $tel    = trim((string)($b['telephone']     ?? ''));
        $statut = in_array($b['statut']??'',['Actif','Inactif','Suspendu']) ? $b['statut'] : 'Actif';

        if ($prenom === '') jsErr('Prenom obligatoire.');
        if ($login  === '') jsErr('Identifiant obligatoire.');
        if ($pass   === '') jsErr('Mot de passe obligatoire.');
        if (strlen($pass) < 4) jsErr('Mot de passe trop court (min 4 caracteres).');

        $c = $db->prepare("SELECT id FROM utilisateurs WHERE LOWER(login)=?");
        $c->execute([strtolower($login)]);
        if ($c->fetch()) jsErr('Cet identifiant existe deja.');

        $db->prepare("INSERT INTO utilisateurs (prenom,nom,login,mot_de_passe,role,zone,telephone,statut) VALUES (?,?,?,?,?,?,?,?)")
           ->execute([$prenom,$nom,$login,password_hash($pass,PASSWORD_BCRYPT),$role,$zone,$tel,$statut]);

        $newId = (int)$db->lastInsertId();
        addLog($db,'ok',"Compte cree: $prenom $nom ($role)");
        jsOk(['id' => $newId, 'message' => "Compte cree pour $prenom $nom."], 201);
    }

    // UPDATE
    elseif ($action === 'update' && $id > 0) {
        $b  = getBody();
        $s  = $db->prepare("SELECT id,login,prenom,nom FROM utilisateurs WHERE id=?");
        $s->execute([$id]); $ex = $s->fetch();
        if (!$ex) jsErr('Utilisateur introuvable.', 404);

        $prenom = trim((string)($b['prenom']    ?? $ex['prenom']));
        $nom    = trim((string)($b['nom']        ?? ''));
        $login  = trim((string)($b['login']      ?? $ex['login']));
        $zone   = trim((string)($b['zone']       ?? ''));
        $tel    = trim((string)($b['telephone']  ?? ''));
        $role   = in_array($b['role']??'',['Admin','Agriculteur','Technicien']) ? $b['role'] : null;
        $statut = in_array($b['statut']??'',['Actif','Inactif','Suspendu'])     ? $b['statut'] : null;

        if ($prenom === '') jsErr('Prenom obligatoire.');

        if (strtolower($login) !== strtolower($ex['login'])) {
            $dup = $db->prepare("SELECT id FROM utilisateurs WHERE LOWER(login)=? AND id!=?");
            $dup->execute([strtolower($login),$id]);
            if ($dup->fetch()) jsErr('Cet identifiant existe deja.');
        }

        $f = ['prenom=?','nom=?','login=?','zone=?','telephone=?'];
        $p = [$prenom,$nom,$login,$zone,$tel];
        if ($role)   { $f[] = 'role=?';   $p[] = $role;   }
        if ($statut) { $f[] = 'statut=?'; $p[] = $statut; }
        $np = (string)($b['mot_de_passe'] ?? '');
        if ($np !== '' && strlen($np) >= 4) { $f[] = 'mot_de_passe=?'; $p[] = password_hash($np,PASSWORD_BCRYPT); }
        $p[] = $id;
        $db->prepare("UPDATE utilisateurs SET ".implode(',',$f)." WHERE id=?")->execute($p);
        addLog($db,'ok',"Modifie: $prenom $nom (ID:$id)");
        jsOk(['message' => "$prenom $nom mis a jour."]);
    }

    // DELETE
    elseif ($action === 'delete' && $id > 0) {
        $s = $db->prepare("SELECT id,prenom,nom,login FROM utilisateurs WHERE id=?");
        $s->execute([$id]); $u = $s->fetch();
        if (!$u) jsErr('Introuvable.', 404);
        if ($u['login'] === 'admin') jsErr('Impossible de supprimer le compte admin principal.');
        $db->prepare("DELETE FROM utilisateurs WHERE id=?")->execute([$id]);
        addLog($db,'warn',"Supprime: {$u['prenom']} {$u['nom']} ({$u['login']})");
        jsOk(['message' => "Compte {$u['prenom']} {$u['nom']} supprime."]);
    }

    // JOURNAL
    elseif ($action === 'journal') {
        $rows = $db->query("SELECT * FROM journal_systeme ORDER BY created_at DESC LIMIT 50")->fetchAll();
        foreach ($rows as &$r) $r['id'] = (int)$r['id'];
        jsOk(['journal' => $rows]);
    }

    elseif ($action === 'journal_clear') {
        $db->exec("DELETE FROM journal_systeme WHERE 1");
        jsOk(['message' => 'Journal vide.']);
    }

    else {
        jsErr('Action inconnue: '.htmlspecialchars($action), 404);
    }

} catch (PDOException $e) {
    jsErr('Erreur base de donnees: '.$e->getMessage(), 500);
} catch (Exception $e) {
    jsErr('Erreur serveur: '.$e->getMessage(), 500);
}
