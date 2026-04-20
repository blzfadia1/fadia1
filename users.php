<?php
// ============================================================
//  users.php — AgriSmart SÉCURISÉ
//  ✅ Sessions PHP  ✅ Rate limiting  ✅ Rôles vérifiés
// ============================================================
ob_start();
@error_reporting(0);
@ini_set('display_errors', '0');
@ini_set('display_startup_errors', '0');
ob_end_clean();
ob_start();

// Démarrer session avant tout header
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 3600,
        'path'     => '/',
        'secure'   => false,   // true en HTTPS/production
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Connexion PDO ────────────────────────────────────────────
function getConn(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $pdo = new PDO(
        'mysql:host=localhost;dbname=agrismart;charset=utf8mb4',
        'root', '',
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
    return $pdo;
}

// ── Helpers ──────────────────────────────────────────────────
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

// ── Rate Limiting anti brute-force ──────────────────────────
function checkLoginRateLimit(): void {
    $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = 'login_attempts_' . md5($ip);

    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = ['count' => 0, 'start' => time()];
    }

    $d = &$_SESSION[$key];

    // Réinitialiser la fenêtre après 5 minutes
    if ((time() - $d['start']) > 300) {
        $d = ['count' => 0, 'start' => time()];
    }

    $d['count']++;

    // Bloquer après 5 tentatives
    if ($d['count'] > 5) {
        $wait = 300 - (time() - $d['start']);
        jsErr("Trop de tentatives de connexion. Réessayez dans {$wait} secondes.", 429);
    }
}

function resetLoginRateLimit(): void {
    $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = 'login_attempts_' . md5($ip);
    unset($_SESSION[$key]);
}

// ── Vérification d'authentification ─────────────────────────
/**
 * Retourne les infos de l'utilisateur connecté ou envoie une erreur 401.
 * @param array $roles  Tableau vide = tout rôle accepté
 */
function requireAuth(array $roles = []): array {
    if (empty($_SESSION['user_id'])) {
        jsErr('Non authentifié. Veuillez vous connecter.', 401);
    }
    // Expiration de session
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > 3600) {
        session_unset();
        session_destroy();
        jsErr('Session expirée. Veuillez vous reconnecter.', 401);
    }
    $_SESSION['last_activity'] = time();

    if (!empty($roles) && !in_array($_SESSION['user_role'], $roles)) {
        jsErr('Accès refusé : droits insuffisants.', 403);
    }

    return [
        'id'    => $_SESSION['user_id'],
        'login' => $_SESSION['user_login'],
        'role'  => $_SESSION['user_role'],
    ];
}

// ── Tables ───────────────────────────────────────────────────
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
        user_id    INT DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");

    $nb = (int)$db->query("SELECT COUNT(*) FROM utilisateurs")->fetchColumn();
    if ($nb === 0) {
        $h    = password_hash('1234', PASSWORD_BCRYPT);
        $stmt = $db->prepare("INSERT INTO utilisateurs
            (prenom,nom,login,mot_de_passe,role,zone,telephone,statut,date_creation)
            VALUES (?,?,?,?,?,?,?,?,?)");
        $rows = [
            ['Ahmed',  'Benali',  'ahmed',      $h, 'Agriculteur', 'Zone A-B',     '+213 550 12 34 56', 'Actif',   '2024-01-10'],
            ['Karim',  'Hadj',    'technicien', $h, 'Technicien',  'Tout le site', '+213 661 98 76 54', 'Actif',   '2024-01-12'],
            ['Sara',   'Amrani',  'sara',       $h, 'Agriculteur', 'Zone C',       '+213 770 45 67 89', 'Actif',   '2024-02-03'],
            ['Youcef', 'Kader',   'youcef',     $h, 'Agriculteur', 'Zone D-E',     '+213 555 22 11 00', 'Inactif', '2024-02-14'],
            ['Nadia',  'Rahmani', 'nadia',      $h, 'Technicien',  'Zone B-C',     '+213 660 33 44 55', 'Actif',   '2024-03-01'],
            ['Admin',  '',        'admin',      $h, 'Admin',       'Tout',         '+213 700 00 00 01', 'Actif',   '2024-01-01'],
        ];
        foreach ($rows as $r) $stmt->execute($r);
    }
}

