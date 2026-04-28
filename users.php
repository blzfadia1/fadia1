<?php
// ============================================================
//  users.php — AgriSmart SÉCURISÉ
//  ✅ Sessions PHP  ✅ Rate limiting  ✅ Rôles vérifiés
//  ✅ NOUVEAU : forgot_password + reset_password + verify_token
// ============================================================
ob_start();
@error_reporting(0);
@ini_set('display_errors', '0');
@ini_set('display_startup_errors', '0');
ob_end_clean();
ob_start();

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 3600,
        'path'     => '/',
        'secure'   => false,
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

// ── Rate Limiting ─────────────────────────────────────────────
function checkLoginRateLimit(): void {
    $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = 'login_attempts_' . md5($ip);
    if (!isset($_SESSION[$key])) $_SESSION[$key] = ['count' => 0, 'start' => time()];
    $d = &$_SESSION[$key];
    if ((time() - $d['start']) > 300) $d = ['count' => 0, 'start' => time()];
    $d['count']++;
    if ($d['count'] > 5) {
        $wait = 300 - (time() - $d['start']);
        jsErr("Trop de tentatives. Réessayez dans {$wait} secondes.", 429);
    }
}

function resetLoginRateLimit(): void {
    $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = 'login_attempts_' . md5($ip);
    unset($_SESSION[$key]);
}

// ── Auth ──────────────────────────────────────────────────────
function requireAuth(array $roles = []): array {
    if (empty($_SESSION['user_id'])) jsErr('Non authentifié.', 401);
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > 3600) {
        session_unset(); session_destroy();
        jsErr('Session expirée. Reconnectez-vous.', 401);
    }
    $_SESSION['last_activity'] = time();
    if (!empty($roles) && !in_array($_SESSION['user_role'], $roles)) jsErr('Accès refusé.', 403);
    return ['id' => $_SESSION['user_id'], 'login' => $_SESSION['user_login'], 'role' => $_SESSION['user_role']];
}

