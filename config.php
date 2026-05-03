<?php
// ============================================================
//  config.php — AgriSmart SÉCURISÉ
//  ⚠️ Remplace l'ancien config.php
// ============================================================

// ── Démarrer la session sécurisée ──────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 3600,          // Expire après 1h d'inactivité
        'path'     => '/',
        'secure'   => FALSE,        // FALSE en local (HTTP) — TRUE en production (HTTPS)
        'httponly' => true,
        'samesite' => 'Lax',        // Lax permet les requêtes locales
    ]);
    session_start();
}

// ── Base de données ─────────────────────────────────────────
define('DB_HOST',    'localhost');
define('DB_NAME',    'agrismart');
define('DB_USER',    'root');
define('DB_PASS',    '');
define('DB_CHARSET', 'utf8mb4');

// ── En-têtes HTTP ───────────────────────────────────────────
// CORS restreint : remplacer '*' par votre domaine réel en production
$allowed_origin = 'http://localhost';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === $allowed_origin) {
    header("Access-Control-Allow-Origin: $allowed_origin");
    header('Access-Control-Allow-Credentials: true');
} else {
    // En local : accepter les requêtes sans origine (fichier ouvert directement)
    if (empty($origin)) {
        header("Access-Control-Allow-Origin: http://localhost");
    }
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Connexion BDD ───────────────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
            DB_USER, DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false, // Vraies requêtes préparées
            ]
        );
    } catch (PDOException $e) {
        http_response_code(500);
        // Ne pas exposer le message d'erreur réel en production
        die(json_encode(['success' => false, 'message' => 'Erreur de connexion à la base de données.']));
    }
    return $pdo;
}

// ── Helpers JSON ────────────────────────────────────────────
function ok(array $data = [], int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => true] + $data, JSON_UNESCAPED_UNICODE);
    exit;
}
function err(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}
function body(): array {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

// ── Vérification de session ─────────────────────────────────
/**
 * Vérifie que l'utilisateur est connecté.
 * Appeler en tête de chaque endpoint protégé.
 * @param array $roles_autorises  ex: ['admin', 'technicien']
 *                                Tableau vide = tout rôle connecté est accepté
 */
function requireAuth(array $roles_autorises = []): array {
    if (empty($_SESSION['user_id'])) {
        err('Non authentifié. Veuillez vous connecter.', 401);
    }

    // Vérification d'expiration de session (sécurité supplémentaire)
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > 3600) {
        session_unset();
        session_destroy();
        err('Session expirée. Veuillez vous reconnecter.', 401);
    }
    $_SESSION['last_activity'] = time();

    // Vérification du rôle si nécessaire
    if (!empty($roles_autorises) && !in_array($_SESSION['user_role'], $roles_autorises)) {
        err('Accès refusé : droits insuffisants.', 403);
    }

    return [
        'id'    => $_SESSION['user_id'],
        'login' => $_SESSION['user_login'],
        'role'  => $_SESSION['user_role'],
    ];
}

// ── Rate Limiting simple (anti brute-force) ─────────────────
/**
 * Limite les tentatives de connexion par IP.
 * Utilise la session côté PHP (simple, sans Redis).
 */
function checkRateLimit(string $key, int $max = 5, int $window = 300): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rl_key = 'rl_' . md5($key . $ip);

    if (!isset($_SESSION[$rl_key])) {
        $_SESSION[$rl_key] = ['count' => 0, 'start' => time()];
    }

    $data = &$_SESSION[$rl_key];

    // Réinitialiser si la fenêtre est dépassée
    if ((time() - $data['start']) > $window) {
        $data = ['count' => 0, 'start' => time()];
    }

    $data['count']++;

    if ($data['count'] > $max) {
        $wait = $window - (time() - $data['start']);
        err("Trop de tentatives. Réessayez dans {$wait} secondes.", 429);
    }
}

// ── Validation et nettoyage des entrées ─────────────────────
function sanitizeString(string $val, int $maxLen = 255): string {
    return mb_substr(trim(strip_tags($val)), 0, $maxLen);
}