function addLog(PDO $db, string $type, string $msg, ?int $userId = null): void {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $db->prepare("INSERT INTO journal_systeme (type, message, user_id, ip_address) VALUES (?,?,?,?)")
           ->execute([$type, $msg, $userId, $ip]);
    } catch (Exception $e) {}
}

// ── MAIN ─────────────────────────────────────────────────────
try {
    $db     = getConn();
    ensureTables($db);

    $action = isset($_GET['action']) ? trim((string)$_GET['action']) : '';
    $id     = isset($_GET['id'])     ? (int)$_GET['id']             : 0;
    $method = $_SERVER['REQUEST_METHOD'];

    // ══════════════════════════════════════════
    //  LOGIN — PUBLIC (avec rate limiting)
    // ══════════════════════════════════════════
    if ($action === 'login' && $method === 'POST') {
        checkLoginRateLimit();

        $b     = getBody();
        $login = strtolower(trim((string)($b['login'] ?? '')));
        $pass  = (string)($b['mot_de_passe'] ?? '');

        if ($login === '' || $pass === '') {
            jsErr('Login et mot de passe requis.');
        }
        // Longueur max pour éviter les attaques par long input
        if (strlen($login) > 100 || strlen($pass) > 128) {
            jsErr('Identifiant ou mot de passe incorrect.');
        }

        $s = $db->prepare("SELECT id,prenom,nom,login,mot_de_passe,role,statut FROM utilisateurs WHERE LOWER(login)=?");
        $s->execute([$login]);
        $u = $s->fetch();

        // Toujours vérifier le hash même si l'utilisateur n'existe pas (prévient timing attack)
        $dummy_hash = '$2y$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
        $hash_to_check = $u ? $u['mot_de_passe'] : $dummy_hash;
        $password_ok   = password_verify($pass, $hash_to_check);

        if (!$u || !$password_ok) {
            addLog($db, 'warn', "Echec connexion: login='$login'");
            jsErr('Identifiant ou mot de passe incorrect.');
        }
        if ($u['statut'] === 'Inactif')  jsErr("Compte désactivé. Contactez l'administrateur.");
        if ($u['statut'] === 'Suspendu') jsErr("Compte suspendu. Contactez l'administrateur.");

        // ✅ Connexion réussie — créer la session
        resetLoginRateLimit();

        // Régénérer l'ID de session pour prévenir le session fixation
        session_regenerate_id(true);

        $_SESSION['user_id']       = (int)$u['id'];
        $_SESSION['user_login']    = $u['login'];
        $_SESSION['user_role']     = strtolower($u['role']); // 'admin', 'agriculteur', 'technicien'
        $_SESSION['user_role_label'] = $u['role'];           // 'Admin', 'Agriculteur', 'Technicien'
        $_SESSION['last_activity'] = time();

        $mapRole  = ['Admin' => 'admin', 'Agriculteur' => 'agriculteur', 'Technicien' => 'technicien'];
        $roleJS   = $mapRole[$u['role']] ?? 'agriculteur';
        $mapBadge = [
            'admin'       => ['badge-admin', 'ADMIN'],
            'agriculteur' => ['badge-agri',  'AGRICULTEUR'],
            'technicien'  => ['badge-tech',  'TECHNICIEN'],
        ];
        [$bc, $bl] = $mapBadge[$roleJS];

        addLog($db, 'ok', "Connexion: {$u['prenom']} {$u['nom']} ({$u['role']})", (int)$u['id']);

        jsOk(['user' => [
            'id'         => (int)$u['id'],
            'login'      => $u['login'],
            'nom'        => trim($u['prenom'] . ' ' . $u['nom']),
            'prenom'     => $u['prenom'],
            'role'       => $roleJS,
            'role_label' => $u['role'],
            'avatar'     => mb_strtoupper(mb_substr($u['prenom'], 0, 1)),
            'badgeClass' => $bc,
            'badgeLabel' => $bl,
        ]]);
    }

    // ══════════════════════════════════════════
    //  LOGOUT
    // ══════════════════════════════════════════
    elseif ($action === 'logout' && $method === 'POST') {
        session_unset();
        session_destroy();
        jsOk(['message' => 'Déconnecté avec succès.']);
    }

    // ══════════════════════════════════════════
    //  STATS — Admin seulement
    // ══════════════════════════════════════════
    elseif ($action === 'stats') {
        requireAuth(['admin']);
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

    // ══════════════════════════════════════════
    //  LIST — Admin seulement
    // ══════════════════════════════════════════
    elseif ($action === 'list') {
        requireAuth(['admin']);

        $role  = isset($_GET['role']) ? trim((string)$_GET['role']) : '';
        $q     = isset($_GET['q'])    ? trim((string)$_GET['q'])    : '';
        $sql   = "SELECT id,prenom,nom,login,role,zone,telephone,statut,date_creation FROM utilisateurs";
        $w = []; $p = [];
        if ($role !== '' && $role !== 'tous') { $w[] = 'role=?'; $p[] = $role; }
        if ($q !== '') {
            $like = '%' . substr($q, 0, 50) . '%';
            $w[] = '(prenom LIKE ? OR nom LIKE ? OR login LIKE ? OR zone LIKE ?)';
            $p   = array_merge($p, [$like, $like, $like, $like]);
        }
        if ($w) $sql .= ' WHERE ' . implode(' AND ', $w);
        $sql .= ' ORDER BY id ASC';
        $s = $db->prepare($sql);
        $s->execute($p);
        $rows = $s->fetchAll();
        foreach ($rows as &$r) $r['id'] = (int)$r['id'];
        $total = (int)$db->query("SELECT COUNT(*) FROM utilisateurs")->fetchColumn();
        jsOk(['utilisateurs' => $rows, 'total' => $total]);
    }

    // ══════════════════════════════════════════
    //  CREATE — Admin seulement
    // ══════════════════════════════════════════
    elseif ($action === 'create' && $method === 'POST') {
        $auth   = requireAuth(['admin']);
        $b      = getBody();
        $prenom = trim((string)($b['prenom']    ?? ''));
        $nom    = trim((string)($b['nom']        ?? ''));
        $login  = trim((string)($b['login']      ?? ''));
        $pass   = (string)($b['mot_de_passe']    ?? '');
        $role   = in_array($b['role'] ?? '', ['Admin', 'Agriculteur', 'Technicien']) ? $b['role'] : 'Agriculteur';
        $zone   = trim((string)($b['zone']       ?? ''));
        $tel    = trim((string)($b['telephone']  ?? ''));
        $statut = in_array($b['statut'] ?? '', ['Actif', 'Inactif', 'Suspendu']) ? $b['statut'] : 'Actif';

        // Validation
        if ($prenom === '')        jsErr('Prénom obligatoire.');
        if ($login  === '')        jsErr('Identifiant obligatoire.');
        if ($pass   === '')        jsErr('Mot de passe obligatoire.');
        if (strlen($pass) < 6)    jsErr('Mot de passe trop court (minimum 6 caractères).');
        if (strlen($prenom) > 100) jsErr('Prénom trop long.');
        if (strlen($login)  > 100) jsErr('Identifiant trop long.');
        if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $login)) jsErr("L'identifiant ne peut contenir que des lettres, chiffres, tirets et points.");

        $c = $db->prepare("SELECT id FROM utilisateurs WHERE LOWER(login)=?");
        $c->execute([strtolower($login)]);
        if ($c->fetch()) jsErr('Cet identifiant existe déjà.');

        $db->prepare("INSERT INTO utilisateurs (prenom,nom,login,mot_de_passe,role,zone,telephone,statut) VALUES (?,?,?,?,?,?,?,?)")
           ->execute([$prenom, $nom, $login, password_hash($pass, PASSWORD_BCRYPT), $role, $zone, $tel, $statut]);

        $newId = (int)$db->lastInsertId();
        addLog($db, 'ok', "Compte créé: $prenom $nom ($role) par {$auth['login']}", $auth['id']);
        jsOk(['id' => $newId, 'message' => "Compte créé pour $prenom $nom."], 201);
    }

    // ══════════════════════════════════════════
    //  UPDATE — Admin seulement
    // ══════════════════════════════════════════
    elseif ($action === 'update' && $id > 0) {
        $auth = requireAuth(['admin']);
        $b    = getBody();
        $s    = $db->prepare("SELECT id,login,prenom,nom FROM utilisateurs WHERE id=?");
        $s->execute([$id]);
        $ex = $s->fetch();
        if (!$ex) jsErr('Utilisateur introuvable.', 404);

        $prenom = trim((string)($b['prenom']   ?? $ex['prenom']));
        $nom    = trim((string)($b['nom']       ?? ''));
        $login  = trim((string)($b['login']     ?? $ex['login']));
        $zone   = trim((string)($b['zone']      ?? ''));
        $tel    = trim((string)($b['telephone'] ?? ''));
        $role   = in_array($b['role'] ?? '', ['Admin', 'Agriculteur', 'Technicien']) ? $b['role'] : null;
        $statut = in_array($b['statut'] ?? '', ['Actif', 'Inactif', 'Suspendu'])     ? $b['statut'] : null;

        if ($prenom === '') jsErr('Prénom obligatoire.');
        if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $login)) jsErr("Identifiant invalide.");

        if (strtolower($login) !== strtolower($ex['login'])) {
            $dup = $db->prepare("SELECT id FROM utilisateurs WHERE LOWER(login)=? AND id!=?");
            $dup->execute([strtolower($login), $id]);
            if ($dup->fetch()) jsErr('Cet identifiant existe déjà.');
        }

        $f = ['prenom=?', 'nom=?', 'login=?', 'zone=?', 'telephone=?'];
        $p = [$prenom, $nom, $login, $zone, $tel];
        if ($role)   { $f[] = 'role=?';   $p[] = $role; }
        if ($statut) { $f[] = 'statut=?'; $p[] = $statut; }

        $np = (string)($b['mot_de_passe'] ?? '');
        if ($np !== '' && strlen($np) >= 6) {
            $f[] = 'mot_de_passe=?';
            $p[] = password_hash($np, PASSWORD_BCRYPT);
        } elseif ($np !== '' && strlen($np) < 6) {
            jsErr('Nouveau mot de passe trop court (minimum 6 caractères).');
        }

        $p[] = $id;
        $db->prepare("UPDATE utilisateurs SET " . implode(',', $f) . " WHERE id=?")->execute($p);
        addLog($db, 'ok', "Modifié: $prenom $nom (ID:$id) par {$auth['login']}", $auth['id']);
        jsOk(['message' => "$prenom $nom mis à jour."]);
    }

    // ══════════════════════════════════════════
    //  DELETE — Admin seulement
    // ══════════════════════════════════════════
    elseif ($action === 'delete' && $id > 0) {
        $auth = requireAuth(['admin']);
        $s = $db->prepare("SELECT id,prenom,nom,login FROM utilisateurs WHERE id=?");
        $s->execute([$id]);
        $u = $s->fetch();
        if (!$u) jsErr('Introuvable.', 404);
        if ($u['login'] === 'admin') jsErr('Impossible de supprimer le compte admin principal.');
        // Un admin ne peut pas se supprimer lui-même
        if ($u['id'] == $auth['id']) jsErr('Vous ne pouvez pas supprimer votre propre compte.');

        $db->prepare("DELETE FROM utilisateurs WHERE id=?")->execute([$id]);
        addLog($db, 'warn', "Supprimé: {$u['prenom']} {$u['nom']} ({$u['login']}) par {$auth['login']}", $auth['id']);
        jsOk(['message' => "Compte {$u['prenom']} {$u['nom']} supprimé."]);
    }

    // ══════════════════════════════════════════
    //  JOURNAL — Admin seulement
    // ══════════════════════════════════════════
    elseif ($action === 'journal') {
        requireAuth(['admin']);
        $rows = $db->query("SELECT * FROM journal_systeme ORDER BY created_at DESC LIMIT 100")->fetchAll();
        foreach ($rows as &$r) $r['id'] = (int)$r['id'];
        jsOk(['journal' => $rows]);
    }

    elseif ($action === 'journal_clear' && $method === 'POST') {
        $auth = requireAuth(['admin']);
        $db->exec("DELETE FROM journal_systeme WHERE 1");
        addLog($db, 'warn', "Journal vidé par {$auth['login']}", $auth['id']);
        jsOk(['message' => 'Journal vidé.']);
    }

    // ══════════════════════════════════════════
    //  CHECK SESSION — utilisé par le frontend
    // ══════════════════════════════════════════
    elseif ($action === 'check_session') {
        if (!empty($_SESSION['user_id'])) {
            jsOk(['authenticated' => true, 'role' => $_SESSION['user_role']]);
        } else {
            jsOk(['authenticated' => false]);
        }
    }

    else {
        jsErr('Action inconnue: ' . htmlspecialchars($action), 404);
    }

} catch (PDOException $e) {
    jsErr('Erreur base de données.', 500);
} catch (Exception $e) {
    jsErr('Erreur serveur.', 500);
}