// ── Tables ────────────────────────────────────────────────────
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

    // ── NOUVELLE TABLE : tokens de réinitialisation ───────────
    $db->exec("CREATE TABLE IF NOT EXISTS reset_tokens (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    INT NOT NULL,
        token      VARCHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used       TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token   (token),
        INDEX idx_user    (user_id),
        INDEX idx_expires (expires_at)
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

// ── MAIN ──────────────────────────────────────────────────────
try {
    $db     = getConn();
    ensureTables($db);

    $action = isset($_GET['action']) ? trim((string)$_GET['action']) : '';
    $id     = isset($_GET['id'])     ? (int)$_GET['id']             : 0;
    $method = $_SERVER['REQUEST_METHOD'];

    // ══════════════════════════════════════════
    //  LOGIN
    // ══════════════════════════════════════════
    if ($action === 'login' && $method === 'POST') {
        checkLoginRateLimit();
        $b     = getBody();
        $login = strtolower(trim((string)($b['login'] ?? '')));
        $pass  = (string)($b['mot_de_passe'] ?? '');
        if ($login === '' || $pass === '') jsErr('Login et mot de passe requis.');
        if (strlen($login) > 100 || strlen($pass) > 128) jsErr('Identifiant ou mot de passe incorrect.');

        $s = $db->prepare("SELECT id,prenom,nom,login,mot_de_passe,role,statut FROM utilisateurs WHERE LOWER(login)=?");
        $s->execute([$login]);
        $u = $s->fetch();
        $dummy = '$2y$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
        $ok = password_verify($pass, $u ? $u['mot_de_passe'] : $dummy);
        if (!$u || !$ok) { addLog($db, 'warn', "Echec login: '$login'"); jsErr('Identifiant ou mot de passe incorrect.'); }
        if ($u['statut'] === 'Inactif')  jsErr("Compte désactivé. Contactez l'administrateur.");
        if ($u['statut'] === 'Suspendu') jsErr("Compte suspendu. Contactez l'administrateur.");

        resetLoginRateLimit();
        session_regenerate_id(true);
        $_SESSION['user_id']       = (int)$u['id'];
        $_SESSION['user_login']    = $u['login'];
        $_SESSION['user_role']     = strtolower($u['role']);
        $_SESSION['user_role_label'] = $u['role'];
        $_SESSION['last_activity'] = time();

        $mapRole  = ['Admin' => 'admin', 'Agriculteur' => 'agriculteur', 'Technicien' => 'technicien'];
        $roleJS   = $mapRole[$u['role']] ?? 'agriculteur';
        $mapBadge = ['admin' => ['badge-admin','ADMIN'], 'agriculteur' => ['badge-agri','AGRICULTEUR'], 'technicien' => ['badge-tech','TECHNICIEN']];
        [$bc, $bl] = $mapBadge[$roleJS];
        addLog($db, 'ok', "Connexion: {$u['prenom']} {$u['nom']} ({$u['role']})", (int)$u['id']);
        jsOk(['user' => [
            'id' => (int)$u['id'], 'login' => $u['login'],
            'nom' => trim($u['prenom'].' '.$u['nom']), 'prenom' => $u['prenom'],
            'role' => $roleJS, 'role_label' => $u['role'],
            'avatar' => mb_strtoupper(mb_substr($u['prenom'], 0, 1)),
            'badgeClass' => $bc, 'badgeLabel' => $bl,
        ]]);
    }

    // ══════════════════════════════════════════
    //  LOGOUT
    // ══════════════════════════════════════════
    elseif ($action === 'logout' && $method === 'POST') {
        session_unset(); session_destroy();
        jsOk(['message' => 'Déconnecté.']);
    }

    // ══════════════════════════════════════════
    //  FORGOT PASSWORD — Step 1
    //  Vérifie login → génère token → retourne
    //  token directement (pas d'email en XAMPP)
    // ══════════════════════════════════════════
    elseif ($action === 'forgot_password' && $method === 'POST') {
        // Rate limit : max 3 demandes par 10 min par IP
        $ip     = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $rl_key = 'reset_' . md5($ip);
        if (!isset($_SESSION[$rl_key])) $_SESSION[$rl_key] = ['count' => 0, 'start' => time()];
        $rl = &$_SESSION[$rl_key];
        if ((time() - $rl['start']) > 600) $rl = ['count' => 0, 'start' => time()];
        $rl['count']++;
        if ($rl['count'] > 3) jsErr("Trop de tentatives. Réessayez dans quelques minutes.", 429);

        $b     = getBody();
        $login = strtolower(trim((string)($b['login'] ?? '')));

        if ($login === '') jsErr('Identifiant requis.');
        if (strlen($login) > 100) jsErr('Identifiant invalide.');

        // Chercher l'utilisateur
        $s = $db->prepare("SELECT id, prenom, nom, login, statut FROM utilisateurs WHERE LOWER(login)=?");
        $s->execute([$login]);
        $u = $s->fetch();

        // Réponse identique que l'utilisateur existe ou non (sécurité)
        if (!$u || $u['statut'] !== 'Actif') {
            // On ne révèle pas si le login existe
            jsOk([
                'found'   => false,
                'message' => "Si ce compte existe, les instructions de réinitialisation ont été générées."
            ]);
        }

        // Supprimer les anciens tokens non utilisés de cet utilisateur
        $db->prepare("DELETE FROM reset_tokens WHERE user_id=? AND used=0")->execute([$u['id']]);

        // Générer un token sécurisé (64 chars hex)
        $token   = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', time() + 1800); // 30 minutes

        $db->prepare("INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?,?,?)")
           ->execute([$u['id'], $token, $expires]);

        addLog($db, 'info', "Demande reset MDP: {$u['login']}", $u['id']);

        // Retourner le token directement (XAMPP = pas d'email)
        jsOk([
            'found'   => true,
            'token'   => $token,
            'prenom'  => $u['prenom'],
            'expires' => '30 minutes',
            'message' => "Token généré pour {$u['prenom']}. Utilisez-le pour réinitialiser votre mot de passe.",
        ]);
    }

    // ══════════════════════════════════════════
    //  VERIFY TOKEN — Vérifier si token valide
    // ══════════════════════════════════════════
    elseif ($action === 'verify_token') {
        $token = trim((string)($_GET['token'] ?? ''));
        if (strlen($token) !== 64 || !ctype_xdigit($token)) jsErr('Token invalide.', 400);

        $s = $db->prepare("
            SELECT rt.token, rt.expires_at, rt.used, u.prenom, u.nom, u.login
            FROM reset_tokens rt
            JOIN utilisateurs u ON u.id = rt.user_id
            WHERE rt.token = ?
        ");
        $s->execute([$token]);
        $row = $s->fetch();

        if (!$row)                               jsErr('Token invalide ou introuvable.', 404);
        if ($row['used'])                        jsErr('Ce token a déjà été utilisé.', 400);
        if (strtotime($row['expires_at']) < time()) jsErr('Token expiré. Faites une nouvelle demande.', 400);

        jsOk([
            'valid'  => true,
            'prenom' => $row['prenom'],
            'login'  => $row['login'],
        ]);
    }

    // ══════════════════════════════════════════
    //  RESET PASSWORD — Step 2 (nouveau MDP)
    // ══════════════════════════════════════════
    elseif ($action === 'reset_password' && $method === 'POST') {
        $b         = getBody();
        $token     = trim((string)($b['token']         ?? ''));
        $newPass   = (string)($b['mot_de_passe']       ?? '');
        $confirmPass = (string)($b['confirmation']     ?? '');

        // Validations basiques
        if (strlen($token) !== 64 || !ctype_xdigit($token)) jsErr('Token invalide.');
        if ($newPass === '')              jsErr('Le nouveau mot de passe est requis.');
        if (strlen($newPass) < 6)        jsErr('Mot de passe trop court (minimum 6 caractères).');
        if (strlen($newPass) > 128)      jsErr('Mot de passe trop long.');
        if ($newPass !== $confirmPass)   jsErr('Les mots de passe ne correspondent pas.');

        // Vérifier le token
        $s = $db->prepare("
            SELECT rt.id AS rt_id, rt.expires_at, rt.used, u.id AS user_id, u.prenom, u.login
            FROM reset_tokens rt
            JOIN utilisateurs u ON u.id = rt.user_id
            WHERE rt.token = ?
        ");
        $s->execute([$token]);
        $row = $s->fetch();

        if (!$row)                                   jsErr('Token invalide.', 400);
        if ($row['used'])                            jsErr('Ce token a déjà été utilisé.', 400);
        if (strtotime($row['expires_at']) < time())  jsErr('Token expiré. Refaites une demande.', 400);

        // Mettre à jour le mot de passe
        $hash = password_hash($newPass, PASSWORD_BCRYPT);
        $db->prepare("UPDATE utilisateurs SET mot_de_passe=? WHERE id=?")
           ->execute([$hash, $row['user_id']]);

        // Marquer le token comme utilisé
        $db->prepare("UPDATE reset_tokens SET used=1 WHERE id=?")
           ->execute([$row['rt_id']]);

        // Supprimer tous les autres tokens de cet utilisateur
        $db->prepare("DELETE FROM reset_tokens WHERE user_id=?")
           ->execute([$row['user_id']]);

        addLog($db, 'ok', "MDP réinitialisé: {$row['login']}", $row['user_id']);

        jsOk(['message' => "Mot de passe modifié avec succès pour {$row['prenom']}. Vous pouvez vous connecter."]);
    }

    // ══════════════════════════════════════════
    //  STATS
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
    //  LIST
    // ══════════════════════════════════════════
    elseif ($action === 'list') {
        requireAuth(['admin']);
        $role = isset($_GET['role']) ? trim((string)$_GET['role']) : '';
        $q    = isset($_GET['q'])    ? trim((string)$_GET['q'])    : '';
        $sql  = "SELECT id,prenom,nom,login,role,zone,telephone,statut,date_creation FROM utilisateurs";
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
    //  CREATE
    // ══════════════════════════════════════════
    elseif ($action === 'create' && $method === 'POST') {
        $auth   = requireAuth(['admin']);
        $b      = getBody();
        $prenom = trim((string)($b['prenom']        ?? ''));
        $nom    = trim((string)($b['nom']            ?? ''));
        $login  = trim((string)($b['login']          ?? ''));
        $pass   = (string)($b['mot_de_passe']        ?? '');
        $role   = in_array($b['role'] ?? '', ['Admin','Agriculteur','Technicien']) ? $b['role'] : 'Agriculteur';
        $zone   = trim((string)($b['zone']           ?? ''));
        $tel    = trim((string)($b['telephone']      ?? ''));
        $statut = in_array($b['statut'] ?? '', ['Actif','Inactif','Suspendu']) ? $b['statut'] : 'Actif';
        if ($prenom === '')        jsErr('Prénom obligatoire.');
        if ($login  === '')        jsErr('Identifiant obligatoire.');
        if ($pass   === '')        jsErr('Mot de passe obligatoire.');
        if (strlen($pass) < 6)    jsErr('Mot de passe trop court (min 6 caractères).');
        if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $login)) jsErr("Identifiant invalide (lettres, chiffres, tirets, points).");
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
    //  UPDATE
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
        $role   = in_array($b['role'] ?? '', ['Admin','Agriculteur','Technicien']) ? $b['role'] : null;
        $statut = in_array($b['statut'] ?? '', ['Actif','Inactif','Suspendu'])     ? $b['statut'] : null;
        if ($prenom === '') jsErr('Prénom obligatoire.');
        if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $login)) jsErr("Identifiant invalide.");
        if (strtolower($login) !== strtolower($ex['login'])) {
            $dup = $db->prepare("SELECT id FROM utilisateurs WHERE LOWER(login)=? AND id!=?");
            $dup->execute([strtolower($login), $id]);
            if ($dup->fetch()) jsErr('Cet identifiant existe déjà.');
        }
        $f = ['prenom=?','nom=?','login=?','zone=?','telephone=?'];
        $p = [$prenom, $nom, $login, $zone, $tel];
        if ($role)   { $f[] = 'role=?';   $p[] = $role; }
        if ($statut) { $f[] = 'statut=?'; $p[] = $statut; }
        $np = (string)($b['mot_de_passe'] ?? '');
        if ($np !== '' && strlen($np) >= 6) { $f[] = 'mot_de_passe=?'; $p[] = password_hash($np, PASSWORD_BCRYPT); }
        elseif ($np !== '' && strlen($np) < 6) jsErr('Mot de passe trop court (min 6 caractères).');
        $p[] = $id;
        $db->prepare("UPDATE utilisateurs SET " . implode(',', $f) . " WHERE id=?")->execute($p);
        addLog($db, 'ok', "Modifié: $prenom $nom (ID:$id) par {$auth['login']}", $auth['id']);
        jsOk(['message' => "$prenom $nom mis à jour."]);
    }

    // ══════════════════════════════════════════
    //  DELETE
    // ══════════════════════════════════════════
    elseif ($action === 'delete' && $id > 0) {
        $auth = requireAuth(['admin']);
        $s = $db->prepare("SELECT id,prenom,nom,login FROM utilisateurs WHERE id=?");
        $s->execute([$id]);
        $u = $s->fetch();
        if (!$u) jsErr('Introuvable.', 404);
        if ($u['login'] === 'admin') jsErr('Impossible de supprimer le compte admin principal.');
        if ($u['id'] == $auth['id']) jsErr('Vous ne pouvez pas supprimer votre propre compte.');
        $db->prepare("DELETE FROM utilisateurs WHERE id=?")->execute([$id]);
        addLog($db, 'warn', "Supprimé: {$u['prenom']} {$u['nom']} ({$u['login']}) par {$auth['login']}", $auth['id']);
        jsOk(['message' => "Compte {$u['prenom']} {$u['nom']} supprimé."]);
    }

    // ══════════════════════════════════════════
    //  JOURNAL
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
    //  CHECK SESSION
    // ══════════════════════════════════════════
    elseif ($action === 'check_session') {
        jsOk(!empty($_SESSION['user_id'])
            ? ['authenticated' => true, 'role' => $_SESSION['user_role']]
            : ['authenticated' => false]);
    }

    else {
        jsErr('Action inconnue: ' . htmlspecialchars($action), 404);
    }

} catch (PDOException $e) {
    jsErr('Erreur base de données.', 500);
} catch (Exception $e) {
    jsErr('Erreur serveur.', 500);
}
